from __future__ import annotations

from typing import Annotated, TypedDict, Optional, List

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
    response: Optional[str]
