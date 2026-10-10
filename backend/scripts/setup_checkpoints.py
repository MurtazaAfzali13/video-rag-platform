"""One-off: create LangGraph checkpoint tables.   python -m scripts.setup_checkpoints

Needs SUPABASE_DB_URL pointing at the `langgraph_app` role (see checkpoint_schema.sql).
Safe to re-run: the saver's migrations are idempotent.
"""
import asyncio
import logging

from app.graph.checkpointing import init_checkpointer, close_checkpointer

logging.basicConfig(level=logging.INFO)


async def main() -> None:
    saver = await init_checkpointer(auto_setup=True)
    if saver is None:
        raise SystemExit("Setup failed — see the log above.")
    await close_checkpointer(saver)
    print("Checkpoint tables are ready.")


if __name__ == "__main__":
    asyncio.run(main())
