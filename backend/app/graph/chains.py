# app/graph/chains.py
import logging
from typing import Any

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.graph.state import (
    RouteDecision,
    GradeDocuments,
    FinalAnswerSchema,
    VideoSummarySchema,
    VideoChaptersSchema,
    ContextualizedQuery,
    RerankResult,
)

logger = logging.getLogger(__name__)


def get_llm(model_name: str, *, temperature: float = 0.0) -> ChatOpenAI:
    """Initialize and return the LLM configured via OpenRouter.

    NOTE on resiliency: `max_retries=0` here is intentional. Retries are handled
    exclusively by `app.graph.retry_utils.invoke_with_retry`, which wraps every
    chain.invoke() call in nodes.py with visible, tuned exponential backoff.
    Letting both layers retry independently causes multiplicative retry storms.
    """
    settings = get_settings()
    return ChatOpenAI(
        model=model_name,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=temperature,
        timeout=30.0,
        max_retries=0,
    )


# this chain use for improving question and make it more optimize base on the historey
def create_contextualize_chain() -> Any:
    system_prompt = (
        "You reformulate a user's latest chat message into a fully self-contained, "
        "standalone question, using the conversation history for context.\n\n"
        "Rules:\n"
        "1. If the latest message already stands on its own (no pronouns like 'it', "
        "'that', 'this video', no implicit reference to a prior turn), return it "
        "UNCHANGED as standalone_query and set is_follow_up=false.\n"
        "2. If it depends on prior context (e.g. 'what about part 2?', 'explain that "
        "more', 'and in Persian?'), rewrite it into a complete question that includes "
        "the missing context explicitly, and set is_follow_up=true.\n"
        "3. Never answer the question. Only reformulate it.\n"
        "4. Preserve the user's original language exactly — do not translate."
    )

    prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "Latest message: {query}"),
        ])

    settings = get_settings()
    return prompt | get_llm(settings.supervisor_model).with_structured_output(
        ContextualizedQuery
    )


#  Reranker chain (LLM fallback used when a local cross-encoder isn't installed)
def create_rerank_chain() -> Any:
    system_prompt = (
        "You are a relevance-scoring engine for a RAG retrieval pipeline.\n"
        "You will receive a user question and a numbered list of transcript chunks.\n"
        "For EVERY chunk (by its index), assign a relevance_score between 0.0 and 1.0 "
        "indicating how directly useful that chunk is for answering the question.\n"
        "0.0 = completely irrelevant, 1.0 = directly and fully answers the question.\n"
        "You MUST return exactly one entry per input index, in any order."
    )

    prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Question: {query}\n\nChunks:\n{numbered_chunks}"),
        ])

    settings = get_settings()
    return prompt | get_llm(settings.supervisor_model).with_structured_output(RerankResult)


# Create chain for supervisor routing decision.
def create_supervisor_chain() -> Any:
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
    return prompt | get_llm(settings.supervisor_model).with_structured_output(RouteDecision)


# this chain for document relevance validation
def create_validator_chain() -> Any:
    system_prompt = (
        "You are a strict quality control grader.\n"
        "Your task is to assess whether the provided video transcript excerpts contain "
        "explicit, factual, and sufficient information to answer the user's question.\n"
        "If the context is irrelevant, generic, or lacks the direct answer, you MUST select 'no'.\n"
        "Do not make assumptions. Be extremely strict."
    )

    prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "User Question: {query}\n\nRetrieved Context:\n{context}"), ])

    settings = get_settings()
    return prompt | get_llm(settings.supervisor_model).with_structured_output(GradeDocuments)



#  for final answer or for generation node 
def create_generator_chain() -> Any:
    system_prompt = (
        "You are an expert educational assistant.\n"
        "{transparency_note}\n"
        "Your task is to answer the user's question using ONLY the provided Context.\n"
        "RULES:\n"
        "1. Do not use outside knowledge.\n"
        "2. Write the main response in the 'answer' field using markdown.\n"
        "3. For video sources, cite them inline using [MM:SS] format inside the 'answer' field.\n"
        "4. In the 'sources' list, for EVERY distinct video timestamp you cited, add one entry with:\n"
        "   - source_type='video', start_time (in seconds, matching the [MM:SS] you cited),\n"
        "   - title: a short (3-7 word) chapter-style topic heading describing what is discussed "
        "at that exact timestamp (e.g. 'Setting up the Environment'), NOT the user's question,\n"
        "   - description: one concise sentence about that segment.\n"
        "5. For web sources, add an entry with source_type='web', url, and title. Do NOT paste raw URLs in the 'answer' text.\n"
        "Context:\n{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{query}"),
        ] )

    settings = get_settings()
    return prompt | get_llm(settings.generator_model).with_structured_output(FinalAnswerSchema)


# Prompt for making chapters 
def create_chapters_chain() -> Any:
    system_prompt = (
        "You are an expert video content editor creating a YouTube-style chapter list.\n"
        "You will be given timestamped transcript segments (format: [MM:SS] text) for a single video.\n\n"
        "Task: identify 4 to 12 distinct topical chapters that best organize the video's content.\n\n"
        "STRICT RULES:\n"
        "1. Every chapter's 'time' MUST be copied EXACTLY from one of the provided [MM:SS] markers. "
        "Never invent, round, or estimate a timestamp.\n"
        "2. 'title' must be a short descriptive topic heading about the CONTENT being discussed "
        "(e.g. 'Setting up the Environment', 'Agents in LangChain'). It is a topic label, never a "
        "question, and it has nothing to do with any user chat message.\n"
        "3. 'description' is exactly one concise sentence summarizing that specific chapter.\n"
        "4. Order chapters chronologically by timestamp.\n"
        "5. If the transcript is too short, too generic, or otherwise insufficient to derive "
        "meaningful chapters, return an empty 'chapters' list. Do not fabricate content.\n\n"
        "Transcript segments:\n{context}"
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            ("human", "Generate the chapter list now, based only on the transcript segments above."), ])

    settings = get_settings()
    return prompt | get_llm(settings.generator_model).with_structured_output(VideoChaptersSchema)


# Prompt for summery whole of video
def create_summary_chain() -> Any:
    """Create chain for video summary generation."""
    system_prompt = (
        "You are an academic video analyst. Using the timestamped transcript excerpts below, "
        "produce a structured summary of the video.\n"
        "Requirements:\n"
        "- Base every claim strictly on the provided transcript.\n"
        "- Use MM:SS format for all timestamps in key takeaways.\n"
        "- Order key takeaways chronologically by timestamp.\n"
        "- Write in clear, professional, academically sound English.\n\n"
        "Transcript excerpts with precise timestamps:\n{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{query}"),
        ])
    settings = get_settings()
    return prompt | get_llm(settings.generator_model).with_structured_output(VideoSummarySchema)
