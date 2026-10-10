"""Run with:  pytest -q tests/test_retry_utils.py   (module path: app.graph.retry_utils)"""
import asyncio
import time

import httpx
import openai
import pytest
from langchain_core.exceptions import OutputParserException

from app.graph import retry_utils as ru


# ── helpers ────────────────────────────────────────────────────────────────
def _resp(status, headers=None):
    return httpx.Response(status, headers=headers or {}, request=httpx.Request("POST", "https://x.test/v1"))


def _status_err(cls, status, headers=None, body=None):
    return cls("boom", response=_resp(status, headers), body=body)


class FakeChain:
    """Raises/returns items from a script, one per call."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def _next(self):
        self.calls += 1
        item = self.script.pop(0)
        if isinstance(item, BaseException):
            raise item
        return item

    def invoke(self, _inputs):
        return self._next()

    async def ainvoke(self, _inputs):
        return self._next()


@pytest.fixture(autouse=True)
def fast_time(monkeypatch):
    sleeps = []
    monkeypatch.setattr(ru.time, "sleep", lambda s: sleeps.append(s))
    monkeypatch.setattr(ru.random, "random", lambda: 0.0)  # delay == base/2, deterministic
    return sleeps


# ── classification ─────────────────────────────────────────────────────────
@pytest.mark.parametrize("status", [400, 401, 402, 403, 404, 422])
def test_client_errors_are_fatal(status):
    cls = {400: openai.BadRequestError, 401: openai.AuthenticationError, 403: openai.PermissionDeniedError,
           404: openai.NotFoundError, 422: openai.UnprocessableEntityError}.get(status, openai.APIStatusError)
    chain = FakeChain([_status_err(cls, status)])
    with pytest.raises(openai.APIStatusError):
        ru.invoke_with_retry(chain, {})
    assert chain.calls == 1  # previously retried 4x because APIError was in the retry list


def test_rate_limit_retried_then_succeeds(fast_time):
    chain = FakeChain([_status_err(openai.RateLimitError, 429), "ok"])
    assert ru.invoke_with_retry(chain, {}) == "ok"
    assert chain.calls == 2 and len(fast_time) == 1


def test_insufficient_quota_is_fatal():
    err = _status_err(openai.RateLimitError, 429, body={"code": "insufficient_quota"})
    chain = FakeChain([err])
    with pytest.raises(openai.RateLimitError):
        ru.invoke_with_retry(chain, {})
    assert chain.calls == 1


def test_5xx_exhausts_attempts_and_reraises_original():
    errs = [_status_err(openai.InternalServerError, 503) for _ in range(4)]
    chain = FakeChain(errs)
    with pytest.raises(openai.InternalServerError):
        ru.invoke_with_retry(chain, {}, max_attempts=4)
    assert chain.calls == 4


def test_connection_and_timeout_are_retried():
    req = httpx.Request("POST", "https://x.test")
    chain = FakeChain([openai.APITimeoutError(request=req), openai.APIConnectionError(request=req), "ok"])
    assert ru.invoke_with_retry(chain, {}) == "ok"
    assert chain.calls == 3


def test_parse_errors_get_one_extra_try_only():
    chain = FakeChain([OutputParserException("bad json"), OutputParserException("bad json"), "never"])
    with pytest.raises(OutputParserException):
        ru.invoke_with_retry(chain, {})
    assert chain.calls == 2  # 1 original + limited_retries(1)


def test_none_result_is_treated_as_failure_then_recovers():
    chain = FakeChain([None, "answer"])
    assert ru.invoke_with_retry(chain, {}) == "answer"
    assert chain.calls == 2


def test_none_result_passes_through_when_allowed():
    assert ru.invoke_with_retry(FakeChain([None]), {}, reject_none=False) is None


def test_unknown_exception_is_fatal():
    chain = FakeChain([KeyError("x")])
    with pytest.raises(KeyError):
        ru.invoke_with_retry(chain, {})
    assert chain.calls == 1


# ── Retry-After ────────────────────────────────────────────────────────────
def test_retry_after_is_honoured(fast_time):
    chain = FakeChain([_status_err(openai.RateLimitError, 429, {"retry-after": "7"}), "ok"])
    ru.invoke_with_retry(chain, {}, max_wait=20)
    assert fast_time == [7.0]


def test_retry_after_ms_header(fast_time):
    chain = FakeChain([_status_err(openai.RateLimitError, 429, {"retry-after-ms": "3500"}), "ok"])
    ru.invoke_with_retry(chain, {}, max_wait=20)
    assert fast_time == [3.5]


def test_retry_after_longer_than_max_wait_fails_fast():
    chain = FakeChain([_status_err(openai.RateLimitError, 429, {"retry-after": "120"}), "ok"])
    with pytest.raises(openai.RateLimitError):
        ru.invoke_with_retry(chain, {}, max_wait=20)
    assert chain.calls == 1


# ── backoff ────────────────────────────────────────────────────────────────
def test_backoff_grows_and_is_capped(fast_time):
    errs = [_status_err(openai.InternalServerError, 500) for _ in range(5)] + ["ok"]
    ru.invoke_with_retry(FakeChain(errs), {}, max_attempts=6, min_wait=1.0, max_wait=4.0)
    # base = 1,2,4,4,4 ; random()==0 -> delay == base/2
    assert fast_time == [0.5, 1.0, 2.0, 2.0, 2.0]


# ── deadline ───────────────────────────────────────────────────────────────
def test_expired_deadline_never_calls_the_chain():
    chain = FakeChain(["never"])
    with pytest.raises(ru.DeadlineExceededError):
        ru.invoke_with_retry(chain, {}, deadline=time.monotonic() - 1)
    assert chain.calls == 0


def test_sleep_that_would_cross_deadline_gives_up_with_original_error():
    chain = FakeChain([_status_err(openai.InternalServerError, 500), "ok"])
    with pytest.raises(openai.InternalServerError):
        ru.invoke_with_retry(chain, {}, min_wait=5.0, deadline=time.monotonic() + 0.5)
    assert chain.calls == 1


# ── call_with_retry (HTTP) ─────────────────────────────────────────────────
def test_http_exception_retry():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] < 3:
            raise httpx.ConnectError("down")
        return "ok"

    assert ru.call_with_retry(fn, max_attempts=3) == "ok"


def test_http_status_retry_and_final_response_returned():
    seq = [_resp(503), _resp(503), _resp(200)]
    out = ru.call_with_retry(lambda: seq.pop(0), retry_if_result=lambda r: ru.should_retry_http_response("GET", r))
    assert out.status_code == 200

    seq = [_resp(503)] * 3
    out = ru.call_with_retry(lambda: seq.pop(0), max_attempts=3,
                             retry_if_result=lambda r: ru.should_retry_http_response("GET", r))
    assert out.status_code == 503  # returned, caller handles it


def test_http_status_matrix():
    f = ru.should_retry_http_response
    assert f("POST", _resp(429)) and f("POST", _resp(503))
    assert not f("POST", _resp(502)) and not f("POST", _resp(504))   # POST may have been processed
    assert f("GET", _resp(502)) and f("PATCH", _resp(504))
    assert not f("GET", _resp(400)) and not f("GET", _resp(404)) and not f("GET", _resp(200))


def test_requests_library_errors_are_retryable():
    requests = pytest.importorskip("requests")
    assert requests.exceptions.ConnectionError in ru.HTTP_RETRYABLE_EXCEPTIONS
    assert requests.exceptions.Timeout in ru.HTTP_RETRYABLE_EXCEPTIONS


def test_non_retryable_exception_in_http_call_propagates():
    def fn():
        raise ValueError("bug")

    with pytest.raises(ValueError):
        ru.call_with_retry(fn)


# ── async ──────────────────────────────────────────────────────────────────
def test_async_retry(monkeypatch):
    slept = []

    async def fake_sleep(s):
        slept.append(s)

    monkeypatch.setattr(ru.asyncio, "sleep", fake_sleep)
    chain = FakeChain([_status_err(openai.RateLimitError, 429), "ok"])
    assert asyncio.run(ru.ainvoke_with_retry(chain, {})) == "ok"
    assert chain.calls == 2 and len(slept) == 1


def test_async_fatal_not_retried():
    chain = FakeChain([_status_err(openai.BadRequestError, 400)])
    with pytest.raises(openai.BadRequestError):
        asyncio.run(ru.ainvoke_with_retry(chain, {}))
    assert chain.calls == 1
