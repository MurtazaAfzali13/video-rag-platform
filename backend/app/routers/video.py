import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from youtube_transcript_api._errors import YouTubeTranscriptApiException

from app.config import get_settings
from app.ingestion import process_and_ingest_video
from app.youtube_client import (
    extract_video_id,
    fetch_transcript,
    is_invalid_video_id,
    is_transcript_blocked,
    is_transcript_not_found,
)
from app.chat_store import (
    ChatStoreError,
    get_chat,
    init_chat,
    update_chat_video_id,
)

logger = logging.getLogger(__name__)

# ساخت Router اختصاصی برای ویدیوها
router = APIRouter(prefix="/api", tags=["Video"])


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


# --- Endpoints ---

@router.post("/process-video", response_model=ProcessVideoResponse)
async def process_video(request: VideoRequest) -> ProcessVideoResponse:
    settings = get_settings()
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
            await asyncio.to_thread(init_chat, request.user_id, target_chat_id, "New Chat")

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