"""Supabase-backed user overview/analytics store (backend-only).

Deliberately its own connection module — separate from chat_store.py and
dashboard_store.py — so this read-only analytics surface can evolve
independently (e.g. pointed at a read replica, or a service-role key scoped
to only this RPC) without ever touching chat/message persistence code.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.config import get_settings
from app.graph.retry_utils import call_with_retry, HTTP_RETRYABLE_EXCEPTIONS

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=8.0, read=20.0, write=10.0, pool=5.0)


class UsersStoreError(Exception):
    """Raised when the users-overview Supabase RPC fails (HTTP error OR network failure)."""


def _base_url() -> str:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise UsersStoreError("Supabase is not configured for the users store.")
    return settings.supabase_url.rstrip("/")


def _headers() -> dict[str, str]:
    key = get_settings().supabase_service_role_key
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _request(client: httpx.Client, method: str, url: str, **kwargs: Any) -> httpx.Response:
    """Same retry-then-classify pattern used in chat_store.py: transient
    network failures are retried with backoff, and if exhausted, raised as
    UsersStoreError (not a raw httpx exception) so the router's existing
    `except UsersStoreError -> 503` handling works correctly.
    """

    def _do_call() -> httpx.Response:
        return getattr(client, method)(url, **kwargs)

    try:
        return call_with_retry(
            _do_call, max_attempts=3, min_wait=1.0, max_wait=8.0, exceptions=HTTP_RETRYABLE_EXCEPTIONS
        )
    except HTTP_RETRYABLE_EXCEPTIONS as exc:
        logger.error("Users store %s %s failed after retries: %s", method.upper(), url, exc)
        raise UsersStoreError(
            f"امکان اتصال به دیتابیس کاربران وجود ندارد. لطفاً اتصال اینترنت را بررسی کنید. جزئیات: {exc}"
        ) from exc


def get_users_overview(*, user_id: Optional[str] = None) -> list[dict[str, Any]]:
    """Calls the get_users_overview(p_user_id) Postgres RPC.

    user_id=None -> every user on the platform. CALLER MUST GATE THIS TO
                    ADMINS ONLY — this function itself does no authorization,
                    it only executes the query it's given.
    user_id=<id> -> that single user's own aggregated stats (0 or 1 row).
    """
    payload = {"p_user_id": user_id}

    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(
            client,
            "post",
            f"{_base_url()}/rest/v1/rpc/get_users_overview",
            headers=_headers(),
            json=payload,
        )

    if response.status_code >= 400:
        logger.error("get_users_overview RPC failed: %s", response.text)
        raise UsersStoreError(response.text)

    return response.json()
