from __future__ import annotations

import io
from typing import Optional, Tuple

import httpx
from pypdf import PdfReader
from pptx import Presentation


async def download_file(file_url: str) -> Tuple[bytes, Optional[str]]:
    """Download a file and return bytes and detected content-type header if any."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        response = await client.get(file_url)
        response.raise_for_status()
    return response.content, response.headers.get("content-type")


def extract_from_pdf(data: bytes) -> Tuple[str, Optional[int]]:
    """Extract text from PDF bytes using pypdf."""
    text_parts: list[str] = []
    pages = 0
    with io.BytesIO(data) as bio:
        reader = PdfReader(bio)
        pages = len(reader.pages)
        for page in reader.pages:
            try:
                text_parts.append(page.extract_text() or "")
            except Exception:
                # Continue on individual page errors
                continue
    text = "\n".join(filter(None, text_parts))
    return text, pages


def extract_from_pptx(data: bytes) -> str:
    """Extract text from PPTX bytes using python-pptx."""
    with io.BytesIO(data) as bio:
        prs = Presentation(bio)
        chunks: list[str] = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    chunks.append(shape.text)
        return "\n".join(filter(None, chunks))


def to_word_count(text: str) -> int:
    words = [w for w in text.replace("\n", " ").split(" ") if w.strip()]
    return len(words)


async def extract_text_from_url(file_url: str, content_type_hint: Optional[str] = None) -> tuple[str, Optional[int], int]:
    """Download and extract text from a URL. Returns (text, pages, word_count)."""
    data, detected = await download_file(file_url)
    mime = (content_type_hint or detected or "").lower()

    text = ""
    pages: Optional[int] = None

    try:
        if "pdf" in mime or file_url.lower().endswith(".pdf"):
            text, pages = extract_from_pdf(data)
        elif any(file_url.lower().endswith(ext) for ext in (".ppt", ".pptx", ".pps", ".ppsx")) or "presentation" in mime:
            text = extract_from_pptx(data)
        else:
            # Fallback: assume text-like
            text = data.decode(errors="ignore")
    except Exception:
        # On parser failure, fallback to best-effort decode
        text = data.decode(errors="ignore")

    text = text.strip()
    wc = to_word_count(text)
    return text, pages, wc

