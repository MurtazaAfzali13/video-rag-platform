

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from typing import Any, Awaitable, Callable, Optional, TypeVar

import psycopg
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

logger = logging.getLogger(__name__)

T = TypeVar("T")
CHAT_DURABILITY = "exit"

DEFAULT_OP_TIMEOUT_S = 1.5  
DEFAULT_POOL_MIN = 1
DEFAULT_POOL_MAX = 5


# ── Circuit breaker ─────────────────────────────────────────────────────────

class CircuitBreaker:
    """Open after `threshold` consecutive failures; half-open after `cooldown_s`."""

    def __init__(self, threshold: int = 2, cooldown_s: float = 30.0) -> None:
        self.threshold = threshold
        self.cooldown_s = cooldown_s
        self._failures = 0
        self._open_until = 0.0

    @property
    def is_open(self) -> bool:
        return time.monotonic() < self._open_until

    def allow(self) -> bool:
        return not self.is_open

    def success(self) -> None:
        self._failures = 0

    def failure(self) -> None:
        self._failures += 1
        if self._failures >= self.threshold:
            self._open_until = time.monotonic() + self.cooldown_s
            self._failures = self.threshold - 1
            logger.error("Checkpoint DB circuit OPEN for %.0fs — running without persistence.", self.cooldown_s)


