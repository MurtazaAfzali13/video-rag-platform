from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from youtube_transcript_api._errors import YouTubeTranscriptApiException
from langchain_core.messages import HumanMessage

from app.config import get_settings
from app.ingestion import process_and_ingest_video
from app.youtube_client import (
    extract_video_id,
    fetch_transcript,
    is_invalid_video_id,
    is_transcript_blocked,
    is_transcript_not_found,
)
from app.graph.workflow import get_agent_graph
from app.chat_store import (
    ChatStoreError,
    derive_chat_title,
    get_chat,
    init_chat,
    list_chats,
    list_messages,
    save_message,
    update_chat_title,
    update_chat_video_id,
)

logger = logging.getLogger(__name__)


# --- Pydantic Schemas ---

class VideoRequest(BaseModel):
    video_url: str = Field(..., min_length=1, description="Full YouTube watch or share URL")
    user_id: str = Field(..., min_length=1, description="User namespace in Pinecone")
    chat_id: str = Field(..., min_length=1, description="Mandatory client-generated UUID for the session")

class ProcessVideoResponse(BaseModel):
    status: str
    video_id: str
    chat_id: str
    chunks_processed: int
    message: str


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


class HealthResponse(BaseModel):
    status: str
    app: str


# --- Lifespan Configuration ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    try:
        settings.validate_for_ingestion()
    except ValueError as exc:
        logger.warning("Startup validation: %s", exc)
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description=(
            "Fetches YouTube captions, chunks them, stores vector embeddings "
            "in Pinecone, and routes contextual or general queries using LangGraph."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )

    # اصلاح باگ تنظیمات همزمان allow_origins="*" و allow_credentials=True
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # برای امنیت و جلوگیری از کرش کردن سیستم روی False تنظیم شد
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Endpoints ---

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", app=settings.app_name)

    @app.post("/api/process-video", response_model=ProcessVideoResponse)
    async def process_video(request: VideoRequest) -> ProcessVideoResponse:
        video_id = extract_video_id(request.video_url)
        if not video_id:
            raise HTTPException(
                status_code=400,
                detail="لینک یوتیوب نامعتبر است.",
            )

        try:
            my_proxies = None
            if hasattr(settings, 'proxy_url') and settings.proxy_url:
                my_proxies = {"http": settings.proxy_url, "https": settings.proxy_url}

            if my_proxies:
                transcript = await asyncio.to_thread(fetch_transcript, video_id, proxies=my_proxies)
            else:
                transcript = await asyncio.to_thread(fetch_transcript, video_id)
            
            chunks_processed = await asyncio.to_thread(
                process_and_ingest_video,
                transcript,
                video_id,
                request.user_id,
            )
            
            target_chat_id = request.chat_id
            existing_chat = await asyncio.to_thread(get_chat, target_chat_id, request.user_id)
            
            if not existing_chat:
                await asyncio.to_thread(init_chat, request.user_id, target_chat_id, "Video Chat")

            await asyncio.to_thread(
                update_chat_video_id,
                target_chat_id,
                request.user_id,
                video_id,
            )
            
        except YouTubeTranscriptApiException as exc:
            logger.error(f"Failed to fetch transcript for video {video_id}: {exc}")
            if is_transcript_blocked(exc):
                raise HTTPException(status_code=429, detail="آی‌پی سرور توسط یوتیوب مسدود شده است. لطفاً بعداً تلاش کنید.") from exc
            elif is_transcript_not_found(exc):
                raise HTTPException(status_code=404, detail="هیچ زیرنویسی (فارسی یا انگلیسی) برای این ویدیو یافت نشد.") from exc
            elif is_invalid_video_id(exc):
                raise HTTPException(status_code=400, detail="شناسه ویدیو نامعتبر است.") from exc
            else:
                raise HTTPException(status_code=400, detail="خطا در دریافت زیرنویس این ویدیو.") from exc

        except ChatStoreError as exc:
            logger.error(f"Chat store error for video {video_id}: {exc}")
            raise HTTPException(status_code=503, detail=f"خطا در ذخیره‌سازی چت: {str(exc)}") from exc
        except Exception as exc:
            logger.exception("Failed to process video %s", video_id)
            raise HTTPException(status_code=500, detail=f"خطای سرور: {str(exc)}") from exc

        return ProcessVideoResponse(
            status="success",
            video_id=video_id,
            chat_id=target_chat_id,
            chunks_processed=chunks_processed,
            message="ویدیو با موفقیت پردازش و به چت متصل شد.",
        )

    @app.get("/api/chats", response_model=list[ChatSummary])
    async def get_user_chats(
        user_id: str = Query(..., min_length=1),
        limit: int = Query(50, ge=1, le=100),
    ) -> list[ChatSummary]:
        try:
            chats = await asyncio.to_thread(list_chats, user_id, limit=limit)
            return [ChatSummary(**chat) for chat in chats]
        except ChatStoreError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @app.get("/api/chats/{chat_id}", response_model=ChatSummary)
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

    @app.patch("/api/chats/{chat_id}", response_model=ChatSummary)
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

    @app.get("/api/chats/{chat_id}/messages", response_model=list[MessageRecord])
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

    @app.post("/api/chat", response_model=ChatResponse)
    async def chat_endpoint(request: ChatRequest) -> ChatResponse:
        try:
            target_chat_id = request.chat_id
            
            existing = await asyncio.to_thread(get_chat, target_chat_id, request.user_id)
            
            if not existing:
                await asyncio.to_thread(init_chat, request.user_id, target_chat_id, "New Chat")
                chat_title = "New Chat"
            else:
                chat_title = existing.get("title", "New Chat")

            if chat_title == "New Chat":
                new_title = derive_chat_title(request.query)
                await asyncio.to_thread(
                    update_chat_title,
                    target_chat_id,
                    request.user_id,
                    new_title,
                )

            # ذخیره پیام کاربر در دیتابیس محلی
            await asyncio.to_thread(
                save_message,
                chat_id=target_chat_id,
                role="user",
                content=request.query,
            )

            # اصلاح ساختار: محاسبه و استخراج هوشمند فیلد search_scope بر اساس ساختار AgentState
            search_scope = "single_video" if request.video_id else "general"

            # آماده‌سازی دیتای ورودی (State اولیه گراف)
            initial_state = {
                "messages": [HumanMessage(content=request.query)],
                "query": request.query,
                "user_id": request.user_id,
                "video_id": request.video_id,
                "search_scope": search_scope,  # برای نود سوپروایزر و ریتریور الزامی است
                "response": None,
            }

            # اصلاح بهینه‌سازی: اجرای آسنکرون بومی گراف به جای جابجایی ترد با توابع همگام
            result = await get_agent_graph().ainvoke(initial_state)

            if not result or "response" not in result or not result["response"]:
                raise HTTPException(status_code=500, detail="پاسخی از مدل دریافت نشد.")

            assistant_response = result["response"]

            # ذخیره پاسخ مدل در دیتابیس محلی
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

    return app


app = create_app()