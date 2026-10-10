# app/graph/nodes.py
import json
import logging
import math
import re
import time
from typing import Any

from langchain_pinecone import PineconeVectorStore
from langchain_community.tools.tavily_search import TavilySearchResults

from app.config import get_settings
from app.graph.state import (
    AgentState,
    FinalAnswerSchema,
    VideoSummarySchema,
    RouteDecision,
    GradeDocuments,
    ContextualizedQuery,
    RerankResult,
)
from app.ingestion import _get_embeddings, format_ts
from app.parent_store import ParentStoreError, fetch_parents, fetch_video_parents, make_parent_id
from app.video_registry import SHARED_NAMESPACE, list_user_video_ids, user_has_video

from app.graph.chains import (
    create_contextualize_chain,
    create_supervisor_chain,
    create_validator_chain,
    create_generator_chain,
    create_summary_chain,
    create_rerank_chain,
)
from app.graph.retry_utils import invoke_with_retry, call_with_retry, HTTP_RETRYABLE_EXCEPTIONS

logger = logging.getLogger(__name__)


CHILD_K_SINGLE_VIDEO = 24        # small chunks are cheap -> over-retrieve, rerank later
CHILD_K_GENERAL = 40
MAX_RERANK_TOP_N = 8             # child chunks kept after reranking
MAX_PARENTS_SINGLE_VIDEO = 4     # parents (~2300 chars each) handed to validator/generator
MAX_PARENTS_GENERAL = 5
STITCH_LINES = 2                 # lines borrowed from a neighbouring parent on edge hits
SOURCE_SNAP_TOLERANCE_S = 15     # max distance between a cited time and a real marker
MAX_VIDEO_SOURCES = 8            # cap on source cards shown for one answer
SUMMARY_CONTEXT_MAX_CHARS = 60_000
DEFAULT_RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

_MARKER_RE = re.compile(r"^\[(\d+):(\d{2})\]\s*(.*)$", re.MULTILINE)


def _resolved_query(state: AgentState) -> str:
    return state.get("standalone_query") or state["query"]


def _get_vector_store() -> PineconeVectorStore:
    """Shared namespace for all users; per-user isolation is done by a metadata filter."""
    settings = get_settings()
    return PineconeVectorStore(
        index_name=settings.index_name,
        embedding=_get_embeddings(),
        pinecone_api_key=settings.pinecone_api_key,
        namespace=SHARED_NAMESPACE,
    )


def _shorten(text: str, limit: int = 120) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


def _markers(content: str) -> list[tuple[int, str]]:
    """[(seconds, line_text), ...] for every '[MM:SS] text' line in a passage."""
    return [(int(m) * 60 + int(s), text) for m, s, text in _MARKER_RE.findall(content or "")]


def _fetch_video_context_legacy(video_id: str, query: str, *, k: int = 8) -> str:
    """Fallback for videos ingested BEFORE Small-to-Big (no parent rows)."""
    retriever = _get_vector_store().as_retriever(
        search_kwargs={"filter": {"video_id": {"$eq": video_id}}, "k": k}
    )
    parts = []
    for doc in retriever.invoke(query):
        parts.append(f"[{format_ts(doc.metadata.get('start_time', 0))}] {doc.page_content}")
    return "\n\n".join(parts)


def _fetch_video_context(
    user_id: str,
    video_id: str,
    query: str,
    *,
    max_chars: int = SUMMARY_CONTEXT_MAX_CHARS,
) -> str:
    """Whole-video context for summaries: ordered transcript, NOT a similarity top-k.

    A summary must cover the entire video; top-k search only sees the parts that
    happen to match the query words. If the transcript is too long, lines are
    sampled evenly across the video instead of cutting the tail.
    """
    if not user_has_video(user_id, video_id):
        raise PermissionError(f"Video {video_id} is not linked to this user.")

    try:
        parents = fetch_video_parents(video_id)
    except ParentStoreError as exc:
        logger.warning("Summary: parent store unavailable (%s); using similarity fallback.", exc)
        parents = []

    if not parents:
        return _fetch_video_context_legacy(video_id, query)

    lines = [ln for p in parents for ln in p["content"].split("\n") if ln.strip()]
    total = sum(len(ln) + 1 for ln in lines)
    if total > max_chars:
        lines = lines[:: math.ceil(total / max_chars)]
    return "\n".join(lines)


