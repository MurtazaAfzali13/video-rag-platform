from __future__ import annotations

import logging
from typing import Any, NamedTuple, Optional

import httpx

from app.config import get_settings
from app.graph.retry_utils import call_with_retry, HTTP_RETRYABLE_EXCEPTIONS

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=8.0, read=20.0, write=10.0, pool=5.0)


class VideoStoreError(Exception):
    """Raised when Supabase video RPC calls fail (HTTP error status OR network failure)."""


class VideoItem(NamedTuple):
    id: str
    youtube_id: str
    title: str
    created_at: str


class VideoPage(NamedTuple):
    videos: list[VideoItem]
    total_count: int


def _headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }


def _base_url() -> str:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise VideoStoreError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    return settings.supabase_url.rstrip("/")


def _request(client: httpx.Client, method: str, url: str, **kwargs: Any) -> httpx.Response:
   
    def _do_call() -> httpx.Response:
        return getattr(client, method)(url, **kwargs)

    try:
        return call_with_retry(
            _do_call,
            max_attempts=3,
            min_wait=1.0,
            max_wait=8.0,
            exceptions=HTTP_RETRYABLE_EXCEPTIONS,
        )
    except HTTP_RETRYABLE_EXCEPTIONS as exc:
        logger.error("Supabase %s %s failed after retries: %s", method.upper(), url, exc)
        raise VideoStoreError(
            "امکان برقراری ارتباط با پایگاه‌داده (Supabase) وجود ندارد. "
            "لطفاً اتصال اینترنت/VPN/فایروال را بررسی کنید و دوباره تلاش کنید. "
            f"جزئیات فنی: {exc}"
        ) from exc


def _call_rpc(function_name: str, params: dict[str, Any]) -> httpx.Response:
    url = f"{_base_url()}/rest/v1/rpc/{function_name}"
    headers = _headers(get_settings().supabase_service_role_key)
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(client, "post", url, headers=headers, json=params)

    if response.status_code >= 400:
        logger.error("Supabase RPC %s failed: %s %s", function_name, response.status_code, response.text)
        raise VideoStoreError(f"RPC {function_name} failed: HTTP {response.status_code} — {response.text}")

    return response


def fetch_videos(
    *,
    user_id: str,
    is_admin: bool,
    limit: int = 10,
    offset: int = 0,
) -> VideoPage:
  
    response = _call_rpc(
        "get_youtube_videos",
        {
            "p_user_id": user_id,
            "p_is_admin": is_admin,
            "p_limit": limit,
            "p_offset": offset,
        },
    )

    rows: list[dict[str, Any]] = response.json()
    videos = [
        VideoItem(
            id=row["id"],
            youtube_id=row.get("youtube_id") or row["id"],
            title=row.get("title") or "Untitled",
            created_at=row["created_at"],
        )
        for row in rows
    ]
    total_count = rows[0]["total_count"] if rows else 0
    return VideoPage(videos=videos, total_count=total_count)


def fetch_today_count(*, user_id: str, is_admin: bool) -> int:
    """Fetch how many videos"""
    response = _call_rpc(
        "get_today_video_count",
        {"p_user_id": user_id, "p_is_admin": is_admin},
    )
    result = response.json()
    if isinstance(result, (int, float)):
        return int(result)
    if isinstance(result, list) and result:
        first = result[0]
        return int(first if isinstance(first, (int, float)) else first.get("get_today_video_count", 0))
    return 0


class DailyUploadCount(NamedTuple):
    day: str 
    video_count: int 


class UploadMetrics(NamedTuple):
    total: int
    percentage_change: float
    trend: str  # "up" | "down"
    daily_counts: list[DailyUploadCount]


def fetch_upload_metrics(*, user_id: str, is_admin: bool, days: int = 14) -> UploadMetrics:
   
    daily_response = _call_rpc(
        "get_video_upload_daily_counts",
        {"p_user_id": user_id, "p_is_admin": is_admin, "p_days": days},
    )
    daily_rows: list[dict[str, Any]] = daily_response.json()
    
    daily_counts = [DailyUploadCount(day=row["day"], video_count=row["count"]) for row in daily_rows]

    total_page = fetch_videos(user_id=user_id, is_admin=is_admin, limit=1, offset=0)
    total = total_page.total_count

    midpoint = len(daily_counts) // 2
    
    previous_period_count = sum(entry.video_count for entry in daily_counts[:midpoint])
    recent_period_count = sum(entry.video_count for entry in daily_counts[midpoint:])

    if previous_period_count > 0:
        percentage_change = ((recent_period_count - previous_period_count) / previous_period_count) * 100
    elif recent_period_count > 0:
        percentage_change = 100.0  
    else:
        percentage_change = 0.0

    trend = "up" if percentage_change >= 0 else "down"

    return UploadMetrics(
        total=total,
        percentage_change=round(percentage_change, 1),
        trend=trend,
        daily_counts=daily_counts,
    )