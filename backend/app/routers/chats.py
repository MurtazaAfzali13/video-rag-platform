import asyncio
import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

from app.graph.workflow import get_agent_graph, get_run_kwargs
from app.graph.checkpointing import build_run_config
from app.chat_store import (
    ChatStoreError,
    get_chat,
    init_chat,
    list_chats,
    list_messages,
    list_recent_messages,
    save_message,
    update_chat_title,
    update_chat_video_id,
    get_user_message_count,
)
from app.dashboard_store import save_workflow_trace


from app.auth import get_current_user, get_current_user_with_role, AuthenticatedUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chat"])

# --- Chat history budget (context-window management) ---
# History is only used by `contextualize_node` (query rewriting), but we still bound it
# so a huge message can never inflate the prompt / cost of that call.
CHAT_HISTORY_TURNS = 4            # 4 turns (user + assistant) = up to 8 messages
HISTORY_MSG_MAX_CHARS = 800       # per-message cap inside the history
HISTORY_TOTAL_MAX_CHARS = 4000    # hard cap for the whole history
MAX_QUERY_CHARS = 4000            # cap for the user's own question


# --- Pydantic Schemas ---

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=MAX_QUERY_CHARS, description="The user's question")
    chat_id: str = Field(..., min_length=1, description="Mandatory existing or new chat session UUID from client")
    video_id: Optional[str] = Field(
        None, description="YouTube video ID for video-scoped RAG (null = multi-video search)"
    )
    search_scope: Optional[str] = Field(
        None,
        description="Explicit UI override: 'single_video' or 'general'. "
                     "If omitted, scope is derived from video_id (legacy behavior).",
    )


class UpdateChatRequest(BaseModel):
    video_id: Optional[str] = Field(None, description="YouTube video ID to bind to this chat")


class ChatResponse(BaseModel):
    response: str
    chat_id: str


class ChatSummary(BaseModel):
    id: str
    user_id: str
    title: str
    video_id: Optional[str] = None
    created_at: str


class ChatDetail(ChatSummary):
    timeline_items: list[dict] = Field(default_factory=list)
    transcript_lines: list[dict] = Field(default_factory=list)


