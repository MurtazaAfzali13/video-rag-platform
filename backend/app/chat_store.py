"""Supabase-backed chat persistence (backend-only)."""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class ChatStoreError(Exception):
    """Raised when Supabase chat operations fail."""


def _headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _base_url() -> str:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ChatStoreError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    return settings.supabase_url.rstrip("/")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_video_exists(video_id: str, user_id: str) -> None:
    """
    بررسی می‌کند که آیا ویدیو در جدول videos وجود دارد یا خیر.
    اگر وجود نداشت، یک رکورد اولیه موقت می‌سازد تا محدودیت Foreign Key نقض نشود.
    """
    url = f"{_base_url()}/rest/v1/videos"
    headers = _headers(get_settings().supabase_service_role_key)
    
    with httpx.Client(timeout=10.0) as client:
        # ۱. بررسی وجود ویدیو با استفاده از نام صحیح ستون کلید اصلی یعنی id
        check_res = client.get(url, headers=headers, params={"id": f"eq.{video_id}", "select": "id"})
        if check_res.status_code == 200 and check_res.json():
            return  # ویدیو وجود دارد، نیازی به کار اضافه نیست
            
        # ۲. ایجاد رکورد موقت با رعایت ستون‌های اجباری id و user_id
        logger.warning("Video %s not found in 'videos' table. Creating a placeholder to prevent FK error.", video_id)
        placeholder = {
            "id": video_id,
            "user_id": user_id,
            "title": "Processing Video...",
            "created_at": _now_iso()
        }
        upsert_res = client.post(url, headers=headers, json=placeholder)
        if upsert_res.status_code >= 400:
            logger.error("Failed to ensure/create video placeholder: %s", upsert_res.text)
            raise ChatStoreError(f"امکان ثبت ویدیو در دیتابیس وجود ندارد: {upsert_res.text}")


def _exact_count(table: str, params: dict[str, str]) -> int:
    """Get an exact row count for a filtered Supabase table WITHOUT fetching the rows."""
    headers = _headers(get_settings().supabase_service_role_key)
    headers["Prefer"] = "count=exact"

    with httpx.Client(timeout=15.0) as client:
        response = client.head(f"{_base_url()}/rest/v1/{table}", headers=headers, params=params)

    if response.status_code >= 400:
        logger.error("Failed to count rows in %s: %s %s", table, response.status_code, response.text)
        raise ChatStoreError(f"Failed to count rows in {table}: HTTP {response.status_code}")

    content_range = response.headers.get("Content-Range", "")
    if "/" in content_range:
        total_str = content_range.rsplit("/", 1)[-1]
        if total_str.isdigit():
            return int(total_str)

    return 0


def get_user_video_count(user_id: str) -> int:
    """Count how many distinct videos this user has processed."""
    return _exact_count(
        "chats",
        {"user_id": f"eq.{user_id}", "video_id": "not.is.null"},
    )


def get_user_message_count(user_id: str) -> int:
    """Count how many user-authored chat messages (questions) this user has ever sent."""
    chat_ids = [chat["id"] for chat in list_chats(user_id, limit=1000)]
    if not chat_ids:
        return 0

    ids_str = ",".join(chat_ids)
    return _exact_count(
        "messages",
        {"chat_id": f"in.({ids_str})", "role": "eq.user"},
    )


def create_chat(
    *,
    user_id: str,
    title: str,
    video_id: Optional[str] = None,
) -> dict[str, Any]:
    chat_id = str(uuid.uuid4())
    
    if video_id:
        _ensure_video_exists(video_id, user_id)

    payload = {
        "id": chat_id,
        "user_id": user_id,
        "title": title[:120] or "New Chat",
        "video_id": video_id,
        "created_at": _now_iso(),
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{_base_url()}/rest/v1/chats",
            headers=_headers(get_settings().supabase_service_role_key),
            json=payload,
        )

    if response.status_code >= 400:
        logger.error("Failed to create chat: %s", response.text)
        raise ChatStoreError(response.text)

    rows = response.json()
    return rows[0] if isinstance(rows, list) and rows else payload


def get_chat(chat_id: str, user_id: str) -> Optional[dict[str, Any]]:
    """Get a single chat by ID and user_id."""
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{_base_url()}/rest/v1/chats",
            headers=_headers(get_settings().supabase_service_role_key),
            params={
                "id": f"eq.{chat_id}",
                "user_id": f"eq.{user_id}",
                "select": "*",
                "limit": "1",
            },
        )

    if response.status_code >= 400:
        raise ChatStoreError(response.text)

    rows = response.json()
    return rows[0] if rows else None


