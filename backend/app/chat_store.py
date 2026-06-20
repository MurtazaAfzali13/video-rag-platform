"""Supabase-backed chat persistence (backend-only)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class ChatStoreError(Exception):
    """Raised when Supabase chat operations fail."""


def _headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _base_url() -> str:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ChatStoreError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    return settings.supabase_url.rstrip("/")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_chat(
    *,
    user_id: str,
    title: str,
    video_id: Optional[str] = None,
) -> dict[str, Any]:
    chat_id = str(uuid.uuid4())
    payload = {
        "id": chat_id,
        "user_id": user_id,
        "title": title[:120] or "New Chat",
        "video_id": video_id,
        "created_at": _now_iso(),
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{_base_url()}/rest/v1/chats",
            headers=_headers(get_settings().supabase_service_role_key),
            json=payload,
        )

    if response.status_code >= 400:
        logger.error("Failed to create chat: %s", response.text)
        raise ChatStoreError(response.text)

    rows = response.json()
    return rows[0] if isinstance(rows, list) and rows else payload


def get_chat(chat_id: str, user_id: str) -> Optional[dict[str, Any]]:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
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
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
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
    payload = {
        "id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "role": role,
        "content": content,
        "created_at": _now_iso(),
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
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
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
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


def init_chat(user_id: str) -> dict[str, Any]:
    """Create an empty chat session eagerly (before first message or video)."""
    return create_chat(user_id=user_id, title="New Chat", video_id=None)


def update_chat_video_id(chat_id: str, user_id: str, video_id: str) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        response = client.patch(
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


def update_chat_title(chat_id: str, user_id: str, title: str) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        response = client.patch(
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