class MessageRecord(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    created_at: str


# --- Helpers ---

def _extract_display_text(raw_content: str) -> str:
 
    try:
        parsed = json.loads(raw_content)
    except (json.JSONDecodeError, TypeError):
        return raw_content

    if not isinstance(parsed, dict):
        return raw_content

    if parsed.get("type") == "qa_response":
        return parsed.get("answer", raw_content)
    if parsed.get("type") == "video_summary":
        return parsed.get("overall_summary", raw_content)
    return raw_content


def _build_chat_history(messages: list[dict], *, max_turns: int = CHAT_HISTORY_TURNS) -> list[BaseMessage]:
    """Build a bounded history for the contextualize chain.

    - Window: the last `max_turns` turns (1 turn = user + assistant = 2 messages).
    - Each message is truncated to HISTORY_MSG_MAX_CHARS; the whole history is capped by
      HISTORY_TOTAL_MAX_CHARS. We walk newest -> oldest so the OLDEST messages are dropped first.
    - Assistant messages are stored as JSON; only the human-readable text is kept (no sources).
    - The result always starts with a user message (some providers reject a leading AI message,
      which can happen if a previous run failed and left an unanswered user message).
    """
    if not messages:
        return []

    window = messages[-(max_turns * 2):]
    history: list[BaseMessage] = []
    budget = HISTORY_TOTAL_MAX_CHARS

    for m in reversed(window):
        role = m.get("role")
        if role not in ("user", "assistant"):
            continue

        text = m.get("content") or ""
        if role == "assistant":
            text = _extract_display_text(text)
        text = text.strip()
        if not text:
            continue
        if len(text) > HISTORY_MSG_MAX_CHARS:
            text = text[:HISTORY_MSG_MAX_CHARS] + "…"

        if len(text) > budget:
            break  # stop here: never leave a gap in the middle of the conversation
        budget -= len(text)

        history.append(HumanMessage(content=text) if role == "user" else AIMessage(content=text))

    history.reverse()  # back to chronological order

    while history and isinstance(history[0], AIMessage):
        history.pop(0)
    return history


def _resolve_search_scope(request: "ChatRequest") -> tuple[str, Optional[str]]:
    if request.search_scope in ("single_video", "general"):
        search_scope = request.search_scope
    else:
        search_scope = "single_video" if request.video_id else "general"

    effective_video_id = request.video_id if search_scope == "single_video" else None
    return search_scope, effective_video_id


async def _run_pipeline(
    request: ChatRequest,
    user_id: str,
) -> tuple[str, dict]:
    target_chat_id = request.chat_id

    existing = await asyncio.to_thread(get_chat, target_chat_id, user_id)
    if not existing:
        await asyncio.to_thread(init_chat, user_id, target_chat_id, "New Chat")


    # Only the newest N messages are needed (DB-side ORDER BY created_at DESC LIMIT N).
    # An empty result still means "first interaction".
    existing_messages = await asyncio.to_thread(
        list_recent_messages, target_chat_id, limit=CHAT_HISTORY_TURNS * 2
    )
    is_first_interaction = len(existing_messages) == 0
    chat_history = _build_chat_history(existing_messages)

    await asyncio.to_thread(
        save_message,
        chat_id=target_chat_id,
        role="user",
        content=request.query,
    )

    search_scope, effective_video_id = _resolve_search_scope(request)

    initial_state = {
        "messages": [HumanMessage(content=request.query)],
        "query": request.query,
        "standalone_query": None,
        "chat_history": chat_history,
        "user_id": user_id,
        "video_id": effective_video_id,
        "search_scope": search_scope,
        "next_node": None,
        "documents": None,
        "retrieved_video_ids": None,
        "response": None,
        "retriever_time_ms": 0,
        "reranker_time_ms": 0,
        "validator_time_ms": 0,
        "generator_time_ms": 0,
        "web_search_time_ms": 0,
        "other_time_ms": 0,
    }

    return target_chat_id, {"initial_state": initial_state, "is_first_interaction": is_first_interaction}


async def _persist_result(target_chat_id: str, user_id: str, request: ChatRequest, result: dict, is_first_interaction: bool) -> None:
    workflow_type = "qa"
    search_scope, _effective_video_id = _resolve_search_scope(request)
    if result.get("next_node") == "video_summary" or search_scope == "video_summary":
        workflow_type = "video_summary"
    elif search_scope == "general":
        workflow_type = "general"

    await asyncio.to_thread(
        save_workflow_trace,
        chat_id=target_chat_id,
        workflow=workflow_type,
        retriever_time_ms=int(result.get("retriever_time_ms") or 0),
        validator_time_ms=int(result.get("validator_time_ms") or 0),
        generator_time_ms=int(result.get("generator_time_ms") or 0),
        web_search_time_ms=int(result.get("web_search_time_ms") or 0),
        other_time_ms=int(result.get("other_time_ms") or 0),
        success=bool(result.get("response")),
    )

    if is_first_interaction:
        clean_text = request.query.strip()
        new_title = clean_text[:35]
        if len(clean_text) > 35:
            new_title += "..."
        await asyncio.to_thread(update_chat_title, target_chat_id, user_id, new_title)

    await asyncio.to_thread(
        save_message,
        chat_id=target_chat_id,
        role="assistant",
        content=result["response"],
    )


# --- Endpoints ---

@router.get("/chats", response_model=list[ChatSummary])
async def get_user_chats(
    user_id: str = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
) -> list[ChatSummary]:
    try:
        chats = await asyncio.to_thread(list_chats, user_id, limit=limit)
        return [ChatSummary(**chat) for chat in chats]
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/chats/{chat_id}", response_model=ChatDetail)
async def get_chat_metadata(
    chat_id: str,
    user_id: str = Depends(get_current_user),
) -> ChatDetail:
    try:
        chat = await asyncio.to_thread(get_chat, chat_id, user_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found.")
        return ChatDetail(**chat)
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/chats/{chat_id}", response_model=ChatDetail)
async def update_chat_metadata(
    chat_id: str,
    request: UpdateChatRequest,
    user_id: str = Depends(get_current_user),
) -> ChatDetail:
    try:
        existing = await asyncio.to_thread(get_chat, chat_id, user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Chat not found.")

        if request.video_id is not None:
            await asyncio.to_thread(update_chat_video_id, chat_id, user_id, request.video_id)

        updated = await asyncio.to_thread(get_chat, chat_id, user_id)
        if not updated:
            raise HTTPException(status_code=404, detail="Chat not found.")
        return ChatDetail(**updated)
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/chats/{chat_id}/messages", response_model=list[MessageRecord])
async def get_chat_messages(
    chat_id: str,
    limit: int = Query(200, ge=1, le=500),
    user_id: str = Depends(get_current_user),
) -> list[MessageRecord]:
    try:
        chat = await asyncio.to_thread(get_chat, chat_id, user_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found.")

        messages = await asyncio.to_thread(list_messages, chat_id, limit=limit)
        return [MessageRecord(**message) for message in messages]
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
) -> ChatResponse:
    user_id = auth.user_id
    try:
        if not auth.is_admin:
            message_count = await asyncio.to_thread(get_user_message_count, user_id)
            if message_count >= 2:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "شما به سقف مجاز پیام در پلن رایگان (۲ پیام) رسیده‌اید. "
                        "برای ادامه‌ی گفتگو، لطفاً حساب خود را ارتقا دهید."
                    ),
                )

        target_chat_id, ctx = await _run_pipeline(request, user_id)
        initial_state = ctx["initial_state"]
        is_first_interaction = ctx["is_first_interaction"]

        run_id = uuid.uuid4().hex
        run_config = build_run_config(chat_id=target_chat_id, run_id=run_id, user_id=user_id)
        logger.info("Run %s started (chat=%s)", run_id, target_chat_id)

        result = await get_agent_graph().ainvoke(initial_state, run_config, **get_run_kwargs())

        logger.info("=== LANGGRAPH FINAL OUTPUT STATE ===")
        logger.info(f"Next Node: {result.get('next_node')}")
        logger.info(f"Standalone Query: {result.get('standalone_query')}")
        logger.info(f"Retrieved Video IDs: {result.get('retrieved_video_ids')}")
        logger.info(f"Retriever Time: {result.get('retriever_time_ms')} ms")
        logger.info(f"Reranker Time: {result.get('reranker_time_ms')} ms")
        logger.info(f"Validator Time: {result.get('validator_time_ms')} ms")
        logger.info(f"Generator Time: {result.get('generator_time_ms')} ms")
        logger.info(f"Web Search Time: {result.get('web_search_time_ms')} ms")
        logger.info("====================================")

        if not result or "response" not in result or not result["response"]:
            raise HTTPException(status_code=500, detail="پاسخی از مدل دریافت نشد.")

        await _persist_result(target_chat_id, user_id, request, result, is_first_interaction)

        return ChatResponse(response=result["response"], chat_id=target_chat_id)

    except HTTPException:
        raise
    except ChatStoreError as exc:
        logger.exception("Chat persistence error for user %s", user_id)
        raise HTTPException(status_code=503, detail=f"خطا در ذخیره‌سازی پیام: {str(exc)}") from exc
    except Exception as exc:
        logger.exception("Error occurred during LangGraph workflow execution for user %s", user_id)
        raise HTTPException(status_code=500, detail=f"خطای سرور در جریان هوش مصنوعی: {str(exc)}") from exc




NODE_LABELS_FA = {
    "contextualize": "در حال بازخوانی مکالمه…",
    "supervisor": "در حال تحلیل درخواست…",
    "retriever": "در حال جست‌وجو در ترنسکریپت…",
    "reranker": "در حال رتبه‌بندی نتایج…",
    "validator": "در حال بررسی کفایت اطلاعات…",
    "web_search": "در حال جست‌وجوی وب…",
    "generator": "در حال تولید پاسخ…",
    "video_summary": "در حال تهیه خلاصه…",
}


@router.post("/chat/stream")
async def chat_stream_endpoint(
    request: ChatRequest,
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
):
    user_id = auth.user_id

    if not auth.is_admin:
        message_count = await asyncio.to_thread(get_user_message_count, user_id)
        if message_count >= 2:
            raise HTTPException(status_code=403, detail="پیام رایگان شما تمام شده است.")

    target_chat_id, ctx = await _run_pipeline(request, user_id)
    initial_state = ctx["initial_state"]
    is_first_interaction = ctx["is_first_interaction"]

    run_id = uuid.uuid4().hex
    run_config = build_run_config(chat_id=target_chat_id, run_id=run_id, user_id=user_id)

    async def event_generator():
        graph = get_agent_graph()
        final_result: dict = {}
        logger.info("Run %s started (chat=%s, stream)", run_id, target_chat_id)

        def sse(event: str, data: dict) -> str:
            return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

        try:
            async for event in graph.astream_events(
                initial_state, run_config, version="v2", **get_run_kwargs()
            ):
                kind = event.get("event")

                if kind == "on_chain_start" and event.get("name") in NODE_LABELS_FA:
                    node_name = event["name"]
                    yield sse("progress", {"node": node_name, "label": NODE_LABELS_FA[node_name]})

                elif kind == "on_chain_end" and event.get("name") == "LangGraph":
                    final_result = event["data"].get("output", {}) or {}

            if not final_result.get("response"):
                yield sse("error", {"detail": "پاسخی از مدل دریافت نشد."})
                return

            await _persist_result(target_chat_id, user_id, request, final_result, is_first_interaction)

            yield sse(
                "final",
                {"response": final_result["response"], "chat_id": target_chat_id},
            )

        except Exception as exc:
            logger.exception("SSE stream failed for chat %s (run %s)", target_chat_id, run_id)
            yield sse("error", {"detail": str(exc), "run_id": run_id})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  
            "Connection": "keep-alive",
        },
    )
