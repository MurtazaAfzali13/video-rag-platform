from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable, Literal, Optional

import httpx

from app.config import get_settings
from app.chat_store import _base_url as _supabase_base_url, _headers as _supabase_headers

logger = logging.getLogger(__name__)

Status = Literal["healthy", "warning", "offline"]

_FAST_TIMEOUT = httpx.Timeout(4.0)
_WARNING_LATENCY_MS = 1200 


@dataclass
class ServiceCheckResult:
    id: str
    name: str
    status: Status
    latency_ms: Optional[int]
    detail: Optional[str] = None


def _settings_attr(names: tuple[str, ...]) -> Optional[str]:
    """Return the first non-empty value among several possible Settings attribute names."""
    settings = get_settings()
    for name in names:
        value = getattr(settings, name, None)
        if value:
            return str(value)  
    return None


def _measure(fn: Callable[[], None]) -> tuple[Status, int, Optional[str]]:
   
    start = time.monotonic()
    try:
        fn()
    except Exception as exc:  
        latency_ms = int((time.monotonic() - start) * 1000)
        logger.warning("Health check failed: %s", exc)
        return "offline", latency_ms, str(exc)[:200]

    latency_ms = int((time.monotonic() - start) * 1000)
    status: Status = "warning" if latency_ms > _WARNING_LATENCY_MS else "healthy"
    return status, latency_ms, None


# ---------------- individual checks ----------------

def _check_api_server() -> ServiceCheckResult:
    return ServiceCheckResult(id="api-server", name="API Server", status="healthy", latency_ms=0)


def _check_database() -> ServiceCheckResult:
    def _ping() -> None:
        settings = get_settings()
        # اصلاح مشکل اول: چک کردن وجود کلید قبل از پاس دادن به هدرها
        if not settings.supabase_service_role_key:
            raise RuntimeError("Supabase service role key is not configured")
            
        headers = _supabase_headers(settings.supabase_service_role_key)
        
        with httpx.Client(timeout=_FAST_TIMEOUT) as client:
            # PostgREST's root responds without naming a table — the cheapest
            # possible authenticated round-trip; no rows are read.
            res = client.get(f"{_supabase_base_url()}/rest/v1/", headers=headers)
            if res.status_code >= 500:
                raise RuntimeError(f"Supabase returned HTTP {res.status_code}")

    status, latency_ms, detail = _measure(_ping)
    return ServiceCheckResult(id="database", name="Database", status=status, latency_ms=latency_ms, detail=detail)


def _check_pinecone() -> ServiceCheckResult:
    def _ping() -> None:
        settings = get_settings()
        if not settings.pinecone_api_key or not settings.index_name:
            raise RuntimeError("Pinecone is not configured (missing api key / index name)")
        from pinecone import Pinecone  

        pc = Pinecone(api_key=settings.pinecone_api_key)
        pc.describe_index(settings.index_name)  

    status, latency_ms, detail = _measure(_ping)
    return ServiceCheckResult(id="pinecone", name="Pinecone", status=status, latency_ms=latency_ms, detail=detail)



_LLM_KEY_ATTRS = ("openrouter_api_key", "openai_api_key")
_LLM_BASE_URL_ATTRS = ("openrouter_base_url", "openai_base_url")


def _check_llm_provider() -> ServiceCheckResult:
    def _ping() -> None:
        api_key = _settings_attr(_LLM_KEY_ATTRS)
        base_url = _settings_attr(_LLM_BASE_URL_ATTRS) or "https://api.openai.com/v1"
        if not api_key:
            raise RuntimeError("No LLM provider API key configured")

        with httpx.Client(timeout=_FAST_TIMEOUT) as client:
            # /models is metadata-only — no completion/embedding tokens spent.
            res = client.get(f"{base_url.rstrip('/')}/models", headers={"Authorization": f"Bearer {api_key}"})
            if res.status_code >= 500:
                raise RuntimeError(f"LLM provider returned HTTP {res.status_code}")

    status, latency_ms, detail = _measure(_ping)
    return ServiceCheckResult(id="openai", name="OpenAI", status=status, latency_ms=latency_ms, detail=detail)


_TAVILY_KEY_ATTRS = ("tavily_api_key", "TAVILY_API_KEY")


def _check_tavily() -> ServiceCheckResult:
    def _ping() -> None:
        if not _settings_attr(_TAVILY_KEY_ATTRS):
            raise RuntimeError("Tavily API key is not configured")
        with httpx.Client(timeout=_FAST_TIMEOUT) as client:
            client.get("https://api.tavily.com/")

    status, latency_ms, detail = _measure(_ping)
    return ServiceCheckResult(id="tavily", name="Tavily", status=status, latency_ms=latency_ms, detail=detail)


_REDIS_URL_ATTRS = ("redis_url", "REDIS_URL")


def _check_redis() -> ServiceCheckResult:
    def _ping() -> None:
        redis_url = _settings_attr(_REDIS_URL_ATTRS)
        if not redis_url:
            raise RuntimeError("Redis is not configured in this deployment")
        import redis 

        client = redis.Redis.from_url(redis_url, socket_connect_timeout=3, socket_timeout=3)
        if not client.ping():
            raise RuntimeError("Redis PING did not return PONG")

    status, latency_ms, detail = _measure(_ping)
    return ServiceCheckResult(id="redis", name="Redis", status=status, latency_ms=latency_ms, detail=detail)


ALL_CHECKS: tuple[Callable[[], ServiceCheckResult], ...] = (
    _check_api_server,
    _check_pinecone,
    _check_llm_provider,
    _check_tavily,
    _check_database,
    _check_redis,
)