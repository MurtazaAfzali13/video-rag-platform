import asyncio
import logging
from typing import Optional, List, Dict, Any
# 🛡️ پوشش امنیتی: Depends اضافه شد تا تابع اعتبارسنجی را به عنوان پیش‌نیاز تعریف کنیم
from fastapi import APIRouter, HTTPException, Depends
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
    get_user_video_count,
)

# 🛡️ Auth + RBAC: dependency that returns both the verified user_id and their role
from app.auth import get_current_user_with_role, AuthenticatedUser

logger = logging.getLogger(__name__)

# ساخت Router اختصاصی برای ویدیوها
router = APIRouter(prefix="/api", tags=["Video"])


# --- Pydantic Schemas ---

class VideoRequest(BaseModel):
    video_url: str = Field(..., min_length=1, description="Full YouTube watch or share URL")
    # 🛡️ پوشش امنیتی: فیلد user_id به طور کامل از اینجا حذف شد تا کلاینت نتواند آن را جعل کند
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


# --- Endpoints ---

@router.post("/process-video", response_model=ProcessVideoResponse)
async def process_video(
    request: VideoRequest,
    # 🛡️ این خط باعث می‌شود FastAPI قبل از اجرای بدنه تابع، توکن را چک کند و هم user_id و
    # هم role را مستقیماً از JWT تایید‌شده استخراج کند — هیچ‌کدام هرگز از بدنه/URL درخواست
    # گرفته نمی‌شوند.
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
) -> ProcessVideoResponse:
    user_id = auth.user_id
    settings = get_settings()

    # --- 🚦 RBAC / Quota: کاربر Admin نامحدود است، کاربر Free حداکثر ۱ ویدیو ---
    # این چک عمداً همینجا، قبل از fetch ترنسکریپت/ingestion قرار گرفته تا اگر کاربر به سقف
    # رسیده، هیچ هزینه‌ای (فراخوانی یوتیوب، embedding، Pinecone) صرف نشود.
    if not auth.is_admin:
        video_count = await asyncio.to_thread(get_user_video_count, user_id)
        if video_count >= 1:
            raise HTTPException(
                status_code=403,
                detail=(
                    "شما به سقف مجاز پردازش ویدیو در پلن رایگان (۱ ویدیو) رسیده‌اید. "
                    "برای پردازش ویدیوهای بیشتر، لطفاً حساب خود را ارتقا دهید."
                ),
            )

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
            # 🛡️ پوشش امنیتی: به جای request.user_id، از متغیر امن user_id استفاده می‌کنیم
            user_id, 
        )
        
        target_chat_id = request.chat_id
        # 🛡️ پوشش امنیتی: جایگزینی request.user_id با user_id استخراج شده از توکن
        existing_chat = await asyncio.to_thread(get_chat, target_chat_id, user_id)
        
        if not existing_chat:
            # 🛡️ پوشش امنیتی: جایگزینی request.user_id با user_id
            await asyncio.to_thread(init_chat, user_id, target_chat_id, "New Chat")

        # 🛡️ پوشش امنیتی: جایگزینی request.user_id با user_id
        await asyncio.to_thread(
            update_chat_video_id,
            target_chat_id,
            user_id,
            video_id,
        )

        # --- پردازش دیتا برای فرانت‌اند ---
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

        # دیتای پیش‌فرض (mock) حذف شد تا در صورت نبود سرفصل، سیستم حالت خالی (Empty State) را نمایش دهد.
        
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
        title=f"YouTube Video — {video_id}",
        timeline_items=[],  # لیست خالی ارسال می‌شود تا اگر سرفصلی نبود، هیچ چیز پیش‌فرضی نشان ندهد
        transcript_lines=formatted_transcript
    )