def list_chats(user_id: str, *, limit: int = 50) -> list[dict[str, Any]]:
    """List all chats for a user."""
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{_base_url()}/rest/v1/chats",
            headers=_headers(get_settings().supabase_service_role_key),
            params={
                "user_id": f"eq.{user_id}",
                "select": "*",
                "order": "created_at.desc",
                "limit": str(limit),
            },
        )

    if response.status_code >= 400:
        raise ChatStoreError(response.text)

    return response.json()


def save_message(
    *,
    chat_id: str,
    role: str,
    content: str,
) -> dict[str, Any]:
    """Save a message to a chat."""
    payload = {
        "id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "role": role,
        "content": content,
        "created_at": _now_iso(),
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{_base_url()}/rest/v1/messages",
            headers=_headers(get_settings().supabase_service_role_key),
            json=payload,
        )

    if response.status_code >= 400:
        logger.error("Failed to save message: %s", response.text)
        raise ChatStoreError(response.text)

    rows = response.json()
    return rows[0] if isinstance(rows, list) and rows else payload


def list_messages(chat_id: str, *, limit: int = 200) -> list[dict[str, Any]]:
    """List all messages for a chat."""
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{_base_url()}/rest/v1/messages",
            headers=_headers(get_settings().supabase_service_role_key),
            params={
                "chat_id": f"eq.{chat_id}",
                "select": "*",
                "order": "created_at.asc",
                "limit": str(limit),
            },
        )

    if response.status_code >= 400:
        raise ChatStoreError(response.text)

    return response.json()


def derive_chat_title(query: str) -> str:
    """Derive a chat title from the first user query."""
    cleaned = " ".join(query.strip().split())
    if len(cleaned) <= 60:
        return cleaned or "New Chat"
    return f"{cleaned[:57]}..."


def init_chat(user_id: str, chat_id: Optional[str] = None, title: str = "New Chat") -> dict[str, Any]:
    target_id = chat_id if chat_id else str(uuid.uuid4())
    
    existing = get_chat(target_id, user_id)
    if existing:
        return existing
    
    payload = {
        "id": target_id,
        "user_id": user_id,
        "title": title[:120] or "New Chat",
        "video_id": None,
        "created_at": _now_iso(),
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{_base_url()}/rest/v1/chats",
            headers=_headers(get_settings().supabase_service_role_key),
            json=payload,
        )

    if response.status_code >= 400:
        if response.status_code == 409:
            return get_chat(target_id, user_id) or payload
        logger.error("Failed to init chat: %s", response.text)
        raise ChatStoreError(response.text)

    rows = response.json()
    return rows[0] if isinstance(rows, list) and rows else payload


def update_chat_video_id(chat_id: str, user_id: str, video_id: str) -> dict[str, Any]:
    """Update the video_id associated with a chat."""
    _ensure_video_exists(video_id, user_id)

    with httpx.Client(timeout=30.0) as client:
        response = client.patch(
            f"{_base_url()}/rest/v1/chats",
            headers=_headers(get_settings().supabase_service_role_key),
            params={
                "id": f"eq.{chat_id}",
                "user_id": f"eq.{user_id}",
            },
            json={"video_id": video_id},
        )

    if response.status_code >= 400:
        logger.error("Failed to update chat video_id: %s", response.text)
        raise ChatStoreError(response.text)

    rows = response.json()
    return rows[0] if isinstance(rows, list) and rows else {"id": chat_id, "video_id": video_id}


