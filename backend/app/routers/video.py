import asyncio
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from youtube_transcript_api._errors import YouTubeTranscriptApiException

from app.config import get_settings
from app.ingestion import (
    process_and_ingest_video,
    format_segments_for_llm,
    format_ts,
    transcript_hash,
)
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
from app.video_registry import (
    VideoRegistryError,
    claim_video,
    get_video,
    is_ready,
    link_user_video,
    mark_video_failed,
    mark_video_ready,
    user_has_video,
    wait_until_ready,
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
    cached: bool = False  # True = video was already indexed (cache hit / waited for another request)


async def _ingest_new_video(video_id: str, user_id: str, settings) -> Dict[str, Any]:
    """The expensive path (cache MISS): title -> transcript -> embeddings -> chapters."""
    video_title = await fetch_video_title(video_id)

    proxies = None
    if getattr(settings, "proxy_url", None):
        proxies = {"http": settings.proxy_url, "https": settings.proxy_url}

    if proxies:
        transcript = await asyncio.to_thread(fetch_transcript, video_id, proxies=proxies)
    else:
        transcript = await asyncio.to_thread(fetch_transcript, video_id)

    chunks_processed = await asyncio.to_thread(
        process_and_ingest_video,
        transcript,
        video_id,
        user_id,
        video_title,
    )
    if chunks_processed == 0:
        # Never cache an empty index: mark_video_failed is triggered by the caller.
        raise HTTPException(status_code=422, detail="زیرنویس این ویدیو قابل پردازش نیست.")

    formatted_transcript: List[Dict[str, Any]] = [
        {"time": format_ts(line.get("start", 0)), "text": line.get("text", "")}
        for line in (transcript or [])
    ]

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

    return {
        "title": video_title,
        "chunk_count": chunks_processed,
        "content_hash": transcript_hash(transcript),
        "timeline_items": timeline_items,
        "transcript_lines": formatted_transcript,
    }


async def _get_or_build_video(video_id: str, user_id: str, settings) -> tuple[str, Dict[str, Any]]:
    """Dedup + cache + single-flight.

    Returns (outcome, video) where outcome is:
      'hit'  -> video was already indexed: nothing was embedded or generated
      'miss' -> this request indexed the video
      'wait' -> another request was indexing it; we waited and reused its result
    """
    verdict = await asyncio.to_thread(claim_video, video_id, user_id)

    if verdict == "ready":
        video = await asyncio.to_thread(get_video, video_id)
        if is_ready(video):
            logger.info("cache HIT video=%s user=%s", video_id, user_id)
            return "hit", video
        verdict = "busy"  # row changed between the two calls: fall back to waiting

    if verdict == "claimed":
        logger.info("cache MISS video=%s user=%s -> indexing", video_id, user_id)
        try:
            built = await _ingest_new_video(video_id, user_id, settings)
            await asyncio.to_thread(mark_video_ready, video_id, **built)
        except BaseException:  # includes client-disconnect cancellation
            await asyncio.shield(asyncio.to_thread(mark_video_failed, video_id))
            raise
        return "miss", {"id": video_id, **built}

    logger.info("single-flight WAIT video=%s user=%s", video_id, user_id)
    video = await wait_until_ready(video_id)
    if video is None:
        raise HTTPException(
            status_code=503,
            detail="پردازش این ویدیو هنوز تمام نشده است؛ کمی بعد دوباره تلاش کنید.",
        )
    return "wait", video


@router.post("/process-video", response_model=ProcessVideoResponse)
async def process_video(
    request: VideoRequest,
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
) -> ProcessVideoResponse:
    user_id = auth.user_id
    settings = get_settings()

    video_id = extract_video_id(request.video_url)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="لینک یوتیوب نامعتبر است.",
        )

    try:
        # Quota applies only to videos that are NEW for this user (re-linking is free).
        if not auth.is_admin:
            already_linked = await asyncio.to_thread(user_has_video, user_id, video_id)
            if not already_linked:
                video_count = await asyncio.to_thread(get_user_video_count, user_id)
                if video_count >= 1:
                    raise HTTPException(
                        status_code=403,
                        detail=(
                            "شما به سقف مجاز پردازش ویدیو در پلن رایگان (۱ ویدیو) رسیده‌اید. "
                            "برای پردازش ویدیوهای بیشتر، لطفاً حساب خود را ارتقا دهید."),
                    )

        outcome, video = await _get_or_build_video(video_id, user_id, settings)

        # Link this user to the (shared) indexed video: this is what grants access.
        await asyncio.to_thread(link_user_video, user_id, video_id)

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

        timeline_items: List[Dict[str, Any]] = video.get("timeline_items") or []
        transcript_lines: List[Dict[str, Any]] = video.get("transcript_lines") or []

        try:
            await asyncio.to_thread(
                update_chat_timeline,
                target_chat_id,
                user_id,
                timeline_items=timeline_items,
                transcript_lines=transcript_lines,
            )
        except Exception as exc:
            logger.warning("Failed to persist timeline for chat %s: %s", target_chat_id, exc)

        try:
            invalidate_user_video_cache(user_id)
        except Exception as exc:
            logger.warning("Failed to invalidate video cache for user %s: %s", user_id, exc)

    except HTTPException:
        raise
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
    except VideoRegistryError as exc:
        logger.error(f"Video registry error for video {video_id}: {exc}")
        raise HTTPException(status_code=503, detail="خطا در ارتباط با پایگاه‌داده ویدیو. لطفاً دوباره تلاش کنید.") from exc
    except Exception as exc:
        logger.exception("Failed to process video %s", video_id)
        raise HTTPException(status_code=500, detail=f"خطای سرور: {str(exc)}") from exc

    cached = outcome != "miss"
    return ProcessVideoResponse(
        status="success",
        video_id=video_id,
        chat_id=target_chat_id,
        chunks_processed=int(video.get("chunk_count") or 0),
        message=(
            "این ویدیو قبلاً پردازش شده بود و بدون هزینه اضافی به چت شما متصل شد."
            if cached
            else "ویدیو با موفقیت پردازش و به چت متصل شد."
        ),
        title=video.get("title"),
        timeline_items=timeline_items,
        transcript_lines=transcript_lines,
        cached=cached,
    )
