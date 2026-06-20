"""Application settings loaded from environment variables."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small"
DEFAULT_LLM_MODEL = "openai/gpt-4o-mini"


class Settings:
    """Central configuration for API keys and external services."""

    def __init__(self) -> None:
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.openrouter_base_url = os.getenv(
            "OPENROUTER_BASE_URL", OPENROUTER_BASE_URL
        ).strip()
        self.llm_model = os.getenv(
            "OPENROUTER_LLM_MODEL", DEFAULT_LLM_MODEL
        ).strip()
        self.embedding_model = os.getenv(
            "OPENROUTER_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL
        ).strip()
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY", "").strip()
        self.index_name = os.getenv("INDEX_NAME", "").strip()
        self.app_name = os.getenv("APP_NAME", "Video RAG API").strip()
        self.supabase_url = os.getenv("SUPABASE_URL", "").strip()
        self.supabase_service_role_key = os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY", ""
        ).strip()

    def validate_for_ingestion(self) -> None:
        missing = [
            name
            for name, value in (
                ("OPENROUTER_API_KEY", self.openrouter_api_key),
                ("PINECONE_API_KEY", self.pinecone_api_key),
                ("INDEX_NAME", self.index_name),
            )
            if not value
        ]
        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}"
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()