#  Helper node to Optimized user query with chat historey
def contextualize_node(state: AgentState) -> dict[str, Any]:
    logger.info("Entering Contextualize Node...")
    start = time.time()
    query = state["query"]
    chat_history = state.get("chat_history", [])

    if not chat_history:
        return {"standalone_query": query, "other_time_ms": state.get("other_time_ms", 0)}

    chain = create_contextualize_chain()
    try:
        result: ContextualizedQuery = invoke_with_retry(
            chain, {"chat_history": chat_history, "query": query} )
        logger.info(
            "Contextualize: follow_up=%s | raw=%r -> standalone=%r",
            result.is_follow_up,
            query,
            result.standalone_query,)
        standalone = result.standalone_query or query
    except Exception as exc:
        logger.warning("Contextualize chain failed after retries, falling back to raw query: %s", exc)
        standalone = query

    elapsed_ms = int((time.time() - start) * 1000)
    return {
        "standalone_query": standalone,
        "other_time_ms": state.get("other_time_ms", 0) + elapsed_ms,}

# Analyze the user question and UI content to specify the next node 
def supervisor_node(state: AgentState) -> dict[str, Any]:
    logger.info("Entering Supervisor Agent...")
    query = _resolved_query(state)
    search_scope = state.get("search_scope", "single_video")

    router_chain = create_supervisor_chain()

    decision: RouteDecision = invoke_with_retry(
        router_chain, {"query": query, "search_scope": search_scope}    )

    logger.info(f"Supervisor Decision: {decision.intent} | Reason: {decision.reasoning}")
    return {"next_node": decision.intent}

# Retrieve CHILD chunks (small, precise) from Pinecone
def retriever_node(state: AgentState) -> dict[str, Any]:
    logger.info("Entering Retriever Node...")
    start_time = time.time()
    user_id = state["user_id"]
    video_id = state["video_id"]
    query = _resolved_query(state)
    search_scope = state.get("search_scope", "single_video")
    vector_store = _get_vector_store()

    # ACCESS CONTROL: the Pinecone namespace is shared, so isolation is enforced here.
    # Fail-closed: if the lookup raises, the request fails instead of leaking data.
    allowed = list_user_video_ids(user_id)

    def _empty() -> dict[str, Any]:
        return {"documents": [], "retriever_time_ms": int((time.time() - start_time) * 1000)}

    if search_scope == "single_video" and video_id:
        if video_id not in allowed:
            logger.warning("User %s requested video %s without access", user_id, video_id)
            return _empty()
        logger.info(f"Searching strictly inside video: {video_id}")
        metadata_filter = {"video_id": {"$eq": video_id}}
        k = CHILD_K_SINGLE_VIDEO
    else:
        if not allowed:
            return _empty()
        logger.info("Searching across ALL of the user's videos (General Scope)")
        metadata_filter = {"video_id": {"$in": allowed}}
        k = CHILD_K_GENERAL

    results = vector_store.similarity_search_with_score(query, k=k, filter=metadata_filter)

    def _int(value: Any) -> int | None:
        return int(value) if value is not None else None

    children = []
    for doc, score in results:
        m = doc.metadata
        children.append(
            {
                "page_content": doc.page_content,
                "video_id": m.get("video_id", "Unknown"),
                "title": m.get("title") or m.get("video_title") or "Unknown Title",
                "start_time": float(m.get("start_time", 0) or 0),
                "end_time": float(m.get("end_time", 0) or 0),
                # Small-to-Big linkage (absent on videos ingested with the old pipeline)
                "parent_id": m.get("parent_id"),
                "parent_idx": _int(m.get("parent_idx")),
                "parent_count": _int(m.get("parent_count")),
                "child_pos": _int(m.get("child_pos")),
                "child_count": _int(m.get("child_count")),
                "vector_score": float(score),
                "source_type": "video",
            }
        )

    elapsed_ms = int((time.time() - start_time) * 1000)
    logger.info("Retriever: %d child chunks", len(children))
    return {"documents": children, "retriever_time_ms": elapsed_ms}


