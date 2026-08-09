# app/graph/retry_utils.py
"""
Centralized resiliency layer for external API calls (OpenRouter LLM calls via
langchain-openai, and the Tavily search tool).

Design decision: we do NOT rely solely on ChatOpenAI's built-in `max_retries`,
because it retries silently with no logging/backoff visibility and treats every
node's LLM call identically. Instead:
  - `get_llm()` in chains.py sets `max_retries=0` on the client itself.
  - Every chain invocation in nodes.py goes through `invoke_with_retry`, which
    gives us structured logging, exponential backoff with jitter, and a single
    place to tune retry policy for the whole thesis pipeline.

This replaces the previous "silent fail -> empty list / raise 500" behavior in
web_search_node and every chain.invoke() call in nodes.py.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, TypeVar

import httpx
from openai import APIConnectionError, APIError, APITimeoutError, RateLimitError
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Exceptions considered transient / worth retrying for LLM calls.
LLM_RETRYABLE_EXCEPTIONS = (
    RateLimitError,
    APITimeoutError,
    APIConnectionError,
    APIError,
    httpx.TimeoutException,
    httpx.ConnectError,
    httpx.ReadTimeout,
)


HTTP_RETRYABLE_EXCEPTIONS = (
    httpx.TransportError,
    ConnectionError,
    TimeoutError,
)


def invoke_with_retry(
    chain: Any,
    inputs: dict,
    *,
    max_attempts: int = 4,
    min_wait: float = 1.0,
    max_wait: float = 20.0,
) -> Any:
    """Run `chain.invoke(inputs)` with exponential backoff + jitter.

    Use this for every LangChain LCEL chain call in nodes.py (supervisor,
    validator, generator, summary, contextualize, chapters). Raises the last
    exception if all attempts are exhausted, so the caller's existing
    try/except (which maps to HTTP 500/503) still works correctly.
    """

    @retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential_jitter(initial=min_wait, max=max_wait),
        retry=retry_if_exception_type(LLM_RETRYABLE_EXCEPTIONS),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    def _call() -> Any:
        return chain.invoke(inputs)

    return _call()


async def ainvoke_with_retry(
    chain: Any,
    inputs: dict,
    *,
    max_attempts: int = 4,
    min_wait: float = 1.0,
    max_wait: float = 20.0,
) -> Any:
    """Async twin of invoke_with_retry, for use with chain.ainvoke() / graph.ainvoke()."""

    @retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential_jitter(initial=min_wait, max=max_wait),
        retry=retry_if_exception_type(LLM_RETRYABLE_EXCEPTIONS),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def _call() -> Any:
        return await chain.ainvoke(inputs)

    return await _call()


def call_with_retry(
    fn: Callable[[], T],
    *,
    max_attempts: int = 3,
    min_wait: float = 1.0,
    max_wait: float = 10.0,
    exceptions: tuple = HTTP_RETRYABLE_EXCEPTIONS,
) -> T:
    """Generic retry wrapper for arbitrary sync callables (e.g. Tavily's `.invoke`).

    Unlike the old code, exhausting retries here RAISES instead of returning an
    empty list — the caller decides how to degrade gracefully (and logs why).
    """

    @retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential_jitter(initial=min_wait, max=max_wait),
        retry=retry_if_exception_type(exceptions),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    def _call() -> T:
        return fn()

    return _call()
