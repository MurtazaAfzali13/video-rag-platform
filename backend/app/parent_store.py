"""Supabase-backed parent-chunk store for Small-to-Big retrieval (backend-only).

Parents are SHARED across users (one copy per video). The `user_id` column only records
who triggered the ingestion; access control lives in the `user_videos` table.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_TABLE = "video_parents"
_TIMEOUT = httpx.Timeout(connect=8.0, read=30.0, write=30.0, pool=5.0)
_INSERT_BATCH = 100


class ParentStoreError(Exception):
    """Raised when a parent-store operation fails (HTTP error or network failure)."""


def make_parent_id(video_id: str, idx: int) -> str:
    """Deterministic ID -> idempotent re-ingestion and neighbour lookup without a query."""
    return f"{video_id}_p{idx:04d}"


def _config() -> tuple[str, dict[str, str]]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ParentStoreError("Supabase is not configured.")
    key = settings.supabase_service_role_key
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    return f"{settings.supabase_url.rstrip('/')}/rest/v1/{_TABLE}", headers


def _request(method: str, url: str, **kwargs: Any) -> httpx.Response:
    from app.graph.retry_utils import (
        HTTP_RETRYABLE_EXCEPTIONS,
        call_with_retry,
        should_retry_http_response,
    )

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = call_with_retry(
                lambda: client.request(method, url, **kwargs),
                max_attempts=3,
                min_wait=1.0,
                max_wait=8.0,
                exceptions=HTTP_RETRYABLE_EXCEPTIONS,
                retry_if_result=lambda r: should_retry_http_response(method, r),
            )
    except HTTP_RETRYABLE_EXCEPTIONS as exc:
        raise ParentStoreError(f"Supabase {method} failed after retries: {exc}") from exc

    if response.status_code >= 400:
        raise ParentStoreError(f"Supabase {method} -> HTTP {response.status_code}: {response.text}")
    return response


def delete_video_parents(video_id: str) -> None:
    """Parents are shared across users now (one copy per video)."""
    url, headers = _config()
    _request(
        "DELETE",
        url,
        headers=headers,
        params={"video_id": f"eq.{video_id}"},
    )


def save_parents(rows: list[dict[str, Any]]) -> None:
    """Upsert parent rows (merge on primary key)."""
    if not rows:
        return
    url, headers = _config()
    headers = {**headers, "Prefer": "resolution=merge-duplicates,return=minimal"}
    for i in range(0, len(rows), _INSERT_BATCH):
        _request(
            "POST",
            url,
            headers=headers,
            params={"on_conflict": "id"},
            json=rows[i : i + _INSERT_BATCH],
        )


def fetch_parents(parent_ids: list[str]) -> dict[str, dict[str, Any]]:
    """Fetch parents by ID in ONE query.

    Parents are shared across users. Access control is enforced UPSTREAM: parent IDs only
    come from Pinecone hits that were filtered to the user's own videos (see retriever_node).
    """
    ids = sorted(set(parent_ids))
    if not ids:
        return {}
    url, headers = _config()
    quoted = ",".join(f'"{pid}"' for pid in ids)
    response = _request(
        "GET",
        url,
        headers=headers,
        params={
            "id": f"in.({quoted})",
            "select": "id,video_id,idx,start_time,end_time,content",
        },
    )
    return {row["id"]: row for row in response.json()}


def fetch_video_parents(video_id: str) -> list[dict[str, Any]]:
    """All parents of one video in chronological order (used for summaries).

    Caller must have verified the user has access (user_has_video).
    """
    url, headers = _config()
    response = _request(
        "GET",
        url,
        headers=headers,
        params={
            "video_id": f"eq.{video_id}",
            "select": "id,idx,start_time,end_time,content",
            "order": "idx.asc",
            "limit": "5000",
        },
    )
    return response.json()
