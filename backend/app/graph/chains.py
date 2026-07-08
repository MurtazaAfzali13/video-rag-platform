# app/graph/chains.py
import json
import logging
from typing import Any, List, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.graph.state import (
    RouteDecision, 
    GradeDocuments, 
    GroundedAnswer,
    VideoSummarySchema
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
    system_prompt = (
        "You are an expert educational assistant.\n"
        "{transparency_note}"
        "Answer the user's question using ONLY the provided Context below.\n"
        "RULES:\n"
        "1. Do not use outside knowledge. If the context is insufficient, set has_sufficient_context=false "
        "and write in `answer` that you don't know, in the same language as the user's query.\n"
        "2. Write `answer` in the same language the user asked in (Persian/Dari or English).\n"
        "3. Do NOT write citations, URLs, or timestamps inside `answer` itself — put every source as a "
        "separate structured entry in `sources`, using the exact video_id/url/timestamp values shown in the Context "
        "labels (e.g. [VIDEO_SOURCE 1], [WEB_SOURCE 2]). Never invent a URL or placeholder text.\n"
        "4. If there are no sources, return an empty sources list.\n\n"
        "Context:\n{context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{query}"),
    ])
    
    settings = get_settings()
    return prompt | get_llm(settings.generator_model).with_structured_output(GroundedAnswer)


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