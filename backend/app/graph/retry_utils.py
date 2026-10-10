
from __future__ import annotations

import asyncio
import logging
import random
import time
from email.utils import parsedate_to_datetime
from typing import Any, Callable, Optional, TypeVar

import httpx
import openai
from pydantic import ValidationError

try:  # langchain-core is always present in this project, but keep the module importable
    from langchain_core.exceptions import OutputParserException
except ImportError:  # pragma: no cover
    class OutputParserException(Exception):  # type: ignore[no-redef]
        pass

logger = logging.getLogger(__name__)

T = TypeVar("T")

RETRY = "retry"     
LIMITED = "limited"  
FATAL = "fatal"     


class DeadlineExceededError(Exception):
    """The overall request deadline passed before the operation could finish."""


class EmptyLLMResponseError(Exception):
    """The model returned nothing usable (e.g. structured output parsed to None)."""

LLM_RETRYABLE_EXCEPTIONS: tuple[type[BaseException], ...] = (
    openai.RateLimitError,
    openai.APITimeoutError,
    openai.APIConnectionError,
    httpx.TransportError,
)

_http_exceptions: list[type[BaseException]] = [httpx.TransportError, ConnectionError, TimeoutError]
try: 
    import requests

    _http_exceptions += [requests.exceptions.ConnectionError, requests.exceptions.Timeout]
except ImportError:  # pragma: no cover
    pass
HTTP_RETRYABLE_EXCEPTIONS: tuple[type[BaseException], ...] = tuple(_http_exceptions)

_NETWORK_ERRORS: tuple[type[BaseException], ...] = (
    openai.APIConnectionError,  # includes APITimeoutError
    httpx.TransportError,       # includes TimeoutException, ConnectError, ReadTimeout...
    ConnectionError,
    TimeoutError,
)

_IDEMPOTENT_METHODS = frozenset({"GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"})


# ── Classification ──────────────────────────────────────────────────────────

def classify_llm_error(exc: BaseException) -> str:
    """Return RETRY, LIMITED or FATAL for an exception raised by an LLM call."""
    if isinstance(exc, DeadlineExceededError):
        return FATAL
    if isinstance(exc, (EmptyLLMResponseError, OutputParserException, ValidationError)):
        return LIMITED
    if isinstance(exc, openai.APIStatusError):
        status = exc.status_code
        if status == 429:
            # "insufficient_quota" will not fix itself in a few seconds
            return FATAL if getattr(exc, "code", None) == "insufficient_quota" else RETRY
        return RETRY if status in (408, 409) or status >= 500 else FATAL
    if isinstance(exc, _NETWORK_ERRORS):
        return RETRY
    if isinstance(exc, openai.APIError):
        # e.g. error event in the middle of a stream, malformed provider body
        return LIMITED
    return FATAL


def should_retry_http_response(method: str, response: Any) -> bool:
    """Decide whether an HTTP *response* (not exception) is worth retrying.

    429/503 mean the request was not processed -> safe for every method.
    502/504 are ambiguous (the server may have processed it) -> idempotent methods only.
    """
    status = getattr(response, "status_code", None)
    if status in (429, 503):
        return True
    if status in (502, 504):
        return method.upper() in _IDEMPOTENT_METHODS
    return False


def _retry_after_seconds(source: Any) -> Optional[float]:
    """Seconds suggested by `retry-after-ms` / `retry-after` on an exception or response."""
    response = getattr(source, "response", source)
    headers = getattr(response, "headers", None)
    if headers is None:
        return None
    try:
        ms = headers.get("retry-after-ms")
        if ms is not None:
            return max(0.0, float(ms) / 1000.0)
        value = headers.get("retry-after")
        if value is None:
            return None
        try:
            return max(0.0, float(value))
        except ValueError:  # HTTP-date form
            return max(0.0, parsedate_to_datetime(value).timestamp() - time.time())
    except Exception: 
        return None


