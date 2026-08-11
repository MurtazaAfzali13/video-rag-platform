"""Video dashboard endpoints: paginated video list + today's-upload stat.

CACHING DECISION (updated)
---------------------------
Both endpoints are now cached in-process with `cachetools.TTLCache`:

- `/api/videos`        -> TTL = 2 hours, keyed by (scope, limit, offset)
- `/api/videos/stats/today` -> TTL = 5 minutes, keyed by scope

`scope` is `"admin"` for admin callers (one shared view of "all videos") or
the caller's `user_id` for regular users.

Why 2 hours for the list now (this was intentionally NOT cached before):
the frontend was hitting this endpoint on every mount/navigation, which is
unnecessarily heavy for data — a video list — that essentially never needs
to be second-fresh. Thumbnails are static YouTube images anyway, so "stale"
here just means "might not show a video someone else added in the last two
hours," which is an acceptable tradeoff in exchange for far fewer Supabase
round-trips. The frontend mirrors this with a matching 2-hour SWR
`dedupingInterval` + `refreshInterval` (see `VideoContext.tsx`) so the two
layers agree on the same cadence instead of the client polling faster than
the server would ever return fresh data anyway.

The one case that must NOT wait 2 hours: a user who just processed a video
should see it in their own list immediately. That's handled by
`invalidate_user_video_cache(user_id)` below — call it right after a video
is successfully ingested (see `video.py`'s `process_video` endpoint) and it
evicts that user's (and the shared admin) cache entries so their very next
`/api/videos` request is a real, fresh fetch instead of a stale hit.

`cachetools.TTLCache` is in-process, not shared across replicas — fine here:
worst case, different workers independently cache the same data for up to
2 hours, and a cache-invalidation call only clears the entry on the worker
that handled the invalidation request. Multi-replica deployments that need
stronger guarantees would want a shared cache (Redis) instead; noted as a
known limitation rather than solved here.
"""

from __future__ import annotations

import asyncio
import logging
import threading

from cachetools import TTLCache
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import get_current_user_with_role, AuthenticatedUser
from app.video_store import VideoStoreError, fetch_today_count, fetch_videos

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Videos"])

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50

LIST_CACHE_TTL_SECONDS = 2 * 60 * 60  # 2 hours
TODAY_COUNT_CACHE_TTL_SECONDS = 5 * 60  # 5 minutes

# --- caches -------------------------------------------------------------------
# Keyed by "admin" (shared across all admins) or the caller's user_id, so an
# admin's view never leaks into / gets conflated with a regular user's data.
_video_list_cache: TTLCache = TTLCache(maxsize=2048, ttl=LIST_CACHE_TTL_SECONDS)
_video_list_lock = threading.Lock()

_today_count_cache: TTLCache = TTLCache(maxsize=512, ttl=TODAY_COUNT_CACHE_TTL_SECONDS)
_today_count_lock = threading.Lock()


def _scope_for(auth: AuthenticatedUser) -> str:
    return "admin" if auth.is_admin else auth.user_id


def invalidate_user_video_cache(user_id: str) -> None:
    """Evict cached list/today-count entries for one user (and the shared admin view).

    Call this right after a new video is successfully ingested, so the
    uploader (and any admin dashboard) sees it on their very next request
    instead of waiting out the 2-hour TTL. Intentionally does NOT touch
    other users' cached entries — nobody else's list changed.
    """
    with _video_list_lock:
        stale_keys = [key for key in list(_video_list_cache.keys()) if key[0] in (user_id, "admin")]
        for key in stale_keys:
            _video_list_cache.pop(key, None)

    with _today_count_lock:
        _today_count_cache.pop(user_id, None)
        _today_count_cache.pop("admin", None)


# --- Schemas -----------------------------------------------------------------

class VideoItemResponse(BaseModel):
    id: str
    youtube_id: str
    title: str
    created_at: str


class VideoListResponse(BaseModel):
    videos: list[VideoItemResponse]
    total_count: int
    limit: int
    offset: int
    cached: bool


class TodayCountResponse(BaseModel):
    count: int
    cached: bool


# --- Endpoints -----------------------------------------------------------------

@router.get("/videos", response_model=VideoListResponse)
async def list_videos(
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(0, ge=0),
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
) -> VideoListResponse:
    """Paginated video list. Admins see every video; users see only their own.

    Cached for 2 hours per (scope, limit, offset) — see the module docstring.
    A fresh upload bypasses this immediately via `invalidate_user_video_cache`.
    """
    cache_key = (_scope_for(auth), limit, offset)

    with _video_list_lock:
        cached_page = _video_list_cache.get(cache_key)
    if cached_page is not None:
        videos, total_count = cached_page
        return VideoListResponse(
            videos=[VideoItemResponse(**video) for video in videos],
            total_count=total_count,
            limit=limit,
            offset=offset,
            cached=True,
        )

    try:
        page = await run_in_threadpool_fetch_videos(
            user_id=auth.user_id, is_admin=auth.is_admin, limit=limit, offset=offset
        )
    except VideoStoreError as exc:
        logger.error("Failed to fetch videos for user %s: %s", auth.user_id, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    videos_as_dicts = [video._asdict() for video in page.videos]
    with _video_list_lock:
        _video_list_cache[cache_key] = (videos_as_dicts, page.total_count)

    return VideoListResponse(
        videos=[VideoItemResponse(**video) for video in videos_as_dicts],
        total_count=page.total_count,
        limit=limit,
        offset=offset,
        cached=False,
    )


@router.get("/videos/stats/today", response_model=TodayCountResponse)
async def today_video_count(
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
) -> TodayCountResponse:
    """Count of videos indexed today (UTC). Cached for 5 minutes per caller scope."""
    cache_key = "admin" if auth.is_admin else auth.user_id

    with _today_count_lock:
        cached_value = _today_count_cache.get(cache_key)
    if cached_value is not None:
        return TodayCountResponse(count=cached_value, cached=True)

    try:
        count = await run_in_threadpool_fetch_today_count(user_id=auth.user_id, is_admin=auth.is_admin)
    except VideoStoreError as exc:
        logger.error("Failed to fetch today's video count for user %s: %s", auth.user_id, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    with _today_count_lock:
        _today_count_cache[cache_key] = count

    return TodayCountResponse(count=count, cached=False)


# --- thin async wrappers around the sync store functions ---------------------
# `video_store.py` is intentionally sync (plain httpx.Client), same as
# chat_store.py — offloaded to a thread here rather than making the whole
# store async, to stay consistent with the rest of the codebase.

async def run_in_threadpool_fetch_videos(*, user_id: str, is_admin: bool, limit: int, offset: int):
    return await asyncio.to_thread(fetch_videos, user_id=user_id, is_admin=is_admin, limit=limit, offset=offset)


async def run_in_threadpool_fetch_today_count(*, user_id: str, is_admin: bool) -> int:
    return await asyncio.to_thread(fetch_today_count, user_id=user_id, is_admin=is_admin)
