from __future__ import annotations

from typing import Annotated, TypedDict, Optional, List, Literal

from langchain_core.messages import AnyMessage, BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field


# ============================================================================
# 1) Contextualize / Rewrite Node schema
# ============================================================================

class ContextualizedQuery(BaseModel):
    """Output of the history-aware query rewriter (fixes the memory bug)."""

    standalone_query: str = Field(
        ...,
        description=(
            "The user's latest message rewritten as a fully standalone question that "
            "makes sense WITHOUT the chat history. If the original message already stands "
            "on its own, return it unchanged. Preserve the original language of the user "
            "(do not translate)."
        ),
    )
    is_follow_up: bool = Field(
        ...,
        description="True if the original message relied on prior conversational context (pronouns, ellipsis, 'and what about...', etc.).",
    )


# ============================================================================
# 2) Reranker schema (LLM-based fallback path)
# ============================================================================

class RerankedDoc(BaseModel):
    index: int = Field(..., description="0-based index of the document in the list it was given, exactly as provided.")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Relevance of this chunk to the query, 0=irrelevant, 1=perfectly relevant.")


class RerankResult(BaseModel):
    ranked: List[RerankedDoc] = Field(..., description="One entry per input document, in any order, each scored independently.")


# ============================================================================
# Existing schemas (unchanged)
# ============================================================================

class KeyTakeaway(BaseModel):
    timestamp: str = Field(
        ...,
        description="The timestamp in MM:SS format where this topic is discussed.",
    )
    point: str = Field(
        ...,
        description="A concise, high-impact summary of the concept or topic covered.",
    )


class VideoSummarySchema(BaseModel):
    type: Literal["video_summary"] = Field(
        default="video_summary",
        description="Always set this to 'video_summary'.",
    )
    title: str = Field(..., description="An optimized, descriptive title for the video.")
    overall_summary: str = Field(
        ...,
        description="A comprehensive 2-3 paragraph overview of the video's core content.",
    )
    key_takeaways: List[KeyTakeaway] = Field(
        ...,
        description="Chronological list of key points with their precise timestamps.",
    )
    academic_conclusion: str = Field(
        ...,
        description="A sophisticated concluding statement wrapping up the video's main thesis.",
    )


class ChapterItem(BaseModel):
    time: str = Field(
        ...,
        description=(
            "Timestamp in MM:SS format where this chapter begins. "
            "MUST be copied EXACTLY from one of the [MM:SS] markers given in the transcript "
            "segments — never invent or estimate a timestamp."
        ),
    )
    title: str = Field(
        ...,
        description=(
            "A short, punchy topic heading (3-7 words) describing what is being discussed "
            "in the VIDEO at this timestamp, e.g. 'Setting up the Environment'. "
            "This is a topic label, NEVER a question and NEVER related to any user chat message."
        ),
    )
    description: str = Field(
        ...,
        description="One concise sentence summarizing what this specific chapter/segment covers.",
    )


class VideoChaptersSchema(BaseModel):
    chapters: List[ChapterItem] = Field(
        default=[],
        description=(
            "Chronological list of 4-12 distinct topical chapters that organize the whole video. "
            "Return an empty list if the transcript is too short, too generic, or otherwise "
            "insufficient to derive meaningful chapters."
        ),
    )


class RouteDecision(BaseModel):
    reasoning: str = Field(
        ...,
        description="Briefly explain your reasoning for choosing the intent based on the user query and search_scope.",
    )
    intent: Literal["video_summary", "video_qa", "general_qa"] = Field(
        ...,
        description="The appropriate next step. "
        "Choose 'video_summary' if the user asks for a summary/overview. "
        "Choose 'video_qa' if the user asks a specific question and search_scope is 'single_video'. "
        "Choose 'general_qa' if the search_scope is 'general'.",
    )


class GradeDocuments(BaseModel):
    binary_score: Literal["yes", "no"] = Field(
        ...,
        description="Documents are relevant to the question? Answer 'yes' if the context contains enough direct facts to answer, otherwise answer 'no'.",
    )
    explanation: str = Field(
        ...,
        description="Briefly explain why the documents are relevant or missing the required information.",
    )


class SourceSchema(BaseModel):
    source_type: Literal["video", "web"] = Field(
        ..., description="Specify if the source is from a 'video' or 'web'."
    )
    video_id: Optional[str] = Field(
        None,
        description="YouTube video ID this source belongs to (only for source_type='video').",
    )
    start_time: Optional[int] = Field(
        None,
        description="The exact start time in seconds (e.g., 214) if this is a video source.",
    )
    title: Optional[str] = Field(
        None,
        description="A short, catchy title for this specific video chapter or web page (e.g., 'React Algorithms').",
    )
    description: Optional[str] = Field(
        None,
        description="A brief 1-sentence description of what is covered in this video segment. Leave null for web.",
    )
    url: Optional[str] = Field(
        None, description="The direct URL of the source if this is a web source."
    )


class FinalAnswerSchema(BaseModel):
    type: Literal["qa_response"] = Field(
        default="qa_response", description="Always set this to 'qa_response'."
    )
    answer: str = Field(
        ...,
        description="The main answer text in markdown format. Do NOT include raw URLs or raw timestamps inside this text.",
    )
    sources: List[SourceSchema] = Field(
        default=[],
        description="List of all sources (video timestamps and web links) used to generate this answer.",
    )


# ============================================================================
# Graph state
# ============================================================================

class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]

    # Raw query exactly as typed by the user this turn (used for storage/title/etc.)
    query: str
    # History-aware, fully self-contained version of `query` — this is what every
    # downstream node (supervisor/retriever/generator/summary) must consume.
    # Populated by contextualize_node. Falls back to `query` when chat_history is empty.
    standalone_query: Optional[str]
    # Last N turns pulled from Supabase, converted to LangChain messages, injected
    # by the /chat endpoint BEFORE the graph runs. This is the actual fix for the
    # "no memory" bug — previously this never existed in state at all.
    chat_history: List[BaseMessage]

    user_id: str
    video_id: Optional[str]

    search_scope: Literal["general", "single_video"]
    next_node: Optional[str]

    documents: Optional[List[dict]]
    # Deduplicated list of every distinct video_id present in the final (reranked)
    # document set. Lets the API layer / frontend know exactly which sources were
    # actually used, independent of what the LLM claims in FinalAnswerSchema.sources.
    retrieved_video_ids: Optional[List[str]]

    response: Optional[str]

    retriever_time_ms: int
    reranker_time_ms: int
    validator_time_ms: int
    generator_time_ms: int

    web_search_time_ms: int
    other_time_ms: int
