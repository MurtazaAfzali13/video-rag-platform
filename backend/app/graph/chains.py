# app/graph/chains.py
import logging
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.graph.state import (
    RouteDecision, 
    GradeDocuments, 
    FinalAnswerSchema, # جایگزین GroundedAnswer شد
    VideoSummarySchema,
    VideoChaptersSchema,
)

logger = logging.getLogger(__name__)

def get_llm(model_name: str) -> ChatOpenAI:
    """Initialize and return the LLM configured via OpenRouter."""
    settings = get_settings()
    return ChatOpenAI(
        model=model_name,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
    )


def create_supervisor_chain() -> Any:
    """Create chain for supervisor routing decision."""
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


def create_validator_chain() -> Any:
    """Create chain for document relevance validation."""
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
    return prompt | get_llm(settings.supervisor_model).with_structured_output(GradeDocuments)


def create_generator_chain() -> Any:
    """Create chain for grounded answer generation with structured output."""
    # متغیر transparency_note اضافه شده تا به صورت داینامیک از گره تزریق شود
    system_prompt = (
        "You are an expert educational assistant.\n"
        "{transparency_note}\n"
        "Your task is to answer the user's question using ONLY the provided Context.\n"
        "RULES:\n"
        "1. Do not use outside knowledge.\n"
        "2. Write the main response in the 'answer' field using markdown.\n"
        "3. For video sources, cite them inline using [MM:SS] format inside the 'answer' field.\n"
        "4. For web sources, extract their URL and Title and put them in the 'web_sources' list array. Do NOT paste raw URLs in the text.\n"
        "Context:\n{context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{query}"),
    ])
    
    settings = get_settings()
    # استفاده از FinalAnswerSchema برای یکپارچگی با State
    return prompt | get_llm(settings.generator_model).with_structured_output(FinalAnswerSchema)


def create_chapters_chain() -> Any:
    """Create chain that turns a raw, timestamped transcript into a YouTube-style chapter list.

    This is what feeds `timeline_items` in VideoTimelinePanel. It must NEVER see the user's
    chat query — it only ever looks at the transcript — so chapter titles can never end up
    being the user's question.
    """
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

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Generate the chapter list now, based only on the transcript segments above."),
    ])

    settings = get_settings()
    return prompt | get_llm(settings.generator_model).with_structured_output(VideoChaptersSchema)


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