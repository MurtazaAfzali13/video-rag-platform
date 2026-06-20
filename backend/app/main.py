

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from youtube_transcript_api._errors import YouTubeTranscriptApiException
from langchain_core.messages import HumanMessage

from app.config import get_settings
from app.ingestion import process_and_ingest_video
from app.youtube_client import (
    extract_video_id,
    fetch_transcript,
    is_invalid_video_id,
    is_transcript_blocked,
    is_transcript_not_found,
)
from app.graph.workflow import get_agent_graph

logger = logging.getLogger(__name__)


# --- Pydantic Schemas ---

class VideoRequest(BaseModel):
    video_url: str = Field(..., min_length=1, description="Full YouTube watch or share URL")
    user_id: str = Field(..., min_length=1, description="User namespace in Pinecone")


class ProcessVideoResponse(BaseModel):
    status: str
    video_id: str
    chunks_processed: int
    message: str


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="The user's question")
    user_id: str = Field(..., min_length=1, description="User namespace in Pinecone")
    video_id: Optional[str] = Field(None, description="Optional YouTube video ID for video-scoped RAG")


class ChatResponse(BaseModel):
    response: str


class HealthResponse(BaseModel):
    status: str
    app: str


# --- Lifespan Configuration ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    try:
        settings.validate_for_ingestion()
    except ValueError as exc:
        logger.warning("Startup validation: %s", exc)
    yield




def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description=(
            "Fetches YouTube captions, chunks them, stores vector embeddings "
            "in Pinecone, and routes contextual or general queries using LangGraph."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Endpoints ---

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", app=settings.app_name)

    @app.post("/api/process-video", response_model=ProcessVideoResponse)
    async def process_video(request: VideoRequest) -> ProcessVideoResponse:
        video_id = extract_video_id(request.video_url)
        if not video_id:
            raise HTTPException(
                status_code=400,
                detail="لینک یوتیوب نامعتبر است.",
            )

        try:
            transcript = await asyncio.to_thread(fetch_transcript, video_id)
            chunks_processed = await asyncio.to_thread(
                process_and_ingest_video,
                transcript,
                video_id,
                request.user_id,
            )
        except YouTubeTranscriptApiException as exc:
            if is_invalid_video_id(exc):
                raise HTTPException(
                    status_code=400,
                    detail="شناسه ویدیو نامعتبر است.",
                ) from exc
            if is_transcript_not_found(exc):
                raise HTTPException(
                    status_code=404,
                    detail="زیرنویس برای این ویدیو یافت نشد.",
                ) from exc
            if is_transcript_blocked(exc):
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "یوتیوب درخواست را مسدود کرده است. "
                        "لطفاً بعداً دوباره تلاش کنید یا از IP دیگری استفاده کنید."
                    ),
                ) from exc
            logger.exception("YouTube transcript error for %s", video_id)
            raise HTTPException(
                status_code=502,
                detail="دریافت زیرنویس از یوتیوب با خطا مواجه شد.",
            ) from exc
        except ValueError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except Exception as exc:
            logger.exception("Failed to process video %s", video_id)
            raise HTTPException(
                status_code=500,
                detail=f"خطای سرور: {exc}",
            ) from exc

        return ProcessVideoResponse(
            status="success",
            video_id=video_id,
            chunks_processed=chunks_processed,
            message="ویدیو با موفقیت پردازش و در دیتابیس ذخیره شد.",
        )

    @app.post("/api/chat", response_model=ChatResponse)
    async def chat_endpoint(request: ChatRequest) -> ChatResponse:
        try:
            initial_state = {
                "messages": [HumanMessage(content=request.query)],
                "query": request.query,
                "user_id": request.user_id,
                "video_id": request.video_id,
                "response": None
            }
            
            result = await asyncio.to_thread(get_agent_graph().invoke, initial_state)
            
            if not result or "response" not in result or not result["response"]:
                raise HTTPException(status_code=500, detail="پاسخی از مدل دریافت نشد.")
                
            return ChatResponse(response=result["response"])
            
        except Exception as exc:
            logger.exception("Error occurred during LangGraph workflow execution for user %s", request.user_id)
            raise HTTPException(
                status_code=500, 
                detail=f"خطای سرور در جریان هوش مصنوعی: {str(exc)}"
            )

    return app


app = create_app()