"""Supabase-backed monitoring metrics for the Monitoring dashboard (backend-only).

این فایل کاملاً جدید و مستقل است — هیچ فایل موجودی (chat_store.py, dashboard_store.py,
chats.py, ...) تغییر نمی‌کند. فقط توابع مشترک (_headers, _base_url, ChatStoreError) و
helper های ساخت باکت چارت (که قبلاً در dashboard_store.py نوشته شده‌اند) import می‌شوند
تا یک منبع واحد از تنظیمات/خطا/منطق باکت‌بندی وجود داشته باشد و چیزی تکراری نوشته نشود.

منبع دیتا: جدول `traces`. هر ردیف traces معادل زمان‌بندی کامل یک اجرای گراف LangGraph
است (retriever + validator + generator + web_search + other) که از قبل، بدون هیچ
تغییری، در انتهای chat_endpoint (در chats.py) ذخیره می‌شود. جمع این پنج فیلد دقیقاً
همان "Response Time" یک درخواست است.

RBAC: چون ستون user_id در جدول traces هرگز توسط save_workflow_trace پر نمی‌شود
(همیشه NULL است)، از همان الگوی موجود در dashboard_store.py استفاده می‌کنیم: ابتدا
chat_id های کاربر را از جدول chats می‌گیریم، سپس traces را با chat_id in (...) فیلتر
می‌کنیم. کاربر ادمین بدون فیلتر، همه‌ی traces سیستم را می‌بیند.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings
from app.chat_store import ChatStoreError, _base_url, _headers
from app.dashboard_store import (
    _format_chart_label,
    _floor_to_hour,
    _month_start,
    _build_hour_buckets,
    _build_day_buckets,
    _build_month_buckets,
)

logger = logging.getLogger(__name__)

_VALID_TIMEFRAMES = {"today", "week", "month", "all"}

# پنج فیلدی که مجموعشان زمان کل پردازش یک درخواست را می‌سازد
_TRACE_TIME_FIELDS = (
    "retriever_time_ms",
    "validator_time_ms",
    "generator_time_ms",
    "web_search_time_ms",
    "other_time_ms",
)


def _empty_response_time_metrics(timeframe: str, now: datetime) -> dict[str, Any]:
    """اسکلت خالی چارت (همه صفر) وقتی هیچ trace‌ای پیدا نشد، با شکل صحیح برای هر timeframe."""
    if timeframe == "today":
        start = now - timedelta(hours=24)
        buckets = [{"label": b.strftime("%H:%M"), "value": 0.0} for b in _build_hour_buckets(start, now)]
    elif timeframe == "month":
        start_date = now.date() - timedelta(days=30)
        buckets = [{"label": _format_chart_label(b), "value": 0.0} for b in _build_day_buckets(start_date, now.date())]
    elif timeframe == "all":
        buckets = [{"label": now.strftime("%b"), "value": 0.0}]
    else:  # week
        start_date = now.date() - timedelta(days=6)
        buckets = [{"label": _format_chart_label(b), "value": 0.0} for b in _build_day_buckets(start_date, now.date())]

    return {"avg_response_time_s": 0.0, "percentage_change": 0.0, "trend": "down", "chart_data": buckets}


def get_response_time_metrics(
    user_id: str,
    is_admin: bool = False,
    timeframe: str = "week",
) -> dict[str, Any]:
    """میانگین زمان پاسخ (ثانیه) برای KPI و چارت Response Time، بر اساس جدول traces."""
    if timeframe not in _VALID_TIMEFRAMES:
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
    fetch_start = now - (period * 2) if period else None  # هم بازه‌ی فعلی هم بازه‌ی مقایسه

    logger.info(
        "Fetching response-time metrics for user_id=%s, is_admin=%s, timeframe=%s",
        user_id, is_admin, timeframe,
    )

    try:
        with httpx.Client(timeout=15.0) as client:
            traces_url = f"{_base_url()}/rest/v1/traces"
            select_fields = "created_at," + ",".join(_TRACE_TIME_FIELDS)
            base_params: dict[str, str] = {"select": select_fields}
            if fetch_start is not None:
                base_params["created_at"] = f"gte.{fetch_start.isoformat()}"

            # ---------- همون الگوی RBAC که در dashboard_store.py هست ----------
            if is_admin:
                traces_res = client.get(traces_url, headers=headers, params=base_params)
            else:
                chats_res = client.get(
                    f"{_base_url()}/rest/v1/chats",
                    headers=headers,
                    params={"user_id": f"eq.{user_id}", "select": "id"},
                )
                if chats_res.status_code >= 400:
                    logger.error("Failed to fetch user chats for response-time metrics: %s", chats_res.text)
                    raise ChatStoreError(chats_res.text)

                chat_ids = [c["id"] for c in chats_res.json()]
                if not chat_ids:
                    logger.info("No chats found for user %s; returning empty response-time metrics", user_id)
                    return _empty_response_time_metrics(timeframe, now)

                ids_str = ",".join(chat_ids)
                traces_res = client.get(
                    traces_url,
                    headers=headers,
                    params={**base_params, "chat_id": f"in.({ids_str})"},
                )

            if traces_res.status_code >= 400:
                logger.error("Failed to fetch traces for response-time metrics: %s", traces_res.text)
                raise ChatStoreError(traces_res.text)

            rows: list[tuple[datetime, float]] = []
            for t in traces_res.json():
                raw = t.get("created_at")
                if not raw:
                    continue
                total_ms = sum(int(t.get(f) or 0) for f in _TRACE_TIME_FIELDS)
                ts = datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
                rows.append((ts, total_ms / 1000.0))  # ms -> s

            if not rows:
                return _empty_response_time_metrics(timeframe, now)

            # ---------- ساخت باکت‌های چارت (میانگین هر باکت) ----------
            if granularity == "hour":
                assert current_start is not None
                buckets = _build_hour_buckets(current_start, now)
                grouped: dict[datetime, list[float]] = {}
                for ts, secs in rows:
                    if ts >= current_start:
                        key = _floor_to_hour(ts)
                        grouped.setdefault(key, []).append(secs)
                chart_data = [
                    {"label": b.strftime("%H:%M"), "value": round(sum(v) / len(v), 2) if (v := grouped.get(b)) else 0.0}
                    for b in buckets
                ]

            elif granularity == "day":
                assert current_start is not None
                buckets_d = _build_day_buckets(current_start.date(), now.date())
                grouped_d: dict[date, list[float]] = {}
                for ts, secs in rows:
                    if ts >= current_start:
                        key = ts.date()
                        grouped_d.setdefault(key, []).append(secs)
                chart_data = [
                    {"label": _format_chart_label(b), "value": round(sum(v) / len(v), 2) if (v := grouped_d.get(b)) else 0.0}
                    for b in buckets_d
                ]

            else:  # month
                start_date = _month_start(min((ts.date() for ts, _ in rows), default=now.date()))
                buckets_m = _build_month_buckets(start_date, now.date())
                grouped_m: dict[date, list[float]] = {}
                for ts, secs in rows:
                    key = _month_start(ts.date())
                    grouped_m.setdefault(key, []).append(secs)
                chart_data = [
                    {"label": b.strftime("%b"), "value": round(sum(v) / len(v), 2) if (v := grouped_m.get(b)) else 0.0}
                    for b in buckets_m
                ]

            # ---------- avg فعلی/قبلی + percentage_change ----------
            if granularity == "month":
                this_month = _month_start(now.date())
                last_month = (
                    date(this_month.year - 1, 12, 1)
                    if this_month.month == 1
                    else date(this_month.year, this_month.month - 1, 1)
                )
                current_vals = [s for ts, s in rows if _month_start(ts.date()) == this_month]
                previous_vals = [s for ts, s in rows if _month_start(ts.date()) == last_month]
            else:
                assert current_start is not None and fetch_start is not None
                current_vals = [s for ts, s in rows if ts >= current_start]
                previous_vals = [s for ts, s in rows if fetch_start <= ts < current_start]

            avg_current = round(sum(current_vals) / len(current_vals), 2) if current_vals else 0.0
            avg_previous = round(sum(previous_vals) / len(previous_vals), 2) if previous_vals else 0.0

            if avg_previous > 0:
                percentage_change = round(((avg_current - avg_previous) / avg_previous) * 100, 1)
            else:
                # بدون داده‌ی مقایسه‌ای معتبر از دوره‌ی قبل، ادعای درصد نمی‌کنیم
                percentage_change = 0.0

            # برای latency برخلاف questions_metrics، پایین‌تر = بهتر
            trend = "down" if avg_current <= avg_previous else "up"

            logger.info(
                "Response-time metrics (%s) for user %s: current=%.2fs, previous=%.2fs, change=%.1f%%, trend=%s",
                timeframe, user_id, avg_current, avg_previous, percentage_change, trend,
            )

            return {
                "avg_response_time_s": avg_current,
                "percentage_change": percentage_change,
                "trend": trend,
                "chart_data": chart_data,
            }

    except ChatStoreError:
        raise
    except Exception as exc:
        logger.error("Error in get_response_time_metrics for user %s: %s", user_id, str(exc))
        raise ChatStoreError(str(exc)) from exc
