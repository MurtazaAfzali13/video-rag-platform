"""Supabase-backed video registry: dedup/cache, single-flight claim, user<->video links.

NOTE: this is a NEW file. It is separate from `app/video_store.py` (dashboard RPCs).
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Optional

from app.config import get_settings
from app.parent_store import ParentStoreError, _request

logger = logging.getLogger(__name__)

# Bump when chunking parameters change (LINE_TARGET_CHARS, PARENT_LINES, ...):
# every cached video with a lower version is re-indexed on its next upload.
INGEST_VERSION = 1

# One shared Pinecone namespace for ALL users. Access control is done with the
# `user_videos` table + a metadata filter at retrieval time (see nodes.retriever_node).
SHARED_NAMESPACE = "videos"

# Same exception type as parent_store so callers can catch both with one except.
VideoRegistryError = ParentStoreError


def _endpoint(path: str) -> tuple[str, dict[str, str]]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise VideoRegistryError("Supabase is not configured.")
    key = settings.supabase_service_role_key
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    return f"{settings.supabase_url.rstrip('/')}/rest/v1/{path}", headers


def is_ready(video: Optional[dict[str, Any]]) -> bool:
    return (
        bool(video)
        and video.get("ingest_status") == "ready"
        and int(video.get("ingest_version") or 0) >= INGEST_VERSION
    )


def get_video(video_id: str) -> Optional[dict[str, Any]]:
    url, headers = _endpoint("videos")
    response = _request(
        "GET",
        url,
        headers=headers,
        params={
            "id": f"eq.{video_id}",
            "select": "id,title,ingest_status,ingest_version,content_hash,chunk_count,timeline_items,transcript_lines",
            "limit": "1",
        },
    )
    rows = response.json()
    return rows[0] if rows else None


def claim_video(video_id: str, user_id: str) -> str:
    """Atomic single-flight claim (Postgres function `claim_video`).

    Returns:
      'claimed' -> caller MUST ingest the video (cache miss)
      'ready'   -> already indexed (cache hit)
      'busy'    -> another request is indexing it right now
    """
    url, headers = _endpoint("rpc/claim_video")
    response = _request(
        "POST",
        url,
        headers=headers,
        json={
            "p_video_id": video_id,
            "p_user_id": user_id,
            "p_version": INGEST_VERSION,
        },
    )
    return response.json()


def mark_video_ready(
    video_id: str,
    *,
    title: str,
    chunk_count: int,
    content_hash: str,
    timeline_items: list,
    transcript_lines: list,
) -> None:
    url, headers = _endpoint("videos")
    _request(
        "PATCH",
        url,
        headers={**headers, "Prefer": "return=minimal"},
        params={"id": f"eq.{video_id}"},
        json={
            "ingest_status": "ready",
            "ingest_version": INGEST_VERSION,
            "title": title,
            "chunk_count": chunk_count,
            "content_hash": content_hash,
            "timeline_items": timeline_items,
            "transcript_lines": transcript_lines,
        },
    )


def mark_video_failed(video_id: str) -> None:
    url, headers = _endpoint("videos")
    try:
        _request(
            "PATCH",
            url,
            headers={**headers, "Prefer": "return=minimal"},
            params={"id": f"eq.{video_id}"},
            json={"ingest_status": "failed"},
        )
    except VideoRegistryError as exc:  # the stale-claim timeout in SQL is the safety net
        logger.error("Could not mark video %s as failed: %s", video_id, exc)


def link_user_video(user_id: str, video_id: str) -> None:
    """Idempotent: linking the same pair twice is a no-op."""
    url, headers = _endpoint("user_videos")
    _request(
        "POST",
        url,
        headers={**headers, "Prefer": "resolution=ignore-duplicates,return=minimal"},
        params={"on_conflict": "user_id,video_id"},
        json={"user_id": user_id, "video_id": video_id},
    )


def user_has_video(user_id: str, video_id: str) -> bool:
    url, headers = _endpoint("user_videos")
    response = _request(
        "GET",
        url,
        headers=headers,
        params={
            "user_id": f"eq.{user_id}",
            "video_id": f"eq.{video_id}",
            "select": "video_id",
            "limit": "1",
        },
    )
    return bool(response.json())


def list_user_video_ids(user_id: str) -> list[str]:
    url, headers = _endpoint("user_videos")
    response = _request(
        "GET",
        url,
        headers=headers,
        params={"user_id": f"eq.{user_id}", "select": "video_id", "limit": "1000"},
    )
    return [row["video_id"] for row in response.json()]


async def wait_until_ready(
    video_id: str, *, timeout: float = 120.0, interval: float = 3.0
) -> Optional[dict[str, Any]]:
    """Followers poll here while the leader ingests. None = failed or timed out."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        video = await asyncio.to_thread(get_video, video_id)
        if is_ready(video):
            return video
        if video and video.get("ingest_status") == "failed":
            return None
        await asyncio.sleep(interval)
    return None