def update_chat_timeline(
    chat_id: str,
    user_id: str,
    *,
    timeline_items: Optional[list[dict[str, Any]]] = None,
    transcript_lines: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    """Persist the LLM-generated timeline/transcript for a chat."""
    payload: dict[str, Any] = {}
    if timeline_items is not None:
        payload["timeline_items"] = timeline_items
    if transcript_lines is not None:
        payload["transcript_lines"] = transcript_lines

    if not payload:
        return {"id": chat_id}

    with httpx.Client(timeout=30.0) as client:
        response = client.patch(
            f"{_base_url()}/rest/v1/chats",
            headers=_headers(get_settings().supabase_service_role_key),
            params={
                "id": f"eq.{chat_id}",
                "user_id": f"eq.{user_id}",
            },
            json=payload,
        )

    if response.status_code >= 400:
        logger.error("Failed to persist chat timeline for chat %s: %s", chat_id, response.text)
        return {"id": chat_id, **payload}

    rows = response.json()
    return rows[0] if isinstance(rows, list) and rows else {"id": chat_id, **payload}


def update_chat_title(chat_id: str, user_id: str, title: str) -> dict[str, Any]:
    """Update the title of a chat."""
    with httpx.Client(timeout=30.0) as client:
        response = client.patch(
            f"{_base_url()}/rest/v1/chats",
            headers=_headers(get_settings().supabase_service_role_key),
            params={
                "id": f"eq.{chat_id}",
                "user_id": f"eq.{user_id}",
            },
            json={"title": title[:120] or "New Chat"},
        )

    if response.status_code >= 400:
        logger.error("Failed to update chat title: %s", response.text)
        raise ChatStoreError(response.text)

    rows = response.json()
    return rows[0] if isinstance(rows, list) and rows else {"id": chat_id, "title": title}


def get_user_workflow_distribution(user_id: str, is_admin: bool = False) -> list[dict[str, Any]]:
    """Fetch aggregated LangGraph node execution stats via Supabase RPC."""
    url = f"{_base_url()}/rest/v1/rpc/get_workflow_distribution"
    headers = _headers(get_settings().supabase_service_role_key)
    payload_user_id = None if is_admin else user_id
    with httpx.Client(timeout=15.0) as client:
        response = client.post(url, headers=headers, json={"p_user_id": payload_user_id})
        
    if response.status_code >= 400:
        logger.error("Failed to fetch dashboard workflow metrics: %s", response.text)
        raise ChatStoreError(response.text)
        
    return response.json()


def save_workflow_trace(
    chat_id: str, 
    workflow: str, 
    retriever_time_ms: int = 0, 
    generator_time_ms: int = 0, 
    validator_time_ms: int = 0, 
    web_search_time_ms: int = 0,  
    other_time_ms: int = 0,     
    success: bool = True
) -> None:
    """Saves the execution trace of LangGraph nodes into the Supabase 'traces' table."""
    url = f"{_base_url()}/rest/v1/traces"
    headers = _headers(get_settings().supabase_service_role_key)
    
    payload = {
        "id": str(uuid.uuid4()),  
        "chat_id": chat_id,
        "workflow": workflow, 
        "retriever_time_ms": retriever_time_ms,
        "generator_time_ms": generator_time_ms,
        "validator_time_ms": validator_time_ms,
        "web_search_time_ms": web_search_time_ms,
        "other_time_ms": other_time_ms,
        "success": success,
        "created_at": _now_iso()
    }
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, headers=headers, json=payload)
            
            if response.status_code >= 400:
                logger.error(f"❌ ارور از سمت دیتابیس در ثبت Trace: {response.text}")
                
            response.raise_for_status()
            logger.info(f"✅ زمان‌بندی گراف برای چت {chat_id} با موفقیت ذخیره شد.")
            
    except Exception as exc:
        logger.error(f"❌ خطا در اجرای تابع save_workflow_trace: {str(exc)}")


def get_user_metrics(user_id: str, is_admin: bool = False) -> dict:
    """Fetch general dashboard metrics (e.g., total web searches) for a user or admin."""
    headers = _headers(get_settings().supabase_service_role_key)
    
    try:
        with httpx.Client(timeout=15.0) as client:
            traces_url = f"{_base_url()}/rest/v1/traces"
            
            if is_admin:
                # 🛡️ مسیر ادمین: دریافت کل جستجوهای وب در سیستم (بدون فیلتر روی چت خاص)
                traces_res = client.get(
                    traces_url,
                    headers=headers,
                    params={
                        "web_search_time_ms": "gt.0", 
                        "select": "id"  
                    }
                )
            else:
                # 👤 مسیر کاربر معمولی: ابتدا یافتن چت‌های کاربر، سپس فیلتر کردن
                chats_url = f"{_base_url()}/rest/v1/chats"
                chats_res = client.get(
                    chats_url, 
                    headers=headers, 
                    params={"user_id": f"eq.{user_id}", "select": "id"}
                )
                
                if chats_res.status_code >= 400:
                    logger.error("Failed to fetch user chats for metrics: %s", chats_res.text)
                    raise ChatStoreError(chats_res.text)
                
                chat_ids = [c["id"] for c in chats_res.json()]
                
                if not chat_ids:
                    return {"web_searches": 0}
                
                ids_str = ",".join(chat_ids)  
                traces_res = client.get(
                    traces_url,
                    headers=headers,
                    params={
                        "chat_id": f"in.({ids_str})",
                        "web_search_time_ms": "gt.0", 
                        "select": "id"  
                    }
                )
            
            if traces_res.status_code >= 400:
                logger.error("Failed to fetch traces for metrics: %s", traces_res.text)
                raise ChatStoreError(traces_res.text)
                
            web_searches_count = len(traces_res.json())
            
            return {
                "web_searches": web_searches_count
            }
            
    except Exception as exc:
        logger.error("Error in get_user_metrics: %s", str(exc))
        raise ChatStoreError(str(exc))


