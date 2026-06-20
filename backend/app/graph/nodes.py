import json
import logging
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langchain_pinecone import PineconeVectorStore

from app.config import get_settings
from app.graph.state import AgentState, VideoSummarySchema
from app.ingestion import _get_embeddings

logger = logging.getLogger(__name__)

SUMMARY_QUERY_TRIGGERS = (
    "summarize",
    "summarise",
    "summary",
    "overview",
    "takeaway",
    "takeaways",
    "key takeaways",
    "explain",   
    "introduce",
)


def get_llm() -> ChatOpenAI:
    settings = get_settings()
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
    )


def is_summary_request(query: str) -> bool:
    """Return True when the user query asks for a structured video summary."""
    query_lower = query.lower().strip()
    return any(trigger in query_lower for trigger in SUMMARY_QUERY_TRIGGERS)


def _fetch_video_context(
    user_id: str,
    video_id: str,
    query: str,
    *,
    k: int = 4,
) -> str:
    """Retrieve transcript chunks scoped to a single user namespace and video."""
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


def video_rag_node(state: AgentState) -> dict[str, Any]:
    """Retrieve and answer questions scoped to the active video via metadata filtering."""
    logger.info("Entering Video RAG Node...")
    user_id = state["user_id"]
    video_id = state["video_id"]
    query = state["query"]

    # گرفتن کانتکست همراه با زمان‌بندی
    context = _fetch_video_context(user_id, video_id, query, k=4)

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an advanced AI assistant for analyzing video transcripts.\n\n"
            "STRICT CONTEXT ENFORCEMENT PROTOCOL:\n"
            "- Your answer must be based ONLY and EXCLUSIVELY on the factually explicit information provided in the video excerpts below.\n"
            "- Do NOT use any pre-trained external knowledge, facts, or assumptions outside of the provided text.\n"
            "- If the provided context is empty, irrelevant, or does not contain the exact and direct answer to the user's question, you MUST respond with exactly this phrase and nothing else: 'متاسفانه پاسخ این سوال در ویدیو پیدا نشد.'\n"
            "- Do not extrapolate, speculate, or invent any details. If the text does not state it, it is non-existent to you.\n\n"
            "CRITICAL REQUIREMENT: If you find the answer in the context, you MUST cite the specific times from the context. "
            "At the very end of your response, you MUST include a clearly formatted 'منابع' (Sources) section "
            "listing the timestamps used as bullet points.\n\n"
            "Video excerpts with precise timestamps:\n{context}"
        )),
        ("human", "{query}"),
    ])

    chain = prompt | get_llm() | StrOutputParser()
    response = chain.invoke({"context": context, "query": query})

    return {"response": response}


def video_summary_node(state: AgentState) -> dict[str, Any]:
    """Generate a structured academic summary of the active video transcript."""
    logger.info("Entering Video Summary Node...")
    user_id = state["user_id"]
    video_id = state["video_id"]
    query = state["query"]

    context = _fetch_video_context(user_id, video_id, query, k=2)

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an academic video analyst. Using the timestamped transcript excerpts below, "
            "produce a structured summary of the video.\n"
            "Requirements:\n"
            "- Base every claim strictly on the provided transcript.\n"
            "- Use MM:SS format for all timestamps in key takeaways.\n"
            "- Order key takeaways chronologically by timestamp.\n"
            "- Write in clear, professional, academically sound English.\n\n"
            "Transcript excerpts with precise timestamps:\n{context}"
        )),
        ("human", "{query}"),
    ])

    chain = prompt | get_llm().with_structured_output(VideoSummarySchema)
    summary = chain.invoke({"context": context, "query": query})

    if isinstance(summary, VideoSummarySchema):
        response_json = summary.model_dump_json(indent=2)
    else:
        response_json = json.dumps(summary, indent=2)
    return {"response": response_json}


def multi_video_search_node(state: AgentState) -> dict[str, Any]:
    """Search across ALL videos belonging to the user inside their Pinecone namespace."""
    logger.info("Entering Multi-Video Search Node...")
    user_id = state["user_id"]
    query = state["query"]
    settings = get_settings()

    vector_store = PineconeVectorStore(
        index_name=settings.index_name,
        embedding=_get_embeddings(),
        pinecone_api_key=settings.pinecone_api_key,
        namespace=user_id, 
    )

    retriever = vector_store.as_retriever(
        search_kwargs={
            "k": 5,
        }
    )
    docs = retriever.invoke(query)

    formatted_results_list = []
    for i, doc in enumerate(docs, start=1):
        v_id = doc.metadata.get("video_id", "Unknown ID")
        v_title = doc.metadata.get("title") or doc.metadata.get("video_title") or f"Video ({v_id})"
        
        start_time = doc.metadata.get("start_time", 0)
        minutes = int(start_time // 60)
        seconds = int(start_time % 60)
        timestamp_str = f"{minutes:02d}:{seconds:02d}"

        formatted_results_list.append(
            f"منبع {i}:\n"
            f"عنوان ویدیو: {v_title}\n"
            f"شناسه ویدیو: {v_id}\n"
            f"زمان: [{timestamp_str}]\n"
            f"محتوا: {doc.page_content}"
        )

    search_results_text = "\n\n".join(formatted_results_list)

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a highly professional AI learning assistant.\n\n"
            "ABSOLUTE CONTEXT GROUNDING MANDATE:\n"
            "- You must prepare an answer based ONLY and EXCLUSIVELY on the Multi-Video Transcripts Context provided below.\n"
            "- If the provided context does not contain direct facts to answer the query, or if no relevant documents are found in the database, you MUST reply with exactly: 'این اطلاعات در دیتابیس ویدیوهای شما یافت نشد.'\n"
            "- Under no circumstances are you allowed to use your own background knowledge or create hypothetical answers.\n\n"
            "CRITICAL REQUIREMENT: If the information is present, you MUST build trust with the user by citing your sources. "
            "Whenever you state a fact or use information from a video, explicitly mention the 'Video Title' or 'Video ID' and the exact 'Timestamp'.\n"
            "At the very end of your response, you MUST include a clearly formatted 'منابع' (Sources) section "
            "listing the unique Video Titles/IDs and Timestamps used as bullet points.\n\n"
            "Multi-Video Transcripts Context:\n{search_results}"
        )),
        ("human", "{query}"),
    ])

    chain = prompt | get_llm() | StrOutputParser()
    response = chain.invoke({"search_results": search_results_text, "query": query})

    return {"response": response}