_cross_encoder = None
_cross_encoder_load_failed = False


def _get_cross_encoder():
    global _cross_encoder, _cross_encoder_load_failed
    if _cross_encoder is not None or _cross_encoder_load_failed:
        return _cross_encoder
    try:
        from sentence_transformers import CrossEncoder

        model_name = getattr(get_settings(), "reranker_model", None) or DEFAULT_RERANKER_MODEL
        _cross_encoder = CrossEncoder(model_name)
        logger.info("Reranker: loaded local cross-encoder %s", model_name)
    except Exception as exc:
        logger.warning(
            "Reranker: sentence-transformers cross-encoder unavailable (%s). "
            "Falling back to LLM-based reranking.",
            exc,
        )
        _cross_encoder_load_failed = True
        _cross_encoder = None
    return _cross_encoder


def _rerank_with_llm(query: str, documents: list[dict]) -> list[float]:
    numbered_chunks = "\n\n".join(
        f"[{i}] {d['page_content']}" for i, d in enumerate(documents)
    )
    chain = create_rerank_chain()
    result: RerankResult = invoke_with_retry(
        chain, {"query": query, "numbered_chunks": numbered_chunks}
    )
    scores = [0.0] * len(documents)
    for item in result.ranked:
        if 0 <= item.index < len(documents):
            scores[item.index] = item.relevance_score
    return scores


def reranker_node(state: AgentState, *, top_n: int = MAX_RERANK_TOP_N) -> dict[str, Any]:
    """Rerank CHILD chunks. They are short enough for a cross-encoder's 512-token window."""
    logger.info("Entering Reranker Node...")
    start = time.time()

    query = _resolved_query(state)
    documents = state.get("documents") or []

    if not documents:
        return {"documents": [], "reranker_time_ms": 0, "retrieved_video_ids": []}

    encoder = _get_cross_encoder()
    try:
        if encoder is not None:
            pairs = [(query, d["page_content"]) for d in documents]
            scores = encoder.predict(pairs).tolist()
        else:
            scores = _rerank_with_llm(query, documents)
    except Exception as exc:
        logger.warning("Reranker failed (%s); falling back to vector-similarity order.", exc)
        scores = [d.get("vector_score", 0.0) for d in documents]

    scored = sorted(zip(documents, scores), key=lambda pair: pair[1], reverse=True)
    top_docs = []
    for doc, score in scored[:top_n]:
        top_docs.append({**doc, "rerank_score": float(score)})

    video_ids = sorted(
        {d["video_id"] for d in top_docs if d.get("source_type") == "video" and d.get("video_id")}
    )

    elapsed_ms = int((time.time() - start) * 1000)
    logger.info(
        "Reranker: kept top %d/%d child chunks | video_ids=%s",
        len(top_docs),
        len(documents),
        video_ids,
    )
    return {"documents": top_docs, "reranker_time_ms": elapsed_ms, "retrieved_video_ids": video_ids}


