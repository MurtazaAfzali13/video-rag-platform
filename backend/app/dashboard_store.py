"""Supabase-backed dashboard metrics/analytics (backend-only).

این فایل از chat_store.py جدا شده: هر چیزی که مربوط به داشبورد (توزیع
گره‌های LangGraph، متریک‌های کلی، و متریک سوالات) است اینجاست. توابع
مشترک (_headers, _base_url, _now_iso) و ChatStoreError همچنان در
chat_store.py تعریف شده‌اند و اینجا import می‌شوند تا یک منبع واحد از
تنظیمات/خطا وجود داشته باشد.
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings
from app.chat_store import ChatStoreError, _base_url, _headers, _now_iso

logger = logging.getLogger(__name__)

_VALID_TIMEFRAMES = {"today", "week", "month", "all"}


def get_user_workflow_distribution(
    user_id: str,
    is_admin: bool = False,
    timeframe: str = "all",
) -> list[dict[str, Any]]:
    """Fetch aggregated LangGraph node execution stats via Supabase RPC."""
    if timeframe not in _VALID_TIMEFRAMES:
        timeframe = "all"

    url = f"{_base_url()}/rest/v1/rpc/get_workflow_distribution"
    headers = _headers(get_settings().supabase_service_role_key)
    payload_user_id = None if is_admin else user_id

    with httpx.Client(timeout=15.0) as client:
        response = client.post(
            url,
            headers=headers,
            json={"p_user_id": payload_user_id, "p_timeframe": timeframe},
        )

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



_VALID_QUESTIONS_TIMEFRAMES = {"today", "week", "month", "all"}


def _floor_to_hour(dt: datetime) -> datetime:
    return dt.replace(minute=0, second=0, microsecond=0)


def _month_start(d: date) -> date:
    return date(d.year, d.month, 1)


def _add_month(d: date) -> date:
    return date(d.year + 1, 1, 1) if d.month == 12 else date(d.year, d.month + 1, 1)


def _build_hour_buckets(start: datetime, end: datetime) -> list[datetime]:
    cursor, end_h, buckets = _floor_to_hour(start), _floor_to_hour(end), []
    while cursor <= end_h:
        buckets.append(cursor)
        cursor += timedelta(hours=1)
    return buckets


def _build_day_buckets(start: date, end: date) -> list[date]:
    cursor, buckets = start, []
    while cursor <= end:
        buckets.append(cursor)
        cursor += timedelta(days=1)
    return buckets


def _build_month_buckets(start: date, end: date) -> list[date]:
    cursor, end_m, buckets = _month_start(start), _month_start(end), []
    while cursor <= end_m:
        buckets.append(cursor)
        cursor = _add_month(cursor)
    return buckets


def _empty_questions_metrics(timeframe: str, now: datetime) -> dict[str, Any]:
    """Return zeroed questions metrics with a correctly-shaped chart skeleton per timeframe."""
    if timeframe == "today":
        start = now - timedelta(hours=24)
        buckets = [{"label": b.strftime("%H:%M"), "value": 0} for b in _build_hour_buckets(start, now)]
    elif timeframe == "month":
        start_date = now.date() - timedelta(days=30)
        buckets = [{"label": _format_chart_label(b), "value": 0} for b in _build_day_buckets(start_date, now.date())]
    elif timeframe == "all":
        buckets = [{"label": now.strftime("%b"), "value": 0}]
    else:  # week
        start_date = now.date() - timedelta(days=6)
        buckets = [{"label": _format_chart_label(b), "value": 0} for b in _build_day_buckets(start_date, now.date())]

    return {"total_today": 0, "percentage_change": 0.0, "trend": "up", "chart_data": buckets}


def get_user_questions_metrics(
    user_id: str,
    is_admin: bool = False,
    timeframe: str = "week",
) -> dict[str, Any]:
    """Fetch question counts (user-role messages), bucketed and compared per the requested timeframe."""
    if timeframe not in _VALID_QUESTIONS_TIMEFRAMES:
        timeframe = "week"

    headers = _headers(get_settings().supabase_service_role_key)
    now = datetime.now(timezone.utc)

    if timeframe == "today":
        period, granularity = timedelta(hours=24), "hour"
    elif timeframe == "week":
        period, granularity = timedelta(days=7), "day"
    elif timeframe == "month":
        period, granularity = timedelta(days=30), "day"
    else:  # all
        period, granularity = None, "month"

    current_start = now - period if period else None
    fetch_start = now - (period * 2) if period else None  # هم بازه‌ی فعلی هم بازه‌ی مقایسه رو پوشش می‌ده

    logger.info(
        "Fetching questions metrics for user_id=%s, is_admin=%s, timeframe=%s",
        user_id, is_admin, timeframe,
    )

    try:
        with httpx.Client(timeout=15.0) as client:
            messages_url = f"{_base_url()}/rest/v1/messages"
            base_params: dict[str, str] = {"role": "eq.user", "select": "created_at"}
            if fetch_start is not None:
                base_params["created_at"] = f"gte.{fetch_start.isoformat()}"

            # ---------- همون منطق RBAC قبلی، دست‌نخورده ----------
            if is_admin:
                messages_res = client.get(messages_url, headers=headers, params=base_params)
            else:
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
                    return _empty_questions_metrics(timeframe, now)

                ids_str = ",".join(chat_ids)
                messages_res = client.get(
                    messages_url,
                    headers=headers,
                    params={**base_params, "chat_id": f"in.({ids_str})"},
                )

            if messages_res.status_code >= 400:
                logger.error("Failed to fetch user messages for questions metrics: %s", messages_res.text)
                raise ChatStoreError(messages_res.text)

            timestamps: list[datetime] = []
            for message in messages_res.json():
                raw = message.get("created_at")
                if not raw:
                    continue
                timestamps.append(
                    datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
                )

            # ---------- ساخت باکت‌های چارت ----------
            if granularity == "hour":
                assert current_start is not None  # 🔑 برای Mypy: توی این شاخه period همیشه مقدار داره
                buckets = _build_hour_buckets(current_start, now)
                counts: dict[datetime, int] = {}
                for ts in timestamps:
                    if ts >= current_start:
                        key = _floor_to_hour(ts)
                        counts[key] = counts.get(key, 0) + 1
                chart_data = [{"label": b.strftime("%H:%M"), "value": counts.get(b, 0)} for b in buckets]

            elif granularity == "day":
                assert current_start is not None  # 🔑 برای Mypy: توی این شاخه period همیشه مقدار داره
                buckets_d = _build_day_buckets(current_start.date(), now.date())
                counts_d: dict[date, int] = {}
                for ts in timestamps:
                    if ts >= current_start:
                        key = ts.date()
                        counts_d[key] = counts_d.get(key, 0) + 1
                chart_data = [{"label": _format_chart_label(b), "value": counts_d.get(b, 0)} for b in buckets_d]

            else:  # month
                start_date = _month_start(min((ts.date() for ts in timestamps), default=now.date()))
                buckets_m = _build_month_buckets(start_date, now.date())
                counts_m: dict[date, int] = {}
                for ts in timestamps:
                    key = _month_start(ts.date())
                    counts_m[key] = counts_m.get(key, 0) + 1
                chart_data = [{"label": b.strftime("%b"), "value": counts_m.get(b, 0)} for b in buckets_m]

            # ---------- percentage_change / trend ----------
            if granularity == "month":
                this_month = _month_start(now.date())
                last_month = (
                    date(this_month.year - 1, 12, 1)
                    if this_month.month == 1
                    else date(this_month.year, this_month.month - 1, 1)
                )
                total_current = sum(1 for ts in timestamps if _month_start(ts.date()) == this_month)
                total_previous = sum(1 for ts in timestamps if _month_start(ts.date()) == last_month)
            else:
                assert current_start is not None and fetch_start is not None  # 🔑 برای Mypy
                total_current = sum(1 for ts in timestamps if ts >= current_start)
                total_previous = sum(1 for ts in timestamps if fetch_start <= ts < current_start)

            if total_previous > 0:
                percentage_change = round(((total_current - total_previous) / total_previous) * 100, 1)
            else:
                percentage_change = 100.0 if total_current > 0 else 0.0

            trend = "up" if total_current >= total_previous else "down"

            logger.info(
                "Questions metrics (%s) for user %s: current=%d, previous=%d, change=%.1f%%, trend=%s",
                timeframe, user_id, total_current, total_previous, percentage_change, trend,
            )

            return {
                "total_today": total_current,  # نام فیلد برای سازگاری با اسکیمای فعلی حفظ شده
                "percentage_change": percentage_change,
                "trend": trend,
                "chart_data": chart_data,
            }

    except ChatStoreError:
        raise
    except Exception as exc:
        logger.error("Error in get_user_questions_metrics for user %s: %s", user_id, str(exc))
        raise ChatStoreError(str(exc)) from exc
