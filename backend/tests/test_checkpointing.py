"""Integration tests against a real Postgres. Set TEST_DATABASE_URL to run, e.g.
   postgresql://langgraph_app:pw2@localhost:5432/postgres
"""
import asyncio
import json
import os
import time
import uuid
from typing import Annotated, Optional, TypedDict

import psycopg
import pytest
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.graph import checkpointing as cp

URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")


class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    query: str
    chat_history: list
    documents: Optional[list]
    response: Optional[str]
    other_time_ms: int


def build_graph(saver, counters, fail_once=None):
    def retriever(state):
        counters["retriever"] += 1
        return {"documents": [{"page_content": "transcript text " * 50, "start_time": 12.5}]}

    def validator(state):
        counters["validator"] += 1
        if fail_once is not None and fail_once["on"]:
            fail_once["on"] = False
            raise RuntimeError("LLM provider outage")
        return {"other_time_ms": 7}

    def generator(state):
        counters["generator"] += 1
        return {"response": json.dumps({"docs": len(state["documents"])})}

    g = StateGraph(State)
    g.add_node("retriever", retriever)
    g.add_node("validator", validator)
    g.add_node("generator", generator)
    g.set_entry_point("retriever")
    g.add_edge("retriever", "validator")
    g.add_edge("validator", "generator")
    g.add_edge("generator", END)
    return g.compile(checkpointer=saver)


def initial_state(q="what is x?"):
    return {
        "messages": [HumanMessage(content=q)], "query": q,
        "chat_history": [HumanMessage(content="hi"), AIMessage(content="hello")],
        "documents": None, "response": None, "other_time_ms": 0,
    }


def run_with_saver(coro_fn):
    """Open pool -> run coroutine -> close pool, all inside ONE event loop (a psycopg pool is
    bound to the loop that opened it, exactly like in FastAPI's lifespan)."""
    async def main():
        saver = await cp.init_checkpointer(URL, auto_setup=True)
        assert saver is not None
        try:
            return await coro_fn(saver)
        finally:
            await cp.close_checkpointer(saver)
    return asyncio.run(main())


def test_tables_live_in_dedicated_schema_not_public():
    async def go(saver):
        return True
    run_with_saver(go)
    with psycopg.connect(URL) as c:
        rows = c.execute(
            "select table_schema, table_name from information_schema.tables "
            "where table_name in ('checkpoints','checkpoint_blobs','checkpoint_writes')"
        ).fetchall()
    assert rows and {r[0] for r in rows} == {"langgraph"}


def test_run_persists_state_and_deserialises_messages():
    async def go(saver):
        counters = {"retriever": 0, "validator": 0, "generator": 0}
        graph = build_graph(saver, counters)
        cfg = cp.build_run_config(chat_id=str(uuid.uuid4()), run_id="r1", user_id="u1")
        out = await graph.ainvoke(initial_state(), cfg, durability=cp.CHAT_DURABILITY)
        snap = await graph.aget_state(cfg)
        return out, snap, cfg

    out, snap, cfg = run_with_saver(go)
    assert json.loads(out["response"]) == {"docs": 1}
    vals = snap.values
    assert isinstance(vals["messages"][0], HumanMessage)            # restricted deserialiser accepts LC messages
    assert isinstance(vals["chat_history"][1], AIMessage)
    assert vals["documents"][0]["start_time"] == 12.5
    assert snap.metadata["chat_id"] == cfg["metadata"]["chat_id"]  # our metadata is stored with the checkpoint


def test_exit_durability_writes_fewer_rows_than_sync():
    async def go(saver):
        counters = {"retriever": 0, "validator": 0, "generator": 0}
        graph = build_graph(saver, counters)
        cfg = cp.build_run_config(chat_id=str(uuid.uuid4()), run_id="r2", user_id="u1")
        await graph.ainvoke(initial_state(), cfg, durability="exit")
        cfg2 = cp.build_run_config(chat_id=str(uuid.uuid4()), run_id="r3", user_id="u1")
        await graph.ainvoke(initial_state(), cfg2, durability="sync")
        return (cp.make_thread_id(cfg["metadata"]["chat_id"], "r2"),
                cp.make_thread_id(cfg2["metadata"]["chat_id"], "r3"))

    t_exit, t_sync = run_with_saver(go)
    with psycopg.connect(URL) as c:
        n_exit = c.execute("select count(*) from checkpoints where thread_id=%s", (t_exit,)).fetchone()[0]
        n_sync = c.execute("select count(*) from checkpoints where thread_id=%s", (t_sync,)).fetchone()[0]
    print(f"checkpoint rows per run: exit={n_exit} sync={n_sync}")
    assert n_exit < n_sync


def test_resume_after_failure_does_not_redo_finished_nodes():
    async def go(saver):
        counters = {"retriever": 0, "validator": 0, "generator": 0}
        flag = {"on": True}
        graph = build_graph(saver, counters, fail_once=flag)
        cfg = cp.build_run_config(chat_id=str(uuid.uuid4()), run_id="r4", user_id="u1")
        with pytest.raises(RuntimeError):
            await graph.ainvoke(initial_state(), cfg, durability="exit")
        before = dict(counters)
        out = await graph.ainvoke(None, cfg, durability="exit")      # resume the same run
        return before, dict(counters), out

    before, after, out = run_with_saver(go)
    assert before == {"retriever": 1, "validator": 1, "generator": 0}
    assert after == {"retriever": 1, "validator": 2, "generator": 1}   # retriever was NOT re-run
    assert json.loads(out["response"]) == {"docs": 1}


