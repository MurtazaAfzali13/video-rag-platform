from __future__ import annotations

from typing import Annotated, TypedDict, Optional, List ,Literal

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field


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


class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    query: str
    user_id: str
    video_id: Optional[str]
    
    search_scope: Literal["general","single_video"]
    next_node: Optional[str]
    
    documents: Optional[List[dict]]
    
    response: Optional[str]
    
    retriever_time_ms: int
    validator_time_ms: int
    generator_time_ms: int


class RouteDecision(BaseModel):
    reasoning: str=Field(
        ..., 
        description="Briefly explain your reasoning for choosing the intent based on the user query and search_scope."
    )
    intent: Literal["video_summary", "video_qa", "general_qa"] = Field(
        ...,
        description="The appropriate next step. "
                    "Choose 'video_summary' if the user asks for a summary/overview. "
                    "Choose 'video_qa' if the user asks a specific question and search_scope is 'single_video'. "
                    "Choose 'general_qa' if the search_scope is 'general'."
    )
    
    
class GradeDocuments(BaseModel):
    binary_score: Literal["yes", "no"] = Field(
        ...,
        description="Documents are relevant to the question? Answer 'yes' if the context contains enough direct facts to answer, otherwise answer 'no'."
    )
    explanation: str = Field(
        ...,
        description="Briefly explain why the documents are relevant or missing the required information."
    )
    
    
class WebSourceSchema(BaseModel):
    title: str = Field(..., description="A short, descriptive title for the web page.")
    url: str = Field(..., description="The URL of the web source.")

class FinalAnswerSchema(BaseModel):
    answer: str = Field(
        ..., 
        description="The main answer text in markdown format. Do NOT include raw web URLs inside this text."
    )
    web_sources: List[WebSourceSchema] = Field(
        default=[], 
        description="List of web sources used to answer the query. Empty if no web sources were used."
    )