def parent_expander_node(state: AgentState) -> dict[str, Any]:
    """The 'Big' half of Small-to-Big: swap matched child chunks for their parent passages.

    - Children are ranked best-first; parents inherit the rank of their best child.
    - `start_time` of the resulting doc stays the BEST-HIT child's time (precise citation),
      while the parent text carries inline [MM:SS] markers for every line.
    - If a hit sits at the very start/end of its parent, a couple of lines from the
      neighbouring parent are stitched on so an answer split across a boundary isn't lost.
    - Children without a parent (legacy ingestion) or whose parent row is missing pass
      through unchanged, so nothing breaks.
    """
    logger.info("Entering Parent Expander Node...")
    start = time.time()
    children = state.get("documents") or []
    other_ms = state.get("other_time_ms", 0)

    if not children:
        return {"documents": [], "other_time_ms": other_ms}

    scope = state.get("search_scope", "single_video")
    max_parents = MAX_PARENTS_SINGLE_VIDEO if scope == "single_video" else MAX_PARENTS_GENERAL

    groups: dict[str, dict[str, Any]] = {}
    passthrough: list[dict] = []
    for child in children:  # already sorted best-first by the reranker
        pid = child.get("parent_id")
        if not pid:
            passthrough.append(child)
            continue
        g = groups.setdefault(pid, {"best": child, "hits": [], "edge_prev": False, "edge_next": False})
        g["hits"].append(child["start_time"])
        pos, count = child.get("child_pos"), child.get("child_count")
        if pos == 0:
            g["edge_prev"] = True
        if pos is not None and count is not None and pos >= count - 1:
            g["edge_next"] = True

    selected = list(groups.items())[:max_parents]
    selected_ids = {pid for pid, _ in selected}

    wanted = set(selected_ids)
    for _pid, g in selected:
        best = g["best"]
        idx, count, vid = best.get("parent_idx"), best.get("parent_count"), best["video_id"]
        if idx is None:
            continue
        if g["edge_prev"] and idx > 0:
            prev_id = make_parent_id(vid, idx - 1)
            if prev_id not in selected_ids:
                g["prev_id"] = prev_id
                wanted.add(prev_id)
        if g["edge_next"] and count is not None and idx < count - 1:
            next_id = make_parent_id(vid, idx + 1)
            if next_id not in selected_ids:
                g["next_id"] = next_id
                wanted.add(next_id)

    rows: dict[str, dict[str, Any]] = {}
    if wanted:
        try:
            rows = fetch_parents(sorted(wanted))
        except ParentStoreError as exc:
            logger.warning("Parent store unavailable (%s); continuing with child chunks.", exc)

    expanded: list[dict] = []
    for pid, g in selected:
        best = g["best"]
        row = rows.get(pid)
        if row is None:
            expanded.append(best)  # graceful degradation: child text only
            continue

        parts: list[str] = []
        prev_row = rows.get(g.get("prev_id", ""))
        if prev_row:
            parts.append("\n".join(prev_row["content"].split("\n")[-STITCH_LINES:]))
        parts.append(row["content"])
        next_row = rows.get(g.get("next_id", ""))
        if next_row:
            parts.append("\n".join(next_row["content"].split("\n")[:STITCH_LINES]))

        expanded.append(
            {
                "page_content": "\n".join(parts),
                "video_id": best["video_id"],
                "title": best["title"],
                "start_time": best["start_time"],          # best-hit time (precise)
                "parent_id": pid,
                "parent_start": row["start_time"],
                "parent_end": row["end_time"],
                "hit_times": sorted(set(g["hits"])),
                "rerank_score": best.get("rerank_score"),
                "source_type": "video",
            }
        )

    expanded.extend(passthrough[: max(0, max_parents - len(expanded))])

    elapsed_ms = int((time.time() - start) * 1000)
    logger.info("Parent expander: %d child chunks -> %d passages", len(children), len(expanded))
    return {"documents": expanded, "other_time_ms": other_ms + elapsed_ms}


# Validate the relevent information that find from pinecone
# database This check if not relevent information the go to web search
def validator_node(state: AgentState) -> dict[str, Any]:
    """Strictly grade the relevance of retrieved documents to prevent hallucination."""
    logger.info("Entering Validator Node...")
    start_time = time.time()
    query = _resolved_query(state)
    documents = state.get("documents", [])
    if not documents:
        logger.warning("No documents found in state. Routing to web_search.")
        return {"next_node": "web_search"}
    context_text = "\n\n".join([f"Content: {d['page_content']}" for d in documents])
    grader_chain = create_validator_chain()
    result: GradeDocuments = invoke_with_retry(grader_chain, {"query": query, "context": context_text})
    logger.info(f"Validation Score: {result.binary_score} | Reason: {result.explanation}")
    elapsed_ms = int((time.time() - start_time) * 1000)

    if result.binary_score == "yes":
        return {"next_node": "generator", "validator_time_ms": elapsed_ms}
    else:
        return {"next_node": "web_search", "validator_time_ms": elapsed_ms}

