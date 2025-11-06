"""
FastAPI routes for text extraction.
Handles PDF and PPTX file parsing, and generic text files.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from utils.extract_text import extract_text_from_url

router = APIRouter(prefix="/extract", tags=["extraction"])
logger = logging.getLogger(__name__)


class ExtractTextResponse(BaseModel):
    text: str
    pages: Optional[int] = None
    word_count: int


@router.post("/text", response_model=ExtractTextResponse)
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from uploaded file (PDF, PPTX, or text-like).
    """
    logger.info(f"Extracting text from file: {file.filename}")
    try:
        # Save to memory and reuse URL-extractor logic by using a data URL would be heavy;
        # here we read and route within service — but keeping route parity, we decode directly.
        data = await file.read()
        # Reuse logic by writing a small branch similar to URL extractor
        from utils.extract_text import extract_from_pdf, extract_from_pptx, to_word_count

        text = ""
        pages: Optional[int] = None
        mime = (file.content_type or "").lower()
        name = (file.filename or "").lower()

        if "pdf" in mime or name.endswith(".pdf"):
            text, pages = extract_from_pdf(data)
        elif any(name.endswith(ext) for ext in (".ppt", ".pptx", ".pps", ".ppsx")) or "presentation" in mime:
            text = extract_from_pptx(data)
        else:
            text = data.decode(errors="ignore")

        text = text.strip()
        wc = to_word_count(text)
        return ExtractTextResponse(text=text, pages=pages, word_count=wc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extraction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to extract text")


class ExtractFromUrlRequest(BaseModel):
    url: str
    content_type: Optional[str] = None


@router.post("/from-url", response_model=ExtractTextResponse)
async def extract_from_url(req: ExtractFromUrlRequest):
    """Extract text by downloading the file from a temporary signed URL."""
    logger.info(f"Extracting text from URL: {req.url}")
    try:
        text, pages, wc = await extract_text_from_url(req.url, req.content_type)
        return ExtractTextResponse(text=text, pages=pages, word_count=wc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"URL extraction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to extract text from URL")
