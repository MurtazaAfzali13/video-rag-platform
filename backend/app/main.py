from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import get_settings
# وارد کردن روترها از پوشه مربوطه
from app.routers import video, chats,dashboard

logger = logging.getLogger(__name__)


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
    try:
        settings.validate_for_auth()
    except ValueError as exc:
        # عمداً هنوز جلوی بالا آمدن سرور را نمی‌گیریم (fail-soft در استارتاپ)، ولی این پیام
        # را به‌وضوح در لاگ می‌گذاریم تا مشکل همینجا دیده شود، نه بعداً به‌شکل یک
        # AttributeError مبهم روی اولین درخواست احراز هویت‌شده.
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
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- اتصال روترهای تفکیک‌شده به اپلیکیشن اصلی ---
    app.include_router(video.router)
    app.include_router(chats.router)
    app.include_router(dashboard.router)

    # --- اندپوینت‌های عمومی سرور ---
    @app.get("/health", response_model=HealthResponse, tags=["System"])
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", app=settings.app_name)

    return app


app = create_app()