# Using tavily for engine search to find information from web 
def web_search_node(state: AgentState) -> dict[str, Any]:
    logger.info("Entering Web Search Node (Tavily)...")
    query = _resolved_query(state)
    start_time = time.time()
    web_search_tool = TavilySearchResults(max_results=3)

    try:
        docs = call_with_retry(
            lambda: web_search_tool.invoke({"query": query}),
            max_attempts=3,
            exceptions=HTTP_RETRYABLE_EXCEPTIONS,
        )
    except Exception as e:
        logger.error("Tavily Search failed after retries: %s", str(e))
        docs = []

    if isinstance(docs, str):
        try:
            docs = json.loads(docs)
        except json.JSONDecodeError:
            docs = [{"content": docs, "url": "External Web Source"}]

    web_results = []

    if isinstance(docs, list):
        for d in docs:
            if isinstance(d, dict):
                web_results.append(
                    {
                        "page_content": d.get("content", ""),
                        "title": "جستجوی وب",
                        "video_id": d.get("url", "External Web Source"),
                        "start_time": 0,
                        "source_type": "web",
                    }
                )
            elif isinstance(d, str):
                web_results.append(
                    {
                        "page_content": d,
                        "title": "جستجوی وب",
                        "video_id": "External Web Source",
                        "start_time": 0,
                        "source_type": "web",
                    }
                )
            else:
                logger.warning(f"Unexpected item in Tavily results: {d}")
    elapsed_ms = int((time.time() - start_time) * 1000)

    return {"documents": web_results, "web_search_time_ms": elapsed_ms}


def _order_and_cap(sources: list[dict], video_rank: dict[str, int] | dict) -> list[dict]:
    """Chronological order inside each video (videos keep their relevance order), capped.

    The model may list citations in any order; the UI should always show them in the order
    they occur in the video so 2-3 neighbouring citations read like a short walkthrough.
    """
    rank = {vid: i for i, vid in enumerate(video_rank)}
    ordered = sorted(sources, key=lambda s: (rank.get(s["video_id"], len(rank)), s["start_time"]))
    return ordered[:MAX_VIDEO_SOURCES]


def _build_video_sources(llm_sources: list, video_docs: list[dict]) -> list[dict]:
    """Turn the LLM's cited sources into UI sources, validated against real timestamps.

    The LLM may only cite a [MM:SS] marker that exists in the context it was given.
    Anything further than SOURCE_SNAP_TOLERANCE_S from a real marker is treated as
    hallucinated and dropped; the rest is snapped to the exact marker.
    """
    allowed: dict[str, dict[int, str]] = {}
    titles: dict[str, str] = {}
    for doc in video_docs:
        vid = doc.get("video_id", "Unknown")
        titles.setdefault(vid, doc.get("title") or "Video")
        slot = allowed.setdefault(vid, {})
        for sec, line_text in _markers(doc.get("page_content", "")):
            slot.setdefault(sec, line_text)
        slot.setdefault(int(doc.get("start_time", 0) or 0), "")  # legacy chunks have no markers

    only_vid = next(iter(allowed)) if len(allowed) == 1 else None

    resolved: list[dict] = []
    seen: set[tuple[str, int]] = set()
    for src in llm_sources:
        if src.source_type != "video" or src.start_time is None:
            continue
        vid = src.video_id if src.video_id in allowed else only_vid
        if vid is None:
            continue
        sec, line_text = min(allowed[vid].items(), key=lambda kv: abs(kv[0] - src.start_time))
        if abs(sec - src.start_time) > SOURCE_SNAP_TOLERANCE_S or (vid, sec) in seen:
            continue
        seen.add((vid, sec))
        resolved.append(
            {
                "source_type": "video",
                "video_id": vid,
                "start_time": sec,
                "title": src.title or titles[vid],
                "description": src.description or _shorten(line_text),
            }
        )
    if resolved:
        return _order_and_cap(resolved, titles)

    # Fallback: cite the best-matching moment of every retrieved passage.
    for doc in video_docs:
        vid = doc.get("video_id", "Unknown")
        sec = int(doc.get("start_time", 0) or 0)
        if (vid, sec) in seen:
            continue
        seen.add((vid, sec))
        resolved.append(
            {
                "source_type": "video",
                "video_id": vid,
                "start_time": sec,
                "title": doc.get("title") or "Video reference",
                "description": _shorten(allowed[vid].get(sec) or doc.get("page_content", "")),
            }
        )
    return _order_and_cap(resolved, titles)


