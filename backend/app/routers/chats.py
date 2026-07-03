import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage

from app.graph.workflow import get_agent_graph
from app.chat_store import (
    ChatStoreError,
    get_chat,
    init_chat,
    list_chats,
    list_messages,
    save_message,
    update_chat_title,
    update_chat_video_id,
)

logger = logging.getLogger(__name__)

# ساخت Router اختصاصی برای چت‌ها
router = APIRouter(prefix="/api", tags=["Chat"])


# --- Pydantic Schemas ---

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="The user's question")
    user_id: str = Field(..., min_length=1, description="User namespace in Pinecone")
    chat_id: str = Field(..., min_length=1, description="Mandatory existing or new chat session UUID from client")
    video_id: Optional[str] = Field(
        None, description="YouTube video ID for video-scoped RAG (null = multi-video search)"
    )


class UpdateChatRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
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


class MessageRecord(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    created_at: str


# --- Endpoints ---

@router.get("/chats", response_model=list[ChatSummary])
async def get_user_chats(
    user_id: str = Query(..., min_length=1),
    limit: int = Query(50, ge=1, le=100),
) -> list[ChatSummary]:
    try:
        chats = await asyncio.to_thread(list_chats, user_id, limit=limit)
        return [ChatSummary(**chat) for chat in chats]
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/chats/{chat_id}", response_model=ChatSummary)
async def get_chat_metadata(
    chat_id: str,
    user_id: str = Query(..., min_length=1),
) -> ChatSummary:
    try:
        chat = await asyncio.to_thread(get_chat, chat_id, user_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found.")
        return ChatSummary(**chat)
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/chats/{chat_id}", response_model=ChatSummary)
async def update_chat_metadata(
    chat_id: str,
    request: UpdateChatRequest,
) -> ChatSummary:
    try:
        existing = await asyncio.to_thread(get_chat, chat_id, request.user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Chat not found.")

        if request.video_id is not None:
            await asyncio.to_thread(
                update_chat_video_id,
                chat_id,
                request.user_id,
                request.video_id,
            )

        updated = await asyncio.to_thread(get_chat, chat_id, request.user_id)
        if not updated:
            raise HTTPException(status_code=404, detail="Chat not found.")
        return ChatSummary(**updated)
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/chats/{chat_id}/messages", response_model=list[MessageRecord])
async def get_chat_messages(
    chat_id: str,
    user_id: str = Query(..., min_length=1),
    limit: int = Query(200, ge=1, le=500),
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
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    try:
        target_chat_id = request.chat_id
        
        existing = await asyncio.to_thread(get_chat, target_chat_id, request.user_id)
        if not existing:
            await asyncio.to_thread(init_chat, request.user_id, target_chat_id, "New Chat")

        existing_messages = await asyncio.to_thread(list_messages, target_chat_id, limit=1)
        is_first_interaction = len(existing_messages) == 0

        await asyncio.to_thread(
            save_message,
            chat_id=target_chat_id,
            role="user",
            content=request.query,
        )

        search_scope = "single_video" if request.video_id else "general"

        initial_state = {
            "messages": [HumanMessage(content=request.query)],
            "query": request.query,
            "user_id": request.user_id,
            "video_id": request.video_id,
            "search_scope": search_scope,
            "response": None,
        }

        result = await get_agent_graph().ainvoke(initial_state)

        if not result or "response" not in result or not result["response"]:
            raise HTTPException(status_code=500, detail="پاسخی از مدل دریافت نشد.")

        assistant_response = result["response"]

        if is_first_interaction:
            try:
                parsed_response = json.loads(assistant_response)
                if isinstance(parsed_response, dict) and "title" in parsed_response:
                    clean_text = str(parsed_response["title"])
                else:
                    clean_text = assistant_response
            except Exception:
                clean_text = assistant_response

            clean_text = clean_text.strip()
            
            new_title = clean_text[:30]
            if len(clean_text) > 30:
                new_title += "..."
                
            await asyncio.to_thread(
                update_chat_title,
                target_chat_id,
                request.user_id,
                new_title,
            )

        await asyncio.to_thread(
            save_message,
            chat_id=target_chat_id,
            role="assistant",
            content=assistant_response,
        )

        return ChatResponse(response=assistant_response, chat_id=target_chat_id)

    except HTTPException:
        raise
    except ChatStoreError as exc:
        logger.exception("Chat persistence error for user %s", request.user_id)
        raise HTTPException(status_code=503, detail=f"خطا در ذخیره‌سازی پیام: {str(exc)}") from exc
    except Exception as exc:
        logger.exception(
            "Error occurred during LangGraph workflow execution for user %s",
            request.user_id,
        )
        raise HTTPException(
            status_code=500,
            detail=f"خطای سرور در جریان هوش مصنوعی: {str(exc)}",
        ) from exc