import asyncio
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from youtube_transcript_api._errors import YouTubeTranscriptApiException

from app.config import get_settings
from app.ingestion import process_and_ingest_video, format_segments_for_llm
from app.youtube_client import (
    extract_video_id,
    fetch_transcript,
    is_invalid_video_id,
    is_transcript_blocked,
    is_transcript_not_found,
    fetch_video_title,  
)
from app.chat_store import (
    ChatStoreError,
    get_chat,
    init_chat,
    update_chat_video_id,
    update_chat_timeline,
    get_user_video_count,
)
from app.graph.chains import create_chapters_chain
from app.graph.state import VideoChaptersSchema
from app.auth import get_current_user_with_role, AuthenticatedUser
from app.routers.video_route import invalidate_user_video_cache
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Video"])


class VideoRequest(BaseModel):
    video_url: str = Field(..., min_length=1, description="Full YouTube watch or share URL")
    chat_id: str = Field(..., min_length=1, description="Mandatory client-generated UUID for the session")


class ProcessVideoResponse(BaseModel):
    status: str
    video_id: str
    chat_id: str
    chunks_processed: int
    message: str
    title: Optional[str] = None
    timeline_items: Optional[List[Dict[str, Any]]] = None
    transcript_lines: Optional[List[Dict[str, Any]]] = None




@router.post("/process-video", response_model=ProcessVideoResponse)
async def process_video(
    request: VideoRequest,
   
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
) -> ProcessVideoResponse:
    user_id = auth.user_id
    settings = get_settings()

    if not auth.is_admin:
        video_count = await asyncio.to_thread(get_user_video_count, user_id)
        if video_count >= 1:
            raise HTTPException(
                status_code=403,
                detail=(
                    "شما به سقف مجاز پردازش ویدیو در پلن رایگان (۱ ویدیو) رسیده‌اید. "
                    "برای پردازش ویدیوهای بیشتر، لطفاً حساب خود را ارتقا دهید."),)

    video_id = extract_video_id(request.video_url)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="لینک یوتیوب نامعتبر است.", )

    try:
      
        video_title = await fetch_video_title(video_id)

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
            user_id,
            video_title, 
        )
        
        target_chat_id = request.chat_id
        existing_chat = await asyncio.to_thread(get_chat, target_chat_id, user_id)
        
        if not existing_chat:
            await asyncio.to_thread(init_chat, user_id, target_chat_id, "New Chat")

        await asyncio.to_thread(
            update_chat_video_id,
            target_chat_id,
            user_id,
            video_id,
        )

        def format_time(seconds: float) -> str:
            mins = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{mins:02d}:{secs:02d}"

        formatted_transcript = []
        if transcript:
            for line in transcript:
                formatted_transcript.append({
                    "time": format_time(line.get("start", 0)),
                    "text": line.get("text", "")
                })

        timeline_items: List[Dict[str, Any]] = []
        try:
            segments_text = format_segments_for_llm(transcript)
            if segments_text.strip():
                chapters_chain = create_chapters_chain()
                chapters_result: VideoChaptersSchema = await asyncio.to_thread(
                    chapters_chain.invoke, {"context": segments_text}
                )
                for i, chapter in enumerate(chapters_result.chapters):
                    timeline_items.append({
                        "id": f"{video_id}-chapter-{i}",
                        "time": chapter.time,
                        "title": chapter.title,
                        "description": chapter.description,
                    })
        except Exception as exc:
            logger.warning("Chapter extraction failed for video %s: %s", video_id, exc)
            timeline_items = []

        try:
            await asyncio.to_thread(
                update_chat_timeline,
                target_chat_id,
                user_id,
                timeline_items=timeline_items,
                transcript_lines=formatted_transcript,
            )
        except Exception as exc:
            logger.warning("Failed to persist timeline for chat %s: %s", target_chat_id, exc)

       
        try:
            invalidate_user_video_cache(user_id)
        except Exception as exc:
            logger.warning("Failed to invalidate video cache for user %s: %s", user_id, exc)

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
        title=video_title, 
        timeline_items=timeline_items, 
        transcript_lines=formatted_transcript
    )