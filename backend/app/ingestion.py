"""Chunk YouTube transcripts and store embeddings in Pinecone."""

from __future__ import annotations

from typing import Any

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings

COMBINE_TARGET_CHARS = 800
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def _build_combined_documents(
    transcript_data: list[dict[str, Any]],
    video_id: str,
    user_id: str,
    video_title: str,  # 🆕 اضافه شده برای دریافت عنوان واقعی ویدیو
) -> list[Document]:
    """Merge short caption lines into larger documents while keeping start times."""
    combined_docs: list[Document] = []
    current_text = ""
    current_start_time = 0.0

    for index, item in enumerate(transcript_data):
        if not current_text:
            current_start_time = float(item["start"])

        current_text += " " + str(item["text"]).replace("\n", " ")

        is_last_line = index == len(transcript_data) - 1
        if len(current_text) >= COMBINE_TARGET_CHARS or is_last_line:
            combined_docs.append(
                Document(
                    page_content=current_text.strip(),
                    metadata={
                        "video_id": video_id,
                        "start_time": current_start_time,
                        "user_id": user_id,
                        "video_title": video_title,  # 🆕 تزریق عنوان واقعی به متادیتا
                    },
                )
            )
            current_text = ""

    return combined_docs


def format_segments_for_llm(
    transcript_data: list[dict[str, Any]],
    max_chars: int = 12000,
) -> str:
    """Build a compact '[MM:SS] text' blob from the raw transcript for chapter-extraction prompts.

    Reuses `_build_combined_documents` so the timestamps line up with the same segment
    boundaries used for ingestion, then truncates to keep the prompt within a safe size.
    """
    # 🆕 یک مقدار ساختگی ("_") برای video_title پاس می‌دهیم چون اینجا فقط متن برای خلاصه‌سازی لازم است
    combined_docs = _build_combined_documents(
        transcript_data, video_id="_", user_id="_", video_title="_"
    )

    lines: list[str] = []
    total_chars = 0
    for doc in combined_docs:
        start_time = doc.metadata.get("start_time", 0.0)
        minutes, seconds = int(start_time // 60), int(start_time % 60)
        line = f"[{minutes:02d}:{seconds:02d}] {doc.page_content.strip()}"
        if total_chars + len(line) > max_chars:
            break
        lines.append(line)
        total_chars += len(line)

    return "\n\n".join(lines)


def _get_embeddings() -> OpenAIEmbeddings:
    """OpenRouter exposes an OpenAI-compatible API for embeddings."""
    settings = get_settings()
    settings.validate_for_ingestion()

    return OpenAIEmbeddings(
        model=settings.embedding_model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        check_embedding_ctx_length=False,
    )


def process_and_ingest_video(
    transcript_data: list[dict[str, Any]],
    video_id: str,
    user_id: str,
    video_title: str,  # 🆕 اضافه شده برای دریافت عنوان واقعی ویدیو
) -> int:
    """Split transcript into chunks and upsert vectors into Pinecone."""
    settings = get_settings()
    settings.validate_for_ingestion()

    # 🆕 عنوان ویدیو را به تابع بیلد پاس می‌دهیم
    combined_docs = _build_combined_documents(transcript_data, video_id, user_id, video_title)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", "?", "!", " ", ""],
    )
    final_chunks = text_splitter.split_documents(combined_docs)

    PineconeVectorStore.from_documents(
        documents=final_chunks,
        embedding=_get_embeddings(),
        index_name=settings.index_name,
        namespace=user_id,
        pinecone_api_key=settings.pinecone_api_key,
    )

    return len(final_chunks)