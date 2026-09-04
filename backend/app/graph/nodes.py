# app/graph/nodes.py
import json
import logging
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
from app.ingestion import _get_embeddings

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


MAX_RERANK_TOP_N = 4


def _resolved_query(state: AgentState) -> str:
    return state.get("standalone_query") or state["query"]


# Helper function to retriece document for structured summeries
def _fetch_video_context(
    user_id: str,
    video_id: str,
    query: str,
    *,
    k: int = 4,
) -> str:
    settings = get_settings()
    vector_store = PineconeVectorStore(
        index_name=settings.index_name,
        embedding=_get_embeddings(),
        pinecone_api_key=settings.pinecone_api_key,
        namespace=user_id,
    )

    retriever = vector_store.as_retriever(
        search_kwargs={
            "filter": {"video_id": {"$eq": video_id}},
            "k": k,
        })

    docs = retriever.invoke(query)

    context_parts = []
    for doc in docs:
        start_time = doc.metadata.get("start_time", 0)
        minutes = int(start_time // 60)
        seconds = int(start_time % 60)
        timestamp_str = f"[{minutes:02d}:{seconds:02d}]"
        context_parts.append(f"{timestamp_str} {doc.page_content}")

    return "\n\n".join(context_parts)



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

#  Retrieve relevent information from pinecone database 
def retriever_node(state: AgentState) -> dict[str, Any]:
    logger.info("Entering Retriever Node...")
    start_time = time.time()
    user_id = state["user_id"]
    video_id = state["video_id"]
    query = _resolved_query(state)
    search_scope = state.get("search_scope", "single_video")
    settings = get_settings()
    vector_store = PineconeVectorStore(
        index_name=settings.index_name,
        embedding=_get_embeddings(),
        pinecone_api_key=settings.pinecone_api_key,
        namespace=user_id,
    )

    if search_scope == "single_video" and video_id:
        logger.info(f"Searching strictly inside video: {video_id}")
        search_kwargs = {"filter": {"video_id": {"$eq": video_id}}, "k": 4}
        
    else:
        logger.info("Searching across ALL user videos (General Scope)")
        search_kwargs = {"k": 8}
    retriever = vector_store.as_retriever(search_kwargs=search_kwargs)
    docs = retriever.invoke(query)
    retrieved_docs = []
    
    for doc in docs:
        retrieved_docs.append( {
                "page_content": doc.page_content,
                "video_id": doc.metadata.get("video_id", "Unknown"),
                "title": doc.metadata.get("title") or doc.metadata.get("video_title") or "Unknown Title",
                "start_time": doc.metadata.get("start_time", 0),
                "source_type": "video", }
        )

    elapsed_ms = int((time.time() - start_time) * 1000)
    return {"documents": retrieved_docs, "retriever_time_ms": elapsed_ms}


_cross_encoder = None
_cross_encoder_load_failed = False


def _get_cross_encoder():
    global _cross_encoder, _cross_encoder_load_failed
    if _cross_encoder is not None or _cross_encoder_load_failed:
        return _cross_encoder
    try:
        from sentence_transformers import CrossEncoder

        _cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        logger.info("Reranker: loaded local cross-encoder ms-marco-MiniLM-L-6-v2")
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
        logger.warning("Reranker failed (%s); keeping original retrieval order.", exc)
        scores = [1.0] * len(documents)  # neutral: don't reorder/drop on failure

    scored = sorted(zip(documents, scores), key=lambda pair: pair[1], reverse=True)
    top_docs = [doc for doc, _score in scored[:top_n]]

    video_ids = sorted(
        {d["video_id"] for d in top_docs if d.get("source_type") == "video" and d.get("video_id")}
    )

    elapsed_ms = int((time.time() - start) * 1000)
    logger.info(
        "Reranker: kept top %d/%d chunks | video_ids=%s",
        len(top_docs),
        len(documents),
        video_ids,
    )
    return {"documents": top_docs, "reranker_time_ms": elapsed_ms, "retrieved_video_ids": video_ids}

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
            v_id = doc.get("video_id", "Unknown")
            v_title = doc.get("title", "Unknown Title")
            start_time_val = doc.get("start_time", 0)
            minutes, seconds = int(start_time_val // 60), int(start_time_val % 60)
            context_parts.append(
                f"ویدیو: {v_title} (ID: {v_id}) - زمان [{minutes:02d}:{seconds:02d}]:\n{doc['page_content']}"
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

    llm_titles_by_time: dict[Any, tuple[str, str]] = {}
    for src in (result.sources or []):
        if src.source_type == "video" and src.start_time is not None:
            llm_titles_by_time[src.start_time] = (src.title or "", src.description or "")

    ui_sources = []
    seen_video_keys = set()
    for doc in documents:
        if doc.get("source_type") == "video":
            v_id = doc.get("video_id", "Unknown")
            st = int(doc.get("start_time", 0) or 0)
            key = (v_id, st)
            if key in seen_video_keys:
                continue
            seen_video_keys.add(key)

            llm_title, llm_desc = llm_titles_by_time.get(st, ("", ""))
            title = llm_title or doc.get("title") or "ارجاع به ویدیو"
            description = llm_desc or (doc.get("page_content", "")[:120].strip() + "…")

            ui_sources.append(
                {
                    "source_type": "video",
                    "video_id": v_id,
                    "start_time": st,
                    "title": title,
                    "description": description,
                }
            )
        elif doc.get("source_type") == "web":
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

    context = _fetch_video_context(user_id, video_id, query, k=4)
    summary_chain = create_summary_chain()
    summary: VideoSummarySchema = invoke_with_retry(summary_chain, {"context": context, "query": query})

    if isinstance(summary, VideoSummarySchema):
        summary_dict = summary.model_dump()
    else:
        summary_dict = summary

    summary_dict["type"] = "video_summary"
    elapsed_ms = int((time.time() - start_time) * 1000)
    return {"response": json.dumps(summary_dict, ensure_ascii=False), "generator_time_ms": elapsed_ms}
