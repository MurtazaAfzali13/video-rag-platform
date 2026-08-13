

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
    httpx.ReadTimeout,)

HTTP_RETRYABLE_EXCEPTIONS = (
    httpx.TransportError,
    ConnectionError,
    TimeoutError,)

def invoke_with_retry(
    chain: Any,
    inputs: dict,
    *,
    max_attempts: int = 4,
    min_wait: float = 1.0,
    max_wait: float = 20.0,
) -> Any:
    @retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential_jitter(initial=min_wait, max=max_wait),
        retry=retry_if_exception_type(LLM_RETRYABLE_EXCEPTIONS),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,)
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
