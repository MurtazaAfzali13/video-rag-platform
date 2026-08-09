"""
evaluation/ragas_eval.py

Quantitative evaluation of the CRAG pipeline
(contextualize -> supervisor -> retriever -> reranker -> validator ->
[web_search] -> generator) against a Naive RAG baseline
(retriever -> generator; no rewriting, no reranking, no corrective fallback),
using the RAGAS framework.

Methodology-chapter framing:
- faithfulness       -> does CRAG's validator+web-fallback measurably reduce
                         hallucination vs. naive RAG blindly trusting top-k?
- context_precision   -> does reranker_node measurably raise the signal/noise
                         ratio of the context actually fed to the generator?
- context_recall      -> does the wider k=8 candidate pool + rerank lose any
                         ground-truth-relevant context compared to naive top-k?
- answer_relevancy    -> does query rewriting (contextualize_node) improve how
                         directly the final answer addresses the actual intent,
                         especially for follow-up questions?

Run:
    python -m evaluation.ragas_eval

Prerequisites:
    pip install ragas datasets
    A fixed, already-ingested set of videos (namespace = a dedicated eval
    user_id) with a hand-labeled question/ground_truth set below.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

RESULTS_DIR = Path(__file__).resolve().parent

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)

from app.graph.workflow import get_agent_graph
from app.graph.nodes import retriever_node, generate_answer_node
from app.graph.state import AgentState


# ============================================================================
# 1) Fixed evaluation set
# ============================================================================
# Populate this from a handful of ALREADY-INGESTED videos in a dedicated eval
# user namespace. Each item needs a human-written ground_truth answer.
# For thesis rigor: include at least a few multi-turn (follow-up) items to
# specifically demonstrate the contextualize_node's effect.

@dataclass
class EvalItem:
    question: str
    ground_truth: str
    user_id: str
    video_id: str
    # Optional prior turn, to test the contextualize_node's follow-up handling.
    prior_question: str | None = None
    prior_answer: str | None = None


EVAL_SET: list[EvalItem] = [
    EvalItem(
        question="در این ویدیو نویسنده چه راهکاری برای مدیریت state در LangGraph پیشنهاد می‌دهد؟",
        ground_truth="...(پاسخ مرجع دستی، بر اساس ترنسکریپت واقعی ویدیو)...",
        user_id="eval-user-1",
        video_id="VIDEO_ID_1",
    ),
    # ... add 15-30 items total for a statistically meaningful RAGAS run.
]


# ============================================================================
# 2) Pipeline runners
# ============================================================================

def _base_state(item: EvalItem, *, standalone_query: Optional[str], chat_history: list) -> AgentState:
    return {
        "messages": [],
        "query": item.question,
        "standalone_query": standalone_query,
        "chat_history": chat_history,
        "user_id": item.user_id,
        "video_id": item.video_id,
        "search_scope": "single_video",
        "next_node": None,
        "documents": None,
        "retrieved_video_ids": None,
        "response": None,
        "retriever_time_ms": 0,
        "reranker_time_ms": 0,
        "validator_time_ms": 0,
        "generator_time_ms": 0,
        "web_search_time_ms": 0,
        "other_time_ms": 0,
    }


def _extract_contexts(documents: list[dict]) -> list[str]:
    return [d["page_content"] for d in documents]


async def run_crag(item: EvalItem) -> dict[str, Any]:
    """Full proposed pipeline, exactly as served in production."""
    from langchain_core.messages import HumanMessage, AIMessage

    chat_history = []
    if item.prior_question and item.prior_answer:
        chat_history = [HumanMessage(content=item.prior_question), AIMessage(content=item.prior_answer)]

    graph = get_agent_graph()
    state = _base_state(item, standalone_query=None, chat_history=chat_history)  # let contextualize_node run
    state["query"] = item.question

    result = await graph.ainvoke(state)

    contexts = _extract_contexts(result.get("documents") or [])
    try:
        answer = json.loads(result["response"]).get("answer", result["response"])
    except (json.JSONDecodeError, TypeError):
        answer = result.get("response", "")

    return {"answer": answer, "contexts": contexts or [""]}


async def run_naive_rag(item: EvalItem) -> dict[str, Any]:
    """Baseline: raw query straight to retriever (k=4, no rerank) -> generator
    directly (no validator, no web-search corrective step).
    """
    state = _base_state(item, standalone_query=item.question, chat_history=[])

    retrieved = await asyncio.to_thread(retriever_node, state)
    state.update(retrieved)

    generated = await asyncio.to_thread(generate_answer_node, state)

    contexts = _extract_contexts(state.get("documents") or [])
    try:
        answer = json.loads(generated["response"]).get("answer", generated["response"])
    except (json.JSONDecodeError, TypeError):
        answer = generated.get("response", "")

    return {"answer": answer, "contexts": contexts or [""]}


# ============================================================================
# 3) Dataset construction + RAGAS evaluation
# ============================================================================

async def _build_dataset(pipeline_fn) -> Dataset:
    rows = []
    for item in EVAL_SET:
        out = await pipeline_fn(item)
        rows.append(
            {
                "question": item.question,
                "answer": out["answer"],
                "contexts": out["contexts"],
                "ground_truth": item.ground_truth,
            }
        )
    return Dataset.from_list(rows)


async def main() -> None:
    print(f"Running evaluation over {len(EVAL_SET)} items...")

    crag_ds = await _build_dataset(run_crag)
    naive_ds = await _build_dataset(run_naive_rag)

    metrics = [faithfulness, context_precision, context_recall, answer_relevancy]

    print("\n=== Evaluating CRAG (proposed) ===")
    crag_scores = evaluate(crag_ds, metrics=metrics)

    print("\n=== Evaluating Naive RAG (baseline) ===")
    naive_scores = evaluate(naive_ds, metrics=metrics)

    print("\n--- RESULTS ---")
    print("CRAG:      ", crag_scores)
    print("Naive RAG: ", naive_scores)

    crag_scores.to_pandas().to_csv(RESULTS_DIR / "results_crag.csv", index=False)
    naive_scores.to_pandas().to_csv(RESULTS_DIR / "results_naive.csv", index=False)
    print(f"\nSaved: {RESULTS_DIR / 'results_crag.csv'}, {RESULTS_DIR / 'results_naive.csv'}")
    print("Use these two CSVs directly as the comparison table in your methodology chapter.")


if __name__ == "__main__":
    asyncio.run(main())
