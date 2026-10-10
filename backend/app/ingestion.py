"""Small-to-Big ingestion: precise child chunks -> Pinecone, context-rich parents -> Supabase."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore

from app.config import get_settings
from app.parent_store import delete_video_parents, make_parent_id, save_parents

logger = logging.getLogger(__name__)

# ── Tunables ────────────────────────────────────────────────────────────────
LINE_TARGET_CHARS = 220     
MIN_LINE_CHARS = 110         
GAP_BREAK_SECONDS = 3.0     
CHILD_LINES = 2             
CHILD_STRIDE = 1            
PARENT_LINES = 10         
MIN_LAST_PARENT_LINES = 3   

_NOISE_RE = re.compile(r"\[(?:music|applause|laughter|silence|cheering)[^\]]*\]", re.IGNORECASE)
_WS_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class _Line:
    start: float
    end: float
    text: str


def format_ts(seconds: float) -> str:
    total = max(0, int(seconds))
    return f"{total // 60:02d}:{total % 60:02d}"


def _clean(text: Any) -> str:
    return _WS_RE.sub(" ", _NOISE_RE.sub(" ", str(text))).strip()


def _build_lines(transcript_data: list[dict[str, Any]]) -> list[_Line]:
    """Merge raw caption segments into timestamped lines, breaking on size or long pauses."""
    lines: list[_Line] = []
    parts: list[str] = []
    size = 0
    start = end = last_end = 0.0

    def flush() -> None:
        nonlocal parts, size
        if parts:
            lines.append(_Line(start, end, " ".join(parts)))
        parts, size = [], 0

    for item in transcript_data:
        text = _clean(item.get("text", ""))
        if not text:
            continue
        seg_start = float(item.get("start", 0.0))
        seg_end = seg_start + float(item.get("duration", 0.0) or 0.0)

        gap = seg_start - last_end
        if parts and (size >= LINE_TARGET_CHARS or (gap > GAP_BREAK_SECONDS and size >= MIN_LINE_CHARS)):
            flush()
        if not parts:
            start = seg_start
        parts.append(text)
        size += len(text) + 1
        end = seg_end
        last_end = seg_end

    flush()
    return lines


def _group_parents(lines: list[_Line]) -> list[list[_Line]]:
    groups = [lines[i : i + PARENT_LINES] for i in range(0, len(lines), PARENT_LINES)]
    if len(groups) > 1 and len(groups[-1]) < MIN_LAST_PARENT_LINES:
        groups[-2].extend(groups.pop())
    return groups


def _child_windows(group: list[_Line]) -> list[list[_Line]]:
    if len(group) <= CHILD_LINES:
        return [group]
    return [group[i : i + CHILD_LINES] for i in range(0, len(group) - CHILD_LINES + 1, CHILD_STRIDE)]


def _with_title(video_title: str, text: str) -> str:
    """Cheap contextual header (no LLM call): helps retrieval when a chunk says 'it'/'this'."""
    title = (video_title or "").strip()
    if not title or title.startswith(("YouTube Video", "Processing Video")):
        return text
    return f"{title}\n{text}"


def _render(lines: list[_Line]) -> str:
    return "\n".join(f"[{format_ts(l.start)}] {l.text}" for l in lines)


def format_segments_for_llm(
    transcript_data: list[dict[str, Any]],
    max_chars: int = 12000,
) -> str:
    """Timestamped transcript for chapter generation.

    If it doesn't fit, lines are sampled EVENLY across the whole video instead of
    truncating the tail (truncation made chapters cover only the start of the video).
    """
    lines = _build_lines(transcript_data)
    rendered = [f"[{format_ts(l.start)}] {l.text}" for l in lines]
    total = sum(len(r) + 2 for r in rendered)
    if total > max_chars and rendered:
        step = -(-total // max_chars)  # ceil
        rendered = rendered[::step]
    return "\n\n".join(rendered)


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
    video_title: str,
) -> int:
    """Returns the number of child chunks indexed."""
    settings = get_settings()
    settings.validate_for_ingestion()

    lines = _build_lines(transcript_data)
    if not lines:
        return 0
    groups = _group_parents(lines)

    parent_rows: list[dict[str, Any]] = []
    children: list[Document] = []
    child_ids: list[str] = []

    for p_idx, group in enumerate(groups):
        parent_id = make_parent_id(video_id, p_idx)
        parent_rows.append(
            {
                "id": parent_id,
                "video_id": video_id,
                "user_id": user_id,
                "idx": p_idx,
                "start_time": group[0].start,
                "end_time": group[-1].end,
                "content": _render(group),
            }
        )

        windows = _child_windows(group)
        for c_pos, window in enumerate(windows):
            text = " ".join(l.text for l in window)
            children.append(
                Document(
                    page_content=_with_title(video_title, text),
                    metadata={
                        "video_id": video_id,
                        "user_id": user_id,
                        "video_title": video_title,
                        "parent_id": parent_id,
                        "parent_idx": p_idx,
                        "parent_count": len(groups),
                        "child_pos": c_pos,
                        "child_count": len(windows),
                        "start_time": window[0].start,
                        "end_time": window[-1].end,
                    },
                )
            )
            child_ids.append(f"{video_id}_c{p_idx:04d}_{c_pos:02d}")

    store = PineconeVectorStore(
        index_name=settings.index_name,
        embedding=_get_embeddings(),
        pinecone_api_key=settings.pinecone_api_key,
        namespace=user_id,
    )

    # Clean re-ingestion: drop stale parents and any legacy (pre Small-to-Big) vectors.
    delete_video_parents(video_id, user_id)
    try:
        store.delete(filter={"video_id": {"$eq": video_id}})
    except Exception as exc:  # not every Pinecone index type supports delete-by-metadata
        logger.warning("Could not purge old vectors for video %s: %s", video_id, exc)

    save_parents(parent_rows)
    store.add_documents(children, ids=child_ids)

    logger.info(
        "Ingested video %s: %d lines -> %d parents, %d children",
        video_id, len(lines), len(parent_rows), len(children),
    )
    return len(children)