# Generate the final answer node
def generate_answer_node(state: AgentState) -> dict[str, Any]:
    logger.info("Entering Generator Node...")
    start_time = time.time()
    query = _resolved_query(state)
    documents = state.get("documents", [])
    context_parts = []
    is_web_search = False

    for doc in documents:
        if doc.get("source_type") == "web":
            is_web_search = True
            context_parts.append(f"منبع وب: {doc['page_content']} | URL: {doc['video_id']}")
        else:
            span = ""
            if doc.get("parent_start") is not None and doc.get("parent_end") is not None:
                span = f" | passage {format_ts(doc['parent_start'])}-{format_ts(doc['parent_end'])}"
            context_parts.append(
                f"Video: {doc.get('title', 'Unknown Title')} (ID: {doc.get('video_id', 'Unknown')}){span}\n"
                f"{doc['page_content']}"
            )
    context_text = "\n\n".join(context_parts)

    transparency_note = ""
    if is_web_search:
        transparency_note = (
            "توجه مهم: اطلاعات در ویدیو یافت نشد. این پاسخ بر اساس 'جستجوی وب' است. این موضوع را حتما به کاربر بگو.\n\n" )

    generator_chain = create_generator_chain()
    result: FinalAnswerSchema = invoke_with_retry(
        generator_chain,
        {"query": query, "context": context_text, "transparency_note": transparency_note},)

    video_docs = [d for d in documents if d.get("source_type") == "video"]
    ui_sources = _build_video_sources(result.sources or [], video_docs)

    for doc in documents:
        if doc.get("source_type") == "web":
            web_url = doc.get("video_id")
            web_title = next(
                (s.title for s in (result.sources or []) if s.source_type == "web" and s.url == web_url),
                None,
            )
            ui_sources.append(
                {
                    "source_type": "web",
                    "url": web_url,
                    "title": web_title or doc.get("title", "منبع وب"),
                }
            )

    response_payload = {
        "type": "qa_response",
        "answer": result.answer,
        "sources": ui_sources,
    }

    elapsed_ms = int((time.time() - start_time) * 1000)
    return {"response": json.dumps(response_payload, ensure_ascii=False), "generator_time_ms": elapsed_ms}

#  Explain the summery of video
def video_summary_node(state: AgentState) -> dict[str, Any]:
    logger.info("Entering Video Summary Node...")
    start_time = time.time()
    user_id = state["user_id"]
    video_id = state["video_id"]
    query = _resolved_query(state)

    context = _fetch_video_context(user_id, video_id, query)
    summary_chain = create_summary_chain()
    summary: VideoSummarySchema = invoke_with_retry(summary_chain, {"context": context, "query": query})

    if isinstance(summary, VideoSummarySchema):
        summary_dict = summary.model_dump()
    else:
        summary_dict = summary

    summary_dict["type"] = "video_summary"
    elapsed_ms = int((time.time() - start_time) * 1000)
    return {"response": json.dumps(summary_dict, ensure_ascii=False), "generator_time_ms": elapsed_ms}
