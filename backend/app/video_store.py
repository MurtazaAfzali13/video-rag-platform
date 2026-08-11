"""Supabase-backed video store (backend-only).

Calls the two RPCs defined in `sql/video_rpcs.sql` (`get_youtube_videos`,
`get_today_video_count`) instead of hand-building PostgREST filter strings —
RBAC (admin vs. own-videos-only) is enforced inside the RPC by the
`p_is_admin` / `p_user_id` arguments, which the router derives from the
verified Clerk JWT and never from anything the client sends directly.

Mirrors `chat_store.py`'s conventions on purpose (same retrying `_request`
choke point, same "raise a clear domain error instead of letting a raw httpx
exception escape" pattern) so this file reads like it belongs next to it.
"""

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
    """Single choke point for every Supabase HTTP call, with retry on network failures.

    Same wrapper as chat_store.py's `_request`: retries transient connection-level
    failures with exponential backoff, and converts anything that survives the
    retries into a `VideoStoreError` so routers only ever have to handle one
    exception type (-> HTTP 503) instead of raw httpx exceptions.
    """

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
    """Fetch one page of videos, RBAC-scoped.

    Admins (`is_admin=True`) see every video in the workspace; regular users
    only ever see rows where `videos.user_id == user_id` — that filter is
    applied server-side inside the `get_youtube_videos` RPC, not here.
    """
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
    """Fetch how many videos were indexed today (UTC), RBAC-scoped."""
    response = _call_rpc(
        "get_today_video_count",
        {"p_user_id": user_id, "p_is_admin": is_admin},
    )
    result = response.json()
    # PostgREST returns a scalar RPC result as a bare JSON number.
    if isinstance(result, (int, float)):
        return int(result)
    if isinstance(result, list) and result:
        first = result[0]
        return int(first if isinstance(first, (int, float)) else first.get("get_today_video_count", 0))
    return 0
