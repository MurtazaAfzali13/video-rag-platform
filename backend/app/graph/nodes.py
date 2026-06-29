import json
import logging
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain_community.tools.tavily_search import TavilySearchResults

from app.config import get_settings
from app.graph.state import AgentState, VideoSummarySchema, RouteDecision, GradeDocuments
from app.ingestion import _get_embeddings

logger = logging.getLogger(__name__)

def get_llm(model_name: str) -> ChatOpenAI:
    """Initialize and return the LLM configured via OpenRouter based on the requested model."""
    settings = get_settings()
    return ChatOpenAI(
        model=model_name,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
    )


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
    
    system_prompt = (
        "You are a routing supervisor in an educational AI system.\n"
        "Your job is to analyze the user's query and the UI context (search_scope) "
        "to determine which expert agent should handle the request.\n\n"
        "Search Scope Constraint:\n"
        "- If search_scope is 'general', you MUST route to 'general_qa' unless it's explicitly a summary request.\n"
        "- If search_scope is 'single_video', route to 'video_qa' or 'video_summary'."
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Query: {query}\nSearch Scope: {search_scope}"),
    ])
    
   
    settings = get_settings()
    router_chain = prompt | get_llm(settings.supervisor_model).with_structured_output(RouteDecision)
    
    decision: RouteDecision = router_chain.invoke({
        "query": query, 
        "search_scope": search_scope
    }) 
    
    logger.info(f"Supervisor Decision: {decision.intent} | Reason: {decision.reasoning}")
    return {"next_node": decision.intent}



def retriever_node(state: AgentState) -> dict[str, Any]:
    """Retrieve transcript chunks from Pinecone based on the supervisor's search scope."""
    logger.info("Entering Retriever Node...")
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
            "start_time": doc.metadata.get("start_time", 0)
        })
        
    return {"documents": retrieved_docs}



def validator_node(state: AgentState) -> dict[str, Any]:
    """Strictly grade the relevance of retrieved documents to prevent hallucination."""
    logger.info("Entering Validator Node...")
    query = state["query"]
    documents = state.get("documents", [])
    
    if not documents:
        logger.warning("No documents found in state. Routing to web_search.")
        return {"next_node": "web_search"}
        
    context_text = "\n\n".join([f"Content: {d['page_content']}" for d in documents])
    
    system_prompt = (
        "You are a strict quality control grader.\n"
        "Your task is to assess whether the provided video transcript excerpts contain "
        "explicit, factual, and sufficient information to answer the user's question.\n"
        "If the context is irrelevant, generic, or lacks the direct answer, you MUST select 'no'.\n"
        "Do not make assumptions. Be extremely strict."
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "User Question: {query}\n\nRetrieved Context:\n{context}"),
    ])
    
    
    settings = get_settings()
    grader_chain = prompt | get_llm(settings.supervisor_model).with_structured_output(GradeDocuments)
    
    result: GradeDocuments = grader_chain.invoke({"query": query, "context": context_text})
    logger.info(f"Validation Score: {result.binary_score} | Reason: {result.explanation}")
    
    if result.binary_score == "yes":
        return {"next_node": "generator"}  
    else:
        return {"next_node": "web_search"} 



def web_search_node(state: AgentState) -> dict[str, Any]:
    """Execute a fallback web search when local database resources are insufficient."""
    logger.info("Entering Web Search Node (Tavily)...")
    query = state["query"]
    
    web_search_tool = TavilySearchResults(max_results=3)
    docs = web_search_tool.invoke({"query": query})
    
    web_results = []
    for d in docs:
        web_results.append({
            "page_content": d["content"],
            "title": "جستجوی وب",
            "video_id": d.get("url", "External Web Source"),
            "start_time": 0
        })
    return {"documents": web_results}



def generate_answer_node(state: AgentState) -> dict[str, Any]:
    """Synthesize the final grounded response using either validated video snippets or web resources."""
    logger.info("Entering Generator Node...")
    query = state["query"]
    documents = state.get("documents", [])
    
    context_parts = []
    is_web_search = False
    
    for i, doc in enumerate(documents, start=1):
        if "url" in doc.get("video_id", "") or doc.get("title") == "جستجوی وب":
            is_web_search = True
            context_parts.append(f"منبع خارجی {i} (وب): {doc['page_content']} | URL: {doc['video_id']}")
        else:
            v_id = doc.get("video_id", "Unknown")
            v_title = doc.get("title", "Unknown Title")
            start_time = doc.get("start_time", 0)
            minutes, seconds = int(start_time // 60), int(start_time % 60)
            context_parts.append(
                f"ویدیو: {v_title} (ID: {v_id}) - زمان [{minutes:02d}:{seconds:02d}]:\n{doc['page_content']}"
            )
            
    context_text = "\n\n".join(context_parts)
    
    transparency_note = ""
    if is_web_search:
        transparency_note = (
            "توجه مهم: اطلاعات مورد نیاز کاربر در ویدیوهای بارگذاری شده یافت نشد. "
            "بنابراین، این پاسخ بر اساس 'جستجوی وب' تهیه شده است. حتماً این موضوع را در ابتدای پاسخ به کاربر اطلاع دهید.\n\n"
        )
        
    system_prompt = (
        "You are an expert educational assistant.\n"
        f"{transparency_note}"
        "Your task is to answer the user's question using ONLY the provided Context.\n"
        "RULES:\n"
        "1. Do not use outside knowledge. If the answer is not in the context, say you don't know.\n"
        "2. ALWAYS cite your sources at the end of the response (e.g., 'منابع: ویدیو ID فلان، زمان 02:15' or Web URL).\n"
        "Context:\n{context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{query}"),
    ])
    
    # اصلاح: استفاده از مدل قدرتمند و اصلی برای تولید محتوا
    settings = get_settings()
    chain = prompt | get_llm(settings.generator_model) | StrOutputParser()
    
    response = chain.invoke({"query": query, "context": context_text})
    
    return {"response": response}



def video_summary_node(state: AgentState) -> dict[str, Any]:
    """Generate a high-fidelity chronological academic summary of the active video."""
    logger.info("Entering Video Summary Node...")
    user_id = state["user_id"]
    video_id = state["video_id"]
    query = state["query"]

    context = _fetch_video_context(user_id, video_id, query, k=4)

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

    # اصلاح: استفاده از مدل قدرتمند برای تولید خلاصه ساختاریافته آکادمیک
    settings = get_settings()
    chain = prompt | get_llm(settings.generator_model).with_structured_output(VideoSummarySchema)
    
    summary = chain.invoke({"context": context, "query": query})

    if isinstance(summary, VideoSummarySchema):
        response_json = summary.model_dump_json(indent=2)
    else:
        response_json = json.dumps(summary, indent=2)
        
    return {"response": response_json}