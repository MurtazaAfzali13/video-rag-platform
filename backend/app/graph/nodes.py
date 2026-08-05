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
    GradeDocuments
)
from app.ingestion import _get_embeddings

# وارد کردن زنجیره‌ها از فایل chains.py
from app.graph.chains import (
    create_supervisor_chain,
    create_validator_chain,
    create_generator_chain,
    create_summary_chain
)

logger = logging.getLogger(__name__)


def _fetch_video_context(
    user_id: str,
    video_id: str,
    query: str,
    *,
    k: int = 4,
) -> str:
    """Helper function to retrieve transcript chunks for structured summaries."""
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
        }
    )

    docs = retriever.invoke(query)

    context_parts = []
    for doc in docs:
        start_time = doc.metadata.get("start_time", 0)
        minutes = int(start_time // 60)
        seconds = int(start_time % 60)
        timestamp_str = f"[{minutes:02d}:{seconds:02d}]"
        context_parts.append(f"{timestamp_str} {doc.page_content}")

    return "\n\n".join(context_parts)


def supervisor_node(state: AgentState) -> dict[str, Any]:
    """Analyze the user's query and UI context to determine the next expert node."""
    logger.info("Entering Supervisor Agent...")
    
    query = state["query"]
    search_scope = state.get("search_scope", "single_video")
    
    # استفاده از Chain متمرکز
    router_chain = create_supervisor_chain()
    
    decision: RouteDecision = router_chain.invoke({
        "query": query, 
        "search_scope": search_scope
    }) 
    
    logger.info(f"Supervisor Decision: {decision.intent} | Reason: {decision.reasoning}")
    return {"next_node": decision.intent}


def retriever_node(state: AgentState) -> dict[str, Any]:
    """Retrieve transcript chunks from Pinecone based on the supervisor's search scope."""
    logger.info("Entering Retriever Node...")
    start_time = time.time()
    user_id = state["user_id"]
    video_id = state["video_id"]
    query = state["query"]
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
        search_kwargs = {
            "filter": {"video_id": {"$eq": video_id}},
            "k": 4
        }
    else:
        logger.info("Searching across ALL user videos (General Scope)")
        search_kwargs = {"k": 5}
        
    retriever = vector_store.as_retriever(search_kwargs=search_kwargs)
    docs = retriever.invoke(query)
    
    retrieved_docs = []
    for doc in docs:
        retrieved_docs.append({
            "page_content": doc.page_content,
            "video_id": doc.metadata.get("video_id", "Unknown"),
            "title": doc.metadata.get("title") or doc.metadata.get("video_title") or "Unknown Title",
            "start_time": doc.metadata.get("start_time", 0),
            "source_type": "video"
        })
    
    elapsed_ms = int((time.time() - start_time) * 1000) 
    return {"documents": retrieved_docs, "retriever_time_ms": elapsed_ms}


def validator_node(state: AgentState) -> dict[str, Any]:
    """Strictly grade the relevance of retrieved documents to prevent hallucination."""
    logger.info("Entering Validator Node...")
    start_time = time.time()
    query = state["query"]
    documents = state.get("documents", [])
    
    if not documents:
        logger.warning("No documents found in state. Routing to web_search.")
        return {"next_node": "web_search"}
        
    context_text = "\n\n".join([f"Content: {d['page_content']}" for d in documents])
    
    # استفاده از Chain متمرکز
    grader_chain = create_validator_chain()
    
    result: GradeDocuments = grader_chain.invoke({
        "query": query, 
        "context": context_text
    })
    
    logger.info(f"Validation Score: {result.binary_score} | Reason: {result.explanation}")
    
    elapsed_ms = int((time.time() - start_time) * 1000)
    
    if result.binary_score == "yes":
        return {"next_node": "generator", "validator_time_ms": elapsed_ms}  
    else:
        return {"next_node": "web_search", "validator_time_ms": elapsed_ms}


def web_search_node(state: AgentState) -> dict[str, Any]:
    """Execute a fallback web search when local database resources are insufficient."""
    logger.info("Entering Web Search Node (Tavily)...")
    query = state["query"]
    start_time = time.time()
    web_search_tool = TavilySearchResults(max_results=3)
    
    try:
        docs = web_search_tool.invoke({"query": query})
    except Exception as e:
        logger.error(f"Tavily Search failed: {str(e)}")
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
                web_results.append({
                    "page_content": d.get("content", ""),
                    "title": "جستجوی وب",
                    "video_id": d.get("url", "External Web Source"),
                    "start_time": 0,
                    "source_type": "web"
                })
            elif isinstance(d, str):
                web_results.append({
                    "page_content": d,
                    "title": "جستجوی وب",
                    "video_id": "External Web Source",
                    "start_time": 0,
                    "source_type": "web"
                })
            else:
                logger.warning(f"Unexpected item in Tavily results: {d}")
    elapsed_ms = int((time.time() - start_time) * 1000)

    return {"documents": web_results, "web_search_time_ms": elapsed_ms}


def generate_answer_node(state: AgentState) -> dict[str, Any]:
    """Synthesize the final grounded response with structured sources for UI rendering."""
    logger.info("Entering Generator Node...")
    start_time = time.time()
    query = state["query"]
    documents = state.get("documents", [])
    
    context_parts = []
    is_web_search = False
    
    # ۱. ساخت متن کانتکست برای مدل
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
            "توجه مهم: اطلاعات در ویدیو یافت نشد. این پاسخ بر اساس 'جستجوی وب' است. این موضوع را حتما به کاربر بگو.\n\n"
        )
    
    generator_chain = create_generator_chain()
    
    result: FinalAnswerSchema = generator_chain.invoke({
        "query": query, 
        "context": context_text,
        "transparency_note": transparency_note
    })
    
    # ۲. جمع‌آوری منابع (حل ارور web_sources)
    ui_sources = []
    
    # اولویت با منابعی است که LLM تولید کرده (چون title و description جذاب دارند)
    if result.sources:
        for src in result.sources:
            ui_sources.append(src.model_dump(exclude_none=True))
            
    # فال‌بک: اگر LLM منبعی تولید نکرد اما داکیومنت داشتیم، دستی اضافه می‌کنیم 
    # تا پنل فرانت‌اند خالی نماند!
    if not ui_sources and documents:
        seen_timestamps = set()
        for doc in documents:
            if doc.get("source_type") == "video":
                st = doc.get("start_time")
                if st not in seen_timestamps:
                    seen_timestamps.add(st)
                    ui_sources.append({
                        "source_type": "video",
                        "title": doc.get("title", "ارجاع به ویدیو"),
                        "start_time": st
                    })
            elif doc.get("source_type") == "web":
                ui_sources.append({
                    "source_type": "web",
                    "title": doc.get("title", "منبع وب"),
                    "url": doc.get("video_id") # در سرچ وب، آدرس url درون فیلد video_id ذخیره شده است
                })

    # ۳. بسته‌بندی نهایی خروجی به صورت JSON
    response_payload = {
        "type": "qa_response",
        "answer": result.answer,
        "sources": ui_sources
    }
        
    elapsed_ms = int((time.time() - start_time) * 1000) 
    return {"response": json.dumps(response_payload, ensure_ascii=False), "generator_time_ms": elapsed_ms}


def video_summary_node(state: AgentState) -> dict[str, Any]:
    """Generate a high-fidelity chronological academic summary with type identifier."""
    logger.info("Entering Video Summary Node...")
    start_time = time.time()
    user_id = state["user_id"]
    video_id = state["video_id"]
    query = state["query"]

    context = _fetch_video_context(user_id, video_id, query, k=4)

    summary_chain = create_summary_chain()
    
    summary = summary_chain.invoke({
        "context": context, 
        "query": query
    })

    if isinstance(summary, VideoSummarySchema):
        summary_dict = summary.model_dump()
    else:
        summary_dict = summary

    # اضافه کردن تایپ برای تشخیص در فرانت‌اند
    summary_dict["type"] = "video_summary"
        
    elapsed_ms = int((time.time() - start_time) * 1000)
    return {"response": json.dumps(summary_dict, ensure_ascii=False), "generator_time_ms": elapsed_ms}