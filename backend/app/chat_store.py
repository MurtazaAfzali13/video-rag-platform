"""Supabase-backed chat persistence (backend-only)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from app.config import get_settings
from app.graph.retry_utils import call_with_retry, HTTP_RETRYABLE_EXCEPTIONS

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=8.0, read=20.0, write=10.0, pool=5.0)

class ChatStoreError(Exception):
    """Raised when Supabase chat operations fail (HTTP error status OR network failure)."""


def _headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation", }


def _base_url() -> str:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ChatStoreError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."  )
    return settings.supabase_url.rstrip("/")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
        raise ChatStoreError(
            "امکان برقراری ارتباط با پایگاه‌داده (Supabase) وجود ندارد. "
            "لطفاً اتصال اینترنت/VPN/فایروال را بررسی کنید و دوباره تلاش کنید. "
            f"جزئیات فنی: {exc}"
        ) from exc


def _ensure_video_exists(video_id: str, user_id: str) -> None:
   
    url = f"{_base_url()}/rest/v1/videos"
    headers = _headers(get_settings().supabase_service_role_key)

    with httpx.Client(timeout=_TIMEOUT) as client:
        check_res = _request(
            client, "get", url, headers=headers, params={"id": f"eq.{video_id}", "select": "id"}
        )
        if check_res.status_code == 200 and check_res.json():
            return 

        logger.warning("Video %s not found in 'videos' table. Creating a placeholder to prevent FK error.", video_id)
        placeholder = {
            "id": video_id,
            "user_id": user_id,
            "title": "Processing Video...",
            "created_at": _now_iso(),
        }
        upsert_res = _request(client, "post", url, headers=headers, json=placeholder)
        if upsert_res.status_code >= 400:
            logger.error("Failed to ensure/create video placeholder: %s", upsert_res.text)
            raise ChatStoreError(f"امکان ثبت ویدیو در دیتابیس وجود ندارد: {upsert_res.text}")


def _exact_count(table: str, params: dict[str, str]) -> int:
    headers = _headers(get_settings().supabase_service_role_key)
    headers["Prefer"] = "count=exact"

    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(client, "head", f"{_base_url()}/rest/v1/{table}", headers=headers, params=params)

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
    return _exact_count(
        "chats",
        {"user_id": f"eq.{user_id}", "video_id": "not.is.null"},
    )


def get_user_message_count(user_id: str) -> int:
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

    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(
            client,
            "post",
            f"{_base_url()}/rest/v1/chats",
            headers=_headers(get_settings().supabase_service_role_key),
            json=payload,
        )

    if response.status_code >= 400:
        logger.error("Failed to create chat: %s", response.text)
        raise ChatStoreError(response.text)

    rows = response.json()
    return rows[0] if isinstance(rows, list) and rows else payload

# Get a single chat by ID and user_id.
def get_chat(chat_id: str, user_id: str) -> Optional[dict[str, Any]]:
    """Get a single chat by ID and user_id."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(
            client,
            "get",
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
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(
            client,
            "get",
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

    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(
            client,
            "post",
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
    
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(
            client,
            "get",
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

    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(
            client,
            "post",
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

    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(
            client,
            "patch",
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

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = _request(
                client,
                "patch",
                f"{_base_url()}/rest/v1/chats",
                headers=_headers(get_settings().supabase_service_role_key),
                params={
                    "id": f"eq.{chat_id}",
                    "user_id": f"eq.{user_id}",
                },
                json=payload,
            )
    except ChatStoreError as exc:
     
        logger.warning("Failed to persist chat timeline for chat %s (network): %s", chat_id, exc)
        return {"id": chat_id, **payload}

    if response.status_code >= 400:
        logger.error("Failed to persist chat timeline for chat %s: %s", chat_id, response.text)
        return {"id": chat_id, **payload}

    rows = response.json()
    return rows[0] if isinstance(rows, list) and rows else {"id": chat_id, **payload}


def update_chat_title(chat_id: str, user_id: str, title: str) -> dict[str, Any]:
    """Update the title of a chat."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = _request(
            client,
            "patch",
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