class _Retrier:
    def __init__(
        self,
        *,
        label: str,
        max_attempts: int,
        min_wait: float,
        max_wait: float,
        limited_retries: int,
        deadline: Optional[float],
    ) -> None:
        self.label = label
        self.max_attempts = max_attempts
        self.min_wait = min_wait
        self.max_wait = max_wait
        self.limited_retries = limited_retries
        self.deadline = deadline
        self.failures = 0
        self.limited_used = 0

    def check_deadline(self) -> None:
        if self.deadline is not None and time.monotonic() >= self.deadline:
            raise DeadlineExceededError(f"{self.label}: request deadline exceeded")

    def next_delay(self, *, kind: str, reason: str, retry_after: Optional[float]) -> Optional[float]:
        """Seconds to sleep before the next attempt, or None to stop retrying."""
        self.failures += 1
        if kind == FATAL:
            return None
        if kind == LIMITED:
            self.limited_used += 1
            if self.limited_used > self.limited_retries:
                return None
        if self.failures >= self.max_attempts:
            return None
        if retry_after is not None and retry_after > self.max_wait:
            return None

        base = min(self.max_wait, self.min_wait * (2 ** (self.failures - 1)))
        delay = base / 2 + random.random() * base / 2  # "equal jitter"
        if retry_after is not None:
            delay = max(delay, retry_after)
        if self.deadline is not None and time.monotonic() + delay >= self.deadline:
            return None

        logger.warning(
            "%s: attempt %d/%d failed (%s: %s) -> retrying in %.1fs",
            self.label, self.failures, self.max_attempts, kind, reason[:200], delay,
        )
        return delay


def _describe(exc: BaseException) -> str:
    return f"{type(exc).__name__}: {exc}"


# ── Public API ──────────────────────────────────────────────────────────────

def invoke_with_retry(
    chain: Any,
    inputs: dict,
    *,
    max_attempts: int = 4,
    min_wait: float = 1.0,
    max_wait: float = 20.0,
    limited_retries: int = 1,
    deadline: Optional[float] = None,
    reject_none: bool = True,
) -> Any:
    """chain.invoke(inputs) with classified retries. `deadline` is a time.monotonic() value."""
    retrier = _Retrier(
        label="llm", max_attempts=max_attempts, min_wait=min_wait, max_wait=max_wait,
        limited_retries=limited_retries, deadline=deadline,
    )
    while True:
        retrier.check_deadline()
        try:
            result = chain.invoke(inputs)
            if result is None and reject_none:
                raise EmptyLLMResponseError("chain returned None (structured output not produced)")
            return result
        except Exception as exc:
            delay = retrier.next_delay(
                kind=classify_llm_error(exc),
                reason=_describe(exc),
                retry_after=_retry_after_seconds(exc),
            )
            if delay is None:
                raise
            time.sleep(delay)


async def ainvoke_with_retry(
    chain: Any,
    inputs: dict,
    *,
    max_attempts: int = 4,
    min_wait: float = 1.0,
    max_wait: float = 20.0,
    limited_retries: int = 1,
    deadline: Optional[float] = None,
    reject_none: bool = True,
) -> Any:
    """Async twin of `invoke_with_retry`."""
    retrier = _Retrier(
        label="llm", max_attempts=max_attempts, min_wait=min_wait, max_wait=max_wait,
        limited_retries=limited_retries, deadline=deadline,
    )
    while True:
        retrier.check_deadline()
        try:
            result = await chain.ainvoke(inputs)
            if result is None and reject_none:
                raise EmptyLLMResponseError("chain returned None (structured output not produced)")
            return result
        except Exception as exc:
            delay = retrier.next_delay(
                kind=classify_llm_error(exc),
                reason=_describe(exc),
                retry_after=_retry_after_seconds(exc),
            )
            if delay is None:
                raise
            await asyncio.sleep(delay)


def call_with_retry(
    fn: Callable[[], T],
    *,
    max_attempts: int = 3,
    min_wait: float = 1.0,
    max_wait: float = 10.0,
    exceptions: tuple = HTTP_RETRYABLE_EXCEPTIONS,
    retry_if_result: Optional[Callable[[T], bool]] = None,
    deadline: Optional[float] = None,
) -> T:
    """Call `fn()` retrying on `exceptions` and, optionally, on retryable *results*.

    `retry_if_result(response) -> True` marks a returned response (e.g. HTTP 503) as
    retryable. When attempts run out the last response is RETURNED (not raised), so the
    caller keeps its normal status-code handling.
    """
    retrier = _Retrier(
        label="http", max_attempts=max_attempts, min_wait=min_wait, max_wait=max_wait,
        limited_retries=0, deadline=deadline,
    )
    while True:
        retrier.check_deadline()
        try:
            result = fn()
        except exceptions as exc:
            delay = retrier.next_delay(
                kind=RETRY, reason=_describe(exc), retry_after=_retry_after_seconds(exc)
            )
            if delay is None:
                raise
            time.sleep(delay)
            continue

        if retry_if_result is not None and retry_if_result(result):
            delay = retrier.next_delay(
                kind=RETRY,
                reason=f"retryable response status={getattr(result, 'status_code', '?')}",
                retry_after=_retry_after_seconds(result),
            )
            if delay is None:
                return result
            time.sleep(delay)
            continue
        return result