def test_astream_events_with_config_like_chats_py():
    async def go(saver):
        counters = {"retriever": 0, "validator": 0, "generator": 0}
        graph = build_graph(saver, counters)
        cfg = cp.build_run_config(chat_id=str(uuid.uuid4()), run_id="r5", user_id="u1")
        progress, final = [], {}
        async for ev in graph.astream_events(initial_state(), cfg, version="v2", durability="exit"):
            if ev["event"] == "on_chain_start" and ev["name"] in ("retriever", "validator", "generator"):
                progress.append(ev["name"])
            elif ev["event"] == "on_chain_end" and ev["name"] == "LangGraph":
                final = ev["data"].get("output") or {}
        return progress, final

    progress, final = run_with_saver(go)
    assert progress == ["retriever", "validator", "generator"]
    assert json.loads(final["response"]) == {"docs": 1}


def test_purge_chat_and_cleanup_old_runs():
    async def go(saver):
        counters = {"retriever": 0, "validator": 0, "generator": 0}
        graph = build_graph(saver, counters)
        chat_a, chat_b = str(uuid.uuid4()), str(uuid.uuid4())
        for chat, run in ((chat_a, "a1"), (chat_a, "a2"), (chat_b, "b1")):
            await graph.ainvoke(initial_state(), cp.build_run_config(chat_id=chat, run_id=run, user_id="u"), durability="sync")
        removed = await cp.purge_chat_checkpoints(saver, chat_a)
        return chat_a, chat_b, removed

    chat_a, chat_b, removed = run_with_saver(go)
    assert removed > 0
    with psycopg.connect(URL) as c:
        left_a = c.execute("select count(*) from checkpoints where thread_id like %s", (chat_a + ":%",)).fetchone()[0]
        left_b = c.execute("select count(*) from checkpoints where thread_id like %s", (chat_b + ":%",)).fetchone()[0]
        assert left_a == 0 and left_b > 0
        c.execute("update checkpoints set checkpoint = jsonb_set(checkpoint,'{ts}', to_jsonb((now() - interval '10 days')::text)) where thread_id like %s", (chat_b + ":%",))
        c.commit()
        deleted = c.execute("select langgraph.cleanup_old_runs(interval '3 days')").fetchone()[0]
        c.commit()
        left_b2 = c.execute("select count(*) from checkpoints where thread_id like %s", (chat_b + ":%",)).fetchone()[0]
        blobs_b = c.execute("select count(*) from checkpoint_blobs where thread_id like %s", (chat_b + ":%",)).fetchone()[0]
    assert deleted > 0 and left_b2 == 0 and blobs_b == 0


def test_fresh_runs_survive_retention_cleanup():
    async def go(saver):
        counters = {"retriever": 0, "validator": 0, "generator": 0}
        graph = build_graph(saver, counters)
        chat = str(uuid.uuid4())
        await graph.ainvoke(initial_state(), cp.build_run_config(chat_id=chat, run_id="x", user_id="u"), durability="exit")
        return chat
    chat = run_with_saver(go)
    with psycopg.connect(URL) as c:
        c.execute("select langgraph.cleanup_old_runs(interval '3 days')"); c.commit()
        n = c.execute("select count(*) from checkpoints where thread_id like %s", (chat + ":%",)).fetchone()[0]
    assert n > 0


def test_breaker_opens_and_half_opens():
    b = cp.CircuitBreaker(threshold=3, cooldown_s=0.2)
    for _ in range(3):
        assert b.allow(); b.failure()
    assert not b.allow()
    time.sleep(0.25)
    assert b.allow()          # half-open
    b.failure()
    assert not b.allow()      # a single failure re-opens
    time.sleep(0.25); assert b.allow(); b.success(); b.failure(); assert b.allow()


def test_db_failure_never_breaks_the_run_and_breaker_opens(monkeypatch):
    async def boom(*a, **k):
        await asyncio.sleep(0.01)
        raise ConnectionError("db down")

    async def go(saver):
        monkeypatch.setattr(AsyncPostgresSaver, "aput", boom)
        monkeypatch.setattr(AsyncPostgresSaver, "aput_writes", boom)
        monkeypatch.setattr(AsyncPostgresSaver, "aget_tuple", boom)
        counters = {"retriever": 0, "validator": 0, "generator": 0}
        graph = build_graph(saver, counters)
        outs = []
        for i in range(3):
            cfg = cp.build_run_config(chat_id=str(uuid.uuid4()), run_id=f"f{i}", user_id="u")
            outs.append(await graph.ainvoke(initial_state(), cfg, durability="sync"))
        return outs, saver.breaker.allow()

    outs, allowed = run_with_saver(go)
    assert all(json.loads(o["response"]) == {"docs": 1} for o in outs)   # user requests still succeed
    assert allowed is False                                                # breaker is open


def test_hanging_db_is_bounded_by_timeout(monkeypatch):
    async def hang(*a, **k):
        await asyncio.sleep(30)

    async def go(saver):
        monkeypatch.setattr(AsyncPostgresSaver, "aput", hang)
        saver._op_timeout_s = 0.2
        t0 = time.monotonic()
        counters = {"retriever": 0, "validator": 0, "generator": 0}
        graph = build_graph(saver, counters)
        cfg = cp.build_run_config(chat_id=str(uuid.uuid4()), run_id="h", user_id="u")
        out = await graph.ainvoke(initial_state(), cfg, durability="exit")
        return time.monotonic() - t0, out

    elapsed, out = run_with_saver(go)
    assert json.loads(out["response"]) == {"docs": 1}
    assert elapsed < 3.0


def test_disabled_when_url_missing(monkeypatch):
    monkeypatch.delenv("SUPABASE_DB_URL", raising=False)
    assert asyncio.run(cp.init_checkpointer(None)) is None


def test_disabled_when_unreachable():
    assert asyncio.run(cp.init_checkpointer("postgresql://x:y@127.0.0.1:1/postgres?connect_timeout=2")) is None
