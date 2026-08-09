"""YouTube URL parsing and transcript fetching."""

from __future__ import annotations

import logging
import re
from typing import Any
import httpx

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    CouldNotRetrieveTranscript,
    InvalidVideoId,
    IpBlocked,
    NoTranscriptFound,
    RequestBlocked,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeTranscriptApiException,
)

logger = logging.getLogger(__name__)

# Standard watch URLs, youtu.be, shorts, and embed links
YOUTUBE_VIDEO_ID_PATTERN = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([0-9A-Za-z_-]{11})"
)

PREFERRED_LANGUAGES = ("en", "fa")


def extract_video_id(url: str) -> str | None:
    """Return the 11-character YouTube video ID from a URL, or None if invalid."""
    match = YOUTUBE_VIDEO_ID_PATTERN.search(url.strip())
    return match.group(1) if match else None


async def fetch_video_title(video_id: str) -> str:
    """Fetch the actual title of the YouTube video using the oEmbed API."""
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.json().get("title") or f"YouTube Video — {video_id}"
    except Exception as exc:
        logger.warning("Failed to fetch YouTube title for %s: %s", video_id, exc)
    return f"YouTube Video — {video_id}"


def fetch_transcript(
    video_id: str, 
    proxies: dict[str, str] | None = None
) -> list[dict[str, Any]]:
    """
    Fetch captions for a video (English or Persian preferred).
    Returns raw transcript entries: [{"text": "...", "start": 0.0, "duration": ...}, ...]
    """
    # استفاده از متد fetch دقیقا مشابه کدهای قدیمی شما که به درستی کار می‌کرد
    if proxies:
        api = YouTubeTranscriptApi(proxies=proxies)
    else:
        api = YouTubeTranscriptApi()
        
    fetched = api.fetch(video_id, languages=list(PREFERRED_LANGUAGES))
    return fetched.to_raw_data()


def is_transcript_not_found(exc: YouTubeTranscriptApiException) -> bool:
    return isinstance(
        exc,
        (
            CouldNotRetrieveTranscript,
            NoTranscriptFound,
            TranscriptsDisabled,
            VideoUnavailable,
        ),
    )


def is_transcript_blocked(exc: YouTubeTranscriptApiException) -> bool:
    return isinstance(exc, (RequestBlocked, IpBlocked))


def is_invalid_video_id(exc: YouTubeTranscriptApiException) -> bool:
    return isinstance(exc, InvalidVideoId)