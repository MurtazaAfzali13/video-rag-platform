

from __future__ import annotations

import asyncio
import logging
import threading
from datetime import date

from cachetools import TTLCache
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import get_current_user_with_role, AuthenticatedUser
from app.video_store import VideoStoreError, fetch_today_count, fetch_upload_metrics, fetch_videos

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Videos"])

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50

LIST_CACHE_TTL_SECONDS = 2 * 60 * 60  
TODAY_COUNT_CACHE_TTL_SECONDS = 5 * 60  


_video_list_cache: TTLCache = TTLCache(maxsize=2048, ttl=LIST_CACHE_TTL_SECONDS)
_video_list_lock = threading.Lock()

_today_count_cache: TTLCache = TTLCache(maxsize=512, ttl=TODAY_COUNT_CACHE_TTL_SECONDS)
_today_count_lock = threading.Lock()


_upload_metrics_cache: TTLCache = TTLCache(maxsize=512, ttl=TODAY_COUNT_CACHE_TTL_SECONDS)
_upload_metrics_lock = threading.Lock()


def _scope_for(auth: AuthenticatedUser) -> str:
    return "admin" if auth.is_admin else auth.user_id


def invalidate_user_video_cache(user_id: str) -> None:
    """Evict cached list/today-count/metrics entries for one user (and the shared admin view).

    Call this right after a new video is successfully ingested, so the
    uploader (and any admin dashboard) sees it on their very next request
    instead of waiting out the cache TTLs. Intentionally does NOT touch
    other users' cached entries — nobody else's list changed.
    """
    with _video_list_lock:
        stale_keys = [key for key in list(_video_list_cache.keys()) if key[0] in (user_id, "admin")]
        for key in stale_keys:
            _video_list_cache.pop(key, None)

    with _today_count_lock:
        _today_count_cache.pop(user_id, None)
        _today_count_cache.pop("admin", None)

    with _upload_metrics_lock:
        _upload_metrics_cache.pop(user_id, None)
        _upload_metrics_cache.pop("admin", None)


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


class DailyCountPoint(BaseModel):
    label: str
    value: int


class VideoUploadMetricsResponse(BaseModel):
    total: int
    percentage_change: float
    trend: str  # "up" | "down"
    chart_data: list[DailyCountPoint]
    cached: bool



@router.get("/videos", response_model=VideoListResponse)
async def list_videos(
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(0, ge=0),
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
) -> VideoListResponse:
 
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


@router.get("/videos/stats/metrics", response_model=VideoUploadMetricsResponse)
async def video_upload_metrics(
    days: int = Query(14, ge=2, le=90),
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
) -> VideoUploadMetricsResponse:
  
    cache_key = _scope_for(auth)

    with _upload_metrics_lock:
        cached_metrics = _upload_metrics_cache.get(cache_key)
    if cached_metrics is not None:
        return VideoUploadMetricsResponse(**cached_metrics, cached=True)

    try:
        metrics = await run_in_threadpool_fetch_upload_metrics(
            user_id=auth.user_id, is_admin=auth.is_admin, days=days
        )
    except VideoStoreError as exc:
        logger.error("Failed to fetch upload metrics for user %s: %s", auth.user_id, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    payload = {
        "total": metrics.total,
        "percentage_change": metrics.percentage_change,
        "trend": metrics.trend,
        "chart_data": [
            {"label": _short_weekday_label(entry.day), "value": entry.count} for entry in metrics.daily_counts
        ],
    }

    with _upload_metrics_lock:
        _upload_metrics_cache[cache_key] = payload

    return VideoUploadMetricsResponse(**payload, cached=False)


def _short_weekday_label(iso_date: str) -> str:
    """"2026-08-11" -> "Tue" for the sparkline's x-axis-ish labels."""
    try:
        return date.fromisoformat(iso_date).strftime("%a")
    except ValueError:
        return iso_date




async def run_in_threadpool_fetch_videos(*, user_id: str, is_admin: bool, limit: int, offset: int):
    return await asyncio.to_thread(fetch_videos, user_id=user_id, is_admin=is_admin, limit=limit, offset=offset)


async def run_in_threadpool_fetch_today_count(*, user_id: str, is_admin: bool) -> int:
    return await asyncio.to_thread(fetch_today_count, user_id=user_id, is_admin=is_admin)


async def run_in_threadpool_fetch_upload_metrics(*, user_id: str, is_admin: bool, days: int):
    return await asyncio.to_thread(fetch_upload_metrics, user_id=user_id, is_admin=is_admin, days=days)