def _format_chart_label(day: date) -> str:
    """Format a date as a chart label (e.g. 'Dec 21')."""
    return f"{day.strftime('%b')} {day.day}"


def _empty_questions_metrics(today: date) -> dict[str, Any]:
    """Return zeroed questions metrics with a 7-day chart skeleton."""
    chart_start = today - timedelta(days=6)
    return {
        "total_today": 0,
        "percentage_change": 0.0,
        "trend": "up",
        "chart_data": [
            {"label": _format_chart_label(chart_start + timedelta(days=i)), "value": 0}
            for i in range(7)
        ],
    }


def get_user_questions_metrics(user_id: str, is_admin: bool = False) -> dict[str, Any]:
    """Fetch question counts (user-role messages) for dashboard KPI and chart."""
    headers = _headers(get_settings().supabase_service_role_key)
    now = datetime.now(timezone.utc)
    today = now.date()
    yesterday = today - timedelta(days=1)
    chart_start = today - timedelta(days=6)

    logger.info("Fetching questions metrics for user_id=%s, is_admin=%s", user_id, is_admin)

    try:
        with httpx.Client(timeout=15.0) as client:
            range_start = datetime.combine(chart_start, datetime.min.time(), tzinfo=timezone.utc)
            messages_url = f"{_base_url()}/rest/v1/messages"

            if is_admin:
                # 🛡️ مسیر ادمین: دریافت تمام پیام‌های سیستم که مربوط به کاربران است (در ۷ روز گذشته)
                messages_res = client.get(
                    messages_url,
                    headers=headers,
                    params={
                        "role": "eq.user",
                        "created_at": f"gte.{range_start.isoformat()}",
                        "select": "created_at",
                    },
                )
            else:
                # 👤 مسیر کاربر معمولی: ابتدا چت‌هایش را پیدا می‌کنیم، بعد سوالات را استخراج می‌کنیم
                chats_res = client.get(
                    f"{_base_url()}/rest/v1/chats",
                    headers=headers,
                    params={"user_id": f"eq.{user_id}", "select": "id"},
                )

                if chats_res.status_code >= 400:
                    logger.error("Failed to fetch user chats for questions metrics: %s", chats_res.text)
                    raise ChatStoreError(chats_res.text)

                chat_ids = [chat["id"] for chat in chats_res.json()]
                if not chat_ids:
                    logger.info("No chats found for user %s; returning empty questions metrics", user_id)
                    return _empty_questions_metrics(today)

                ids_str = ",".join(chat_ids)
                messages_res = client.get(
                    messages_url,
                    headers=headers,
                    params={
                        "chat_id": f"in.({ids_str})",
                        "role": "eq.user",
                        "created_at": f"gte.{range_start.isoformat()}",
                        "select": "created_at",
                    },
                )

            if messages_res.status_code >= 400:
                logger.error("Failed to fetch user messages for questions metrics: %s", messages_res.text)
                raise ChatStoreError(messages_res.text)

            # --- پردازش دیتا برای نمودار و آمار دقیقاً مانند قبل است ---
            counts_by_date: dict[date, int] = {}
            for message in messages_res.json():
                created_at_raw = message.get("created_at")
                if not created_at_raw:
                    continue
                created_at = datetime.fromisoformat(created_at_raw.replace("Z", "+00:00"))
                message_date = created_at.astimezone(timezone.utc).date()
                counts_by_date[message_date] = counts_by_date.get(message_date, 0) + 1

            today_count = counts_by_date.get(today, 0)
            yesterday_count = counts_by_date.get(yesterday, 0)

            if yesterday_count > 0:
                percentage_change = round(
                    ((today_count - yesterday_count) / yesterday_count) * 100,
                    1,
                )
            else:
                percentage_change = 100.0 if today_count > 0 else 0.0

            trend = "up" if today_count >= yesterday_count else "down"
            chart_data = [
                {
                    "label": _format_chart_label(chart_start + timedelta(days=i)),
                    "value": counts_by_date.get(chart_start + timedelta(days=i), 0),
                }
                for i in range(7)
            ]

            logger.info(
                "Questions metrics for user %s: today=%d, yesterday=%d, change=%.1f%%, trend=%s",
                user_id,
                today_count,
                yesterday_count,
                percentage_change,
                trend,
            )

            return {
                "total_today": today_count,
                "percentage_change": percentage_change,
                "trend": trend,
                "chart_data": chart_data,
            }

    except ChatStoreError:
        raise
    except Exception as exc:
        logger.error("Error in get_user_questions_metrics for user %s: %s", user_id, str(exc))
        raise ChatStoreError(str(exc)) from exc