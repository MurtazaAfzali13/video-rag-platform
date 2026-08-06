"""Chunk YouTube transcripts and store embeddings in Pinecone (batched, async, with retries)."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings

logger = logging.getLogger(__name__)

COMBINE_TARGET_CHARS = 800
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


UPSERT_BATCH_SIZE = 200          
MAX_CONCURRENT_BATCHES = 4    
MAX_RETRIES_PER_BATCH = 4       
RETRY_BASE_DELAY_SECONDS = 2.0   


def _build_combined_documents(
    transcript_data: list[dict[str, Any]],
    video_id: str,
    user_id: str,
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
    combined_docs = _build_combined_documents(transcript_data, video_id="_", user_id="_")

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


def _chunk_list(items: list[Any], size: int) -> list[list[Any]]:
    """Split a flat list into consecutive sub-lists of at most `size` items each."""
    return [items[i : i + size] for i in range(0, len(items), size)]


async def _upsert_batch_with_retry(
    vector_store: PineconeVectorStore,
    batch: list[Document],
    batch_index: int,
    total_batches: int,
) -> int:
    """Embed + upsert a single batch of chunks, retrying with exponential backoff.

    Only this batch is retried on failure — the other 199 (or however many) successful
    batches from the same video are never redone. If every retry is exhausted, the
    original exception is re-raised so the caller knows ingestion is incomplete.
    """
    last_exc: Exception | None = None

    for attempt in range(1, MAX_RETRIES_PER_BATCH + 1):
        try:
            await vector_store.aadd_documents(batch)
            logger.info(
                "Batch %d/%d ingested successfully (%d chunks).",
                batch_index, total_batches, len(batch),
            )
            return len(batch)
        except Exception as exc:  # noqa: BLE001 - retry deliberately on any transient failure
            last_exc = exc
            if attempt == MAX_RETRIES_PER_BATCH:
                break
            delay = RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
            logger.warning(
                "Batch %d/%d failed on attempt %d/%d (%s). Retrying in %.1fs...",
                batch_index, total_batches, attempt, MAX_RETRIES_PER_BATCH, exc, delay,
            )
            await asyncio.sleep(delay)

    logger.error(
        "Batch %d/%d permanently failed after %d attempts: %s",
        batch_index, total_batches, MAX_RETRIES_PER_BATCH, last_exc,
    )
    assert last_exc is not None
    raise last_exc


async def process_and_ingest_video(
    transcript_data: list[dict[str, Any]],
    video_id: str,
    user_id: str,
) -> int:
    """Split transcript into chunks and upsert vectors into Pinecone in controlled batches.

    Instead of embedding + upserting every chunk of a video (which for a ~12h video can be
    ~10,000 chunks) in a single call, this splits the work into batches of
    `UPSERT_BATCH_SIZE` chunks, runs up to `MAX_CONCURRENT_BATCHES` of them concurrently via
    asyncio, and retries any batch that fails on its own with exponential backoff — instead
    of one giant fragile call that either fully succeeds or fully fails.
    """
    settings = get_settings()
    settings.validate_for_ingestion()

    combined_docs = _build_combined_documents(transcript_data, video_id, user_id)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", "?", "!", " ", ""],
    )
    final_chunks = text_splitter.split_documents(combined_docs)

    if not final_chunks:
        logger.warning("No chunks produced for video %s — nothing to ingest.", video_id)
        return 0

    vector_store = PineconeVectorStore(
        index_name=settings.index_name,
        embedding=_get_embeddings(),
        pinecone_api_key=settings.pinecone_api_key,
        namespace=user_id,
    )

    batches = _chunk_list(final_chunks, UPSERT_BATCH_SIZE)
    total_batches = len(batches)
    logger.info(
        "Ingesting video %s: %d chunks split into %d batches "
        "(batch size=%d, max concurrency=%d).",
        video_id, len(final_chunks), total_batches, UPSERT_BATCH_SIZE, MAX_CONCURRENT_BATCHES,
    )

    # Semaphore کنترل می‌کند که در هر لحظه حداکثر چند batch هم‌زمان در حال
    # embed/upsert شدن باشند — نه همه‌ی batchها یک‌جا، و نه کاملاً یکی‌یکی.
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_BATCHES)

    async def _run_batch(batch: list[Document], index: int) -> int:
        async with semaphore:
            return await _upsert_batch_with_retry(vector_store, batch, index, total_batches)

    tasks = [_run_batch(batch, i + 1) for i, batch in enumerate(batches)]

    # return_exceptions=True یعنی اگر یک یا چند batch نهایتاً (بعد از همه‌ی retryها) شکست
    # بخورند، بقیه‌ی batchهای موفق از دست نمی‌روند — همه اجرا می‌شوند و بعد جمع‌بندی می‌کنیم.
    results = await asyncio.gather(*tasks, return_exceptions=True)

    processed = 0
    failed_batches = 0
    for result in results:
        if isinstance(result, Exception):
            failed_batches += 1
        else:
            processed += result

    if failed_batches:
        logger.error(
            "Ingestion for video %s finished with %d/%d failed batches (%d/%d chunks stored).",
            video_id, failed_batches, total_batches, processed, len(final_chunks),
        )
        raise RuntimeError(
            f"{failed_batches} از {total_batches} دسته در حین ذخیره‌سازی embedding با خطا "
            f"مواجه شدند ({processed} از {len(final_chunks)} chunk با موفقیت ذخیره شد)."
        )

    logger.info(
        "Ingestion for video %s completed successfully: %d/%d chunks stored in %d batches.",
        video_id, processed, len(final_chunks), total_batches,
    )
    return processed