class BestEffortAsyncPostgresSaver(AsyncPostgresSaver):
    """AsyncPostgresSaver whose failures never break a user request."""

    def __init__(
        self,
        conn: Any,
        *,
        op_timeout_s: float = DEFAULT_OP_TIMEOUT_S,
        breaker: Optional[CircuitBreaker] = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(conn, **kwargs)
        self._op_timeout_s = op_timeout_s
        self.breaker = breaker or CircuitBreaker()

    async def _guard(self, name: str, op: Callable[[], Awaitable[T]], fallback: Callable[[], T]) -> T:
        if not self.breaker.allow():
            return fallback()
        try:
            result = await asyncio.wait_for(op(), self._op_timeout_s)
        except Exception as exc: 
            self.breaker.failure()
            logger.error("Checkpoint %s failed (%s: %s) — continuing without persistence.",
                         name, type(exc).__name__, str(exc)[:200])
            return fallback()
        self.breaker.success()
        return result

    async def aput(self, config, checkpoint, metadata, new_versions):  # type: ignore[override]
        def fallback():
            cfg = config["configurable"]
            return {
                "configurable": {
                    "thread_id": cfg["thread_id"],
                    "checkpoint_ns": cfg.get("checkpoint_ns", ""),
                    "checkpoint_id": checkpoint["id"],
                }
            }

        return await self._guard(
            "aput",
            lambda: AsyncPostgresSaver.aput(self, config, checkpoint, metadata, new_versions),
            fallback,
        )

    async def aput_writes(self, config, writes, task_id, task_path=""):  # type: ignore[override]
        return await self._guard(
            "aput_writes",
            lambda: AsyncPostgresSaver.aput_writes(self, config, writes, task_id, task_path),
            lambda: None,
        )

    async def aget_tuple(self, config):  # type: ignore[override]
        return await self._guard(
            "aget_tuple",
            lambda: AsyncPostgresSaver.aget_tuple(self, config),
            lambda: None,
        )



_URL_PASSWORD_RE = re.compile(r"(://[^:/@\s]+:)[^@\s]*@")


def mask_secret(text: str) -> str:
    """Hide the password in a connection URL (or in a message that contains one)."""
    return _URL_PASSWORD_RE.sub(r"\1***@", text)


def connection_hints(url: str) -> list[str]:
    """Static checks for the most common Supabase connection mistakes (no network)."""
    hints: list[str] = []
    try:
        info = psycopg.conninfo.conninfo_to_dict(url)
    except Exception:
        return ["The URL could not be parsed. Special characters in the password "
                "(@ # / : ? %) must be URL-encoded, or use a letters+digits password."]
    host, user, port = info.get("host", ""), info.get("user", ""), str(info.get("port", ""))
    if host.endswith(".pooler.supabase.com"):
        if "." not in user:
            hints.append(f"Pooler connections need the user as '<role>.<project-ref>' "
                         f"(e.g. langgraph_app.abcdefghijklmnop), but the user is '{user}'.")
        if port not in ("5432", "6543"):
            hints.append(f"Unexpected pooler port {port}: use 5432 (session) or 6543 (transaction).")
    elif host.startswith("db.") and host.endswith(".supabase.co"):
        hints.append("Direct connections (db.<ref>.supabase.co) are IPv6-only on most plans; "
                     "from an IPv4-only network use the Session pooler host instead.")
        if "." in user:
            hints.append("A direct connection uses the plain role name (no '.<project-ref>' suffix).")
    if "sslmode" not in url:
        hints.append("Add '?sslmode=require' to the URL (Supabase requires SSL).")
    return hints


async def diagnose_connection(url: str) -> None:
    """One plain connection attempt (no pool) to log the REAL reason a connect fails."""
    for hint in connection_hints(url):
        logger.error("Checkpoint DB hint: %s", hint)
    try:
        conn = await psycopg.AsyncConnection.connect(url, connect_timeout=6)
    except Exception as exc:
        detail = " ".join(mask_secret(str(exc)).split())
        logger.error("Checkpoint DB diagnostic: %s: %s", type(exc).__name__, detail[:600])
        return
    try:
        cur = await conn.execute("select current_user, current_setting('search_path')")
        row = await cur.fetchone()
        logger.error("Checkpoint DB diagnostic: a plain connection WORKS (user=%s, search_path=%s); "
                     "the failure is in the pool settings or the tables, not the credentials.", row[0], row[1])
    finally:
        await conn.close()



def _database_url() -> Optional[str]:
    try:
        from app.config import get_settings

        url = getattr(get_settings(), "supabase_db_url", None)
    except Exception: 
        url = None
    return url or os.getenv("SUPABASE_DB_URL") or None


def make_pool(url: str, *, min_size: int = DEFAULT_POOL_MIN, max_size: int = DEFAULT_POOL_MAX) -> AsyncConnectionPool:
    return AsyncConnectionPool(
        conninfo=url,
        min_size=min_size,
        max_size=max_size,
        timeout=DEFAULT_OP_TIMEOUT_S,          
        kwargs={
            "autocommit": True,                
            "row_factory": dict_row,           
            "prepare_threshold": None,          
        },
        check=AsyncConnectionPool.check_connection, 
        open=False,
        name="langgraph-checkpoints",
    )


async def init_checkpointer(
    url: Optional[str] = None,
    *,
    auto_setup: bool = False,
    pool_max: int = DEFAULT_POOL_MAX,
) -> Optional[BestEffortAsyncPostgresSaver]:
    """Open the pool and return a saver, or None when checkpointing is unavailable.

    Returns None (and logs why) instead of raising, so the app keeps working without it.
    """
    url = url or _database_url()
    if not url:
        logger.info("Checkpointing disabled: SUPABASE_DB_URL is not set.")
        return None

    pool = make_pool(url, max_size=pool_max)
    try:
        await pool.open(wait=True, timeout=8.0)
        saver = BestEffortAsyncPostgresSaver(pool)
        if auto_setup:
            await saver.setup()
        async with pool.connection() as conn:
            cur = await conn.execute("select to_regclass('checkpoints') as t")
            row = await cur.fetchone()
        if not row or row["t"] is None:
            logger.warning("Checkpoint tables not found — run checkpoints_full_setup.sql (or "
                           "scripts/setup_checkpoints.py) once. Checkpointing disabled.")
            await pool.close(timeout=1.0)
            return None
    except Exception as exc:
        logger.error("Checkpointing disabled: could not initialise (%s: %s)",
                     type(exc).__name__, mask_secret(str(exc))[:200])
        try:
            await pool.close(timeout=1.0)   
        except Exception:
            pass
        await diagnose_connection(url)
        return None

    logger.info("Checkpointing enabled (pool max=%d).", pool_max)
    return saver


async def close_checkpointer(saver: Optional[BestEffortAsyncPostgresSaver]) -> None:
    if saver is not None:
        await saver.conn.close() 

def make_thread_id(chat_id: str, run_id: str) -> str:
    """One thread PER RUN ("<chat_id>:<run_id>").

    A thread per chat would make `messages` (add_messages reducer) grow forever and mix
    unrelated runs; the chat history already lives in the `messages` table.
    """
    return f"{chat_id}:{run_id}"


def build_run_config(*, chat_id: str, run_id: str, user_id: str) -> dict[str, Any]:
    return {
        "configurable": {"thread_id": make_thread_id(chat_id, run_id)},
        "metadata": {"chat_id": chat_id, "run_id": run_id, "user_id": user_id},
        "tags": ["chat"],
    }


def _like_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def purge_chat_checkpoints(saver: BestEffortAsyncPostgresSaver, chat_id: str) -> int:
    """Delete every checkpoint of every run of a chat (call when a chat is deleted)."""
    pattern = _like_escape(chat_id) + ":%"
    total = 0
    async with saver.conn.connection() as conn:  # type: ignore[union-attr]
        for table in ("checkpoint_writes", "checkpoint_blobs", "checkpoints"):
            cur = await conn.execute(f"delete from {table} where thread_id like %s", (pattern,))
            total += cur.rowcount or 0
    return total
