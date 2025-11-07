"""FastAPI routes for text extraction.
Handles PDF and PPTX file parsing, and generic text files.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import io
import time
import traceback

from utils.extract_text import (
    extract_text_from_url,
    extract_text_detailed,
    extract_from_pdf,
    extract_from_pptx,
    extract_from_docx,
    to_word_count,
    download_file
)

router = APIRouter(prefix="/extract", tags=["extraction"])
logger = logging.getLogger(__name__)


class ExtractTextResponse(BaseModel):
    text: str
    pages: Optional[int] = None
    word_count: int
    coverage_pct: Optional[float] = None
    rescued_terms: Optional[List[str]] = None
    extraction_mode_used: Optional[str] = None


class ExtractTextRequest(BaseModel):
    mode: Optional[str] = "fast"  # fast | complete
    enable_ocr: Optional[bool] = None  # override default based on mode
    coverageTarget: Optional[float] = 95.0


@router.post("/text", response_model=ExtractTextResponse)
async def extract_text(file: UploadFile = File(...), req: ExtractTextRequest = None):
    """
    Extract text from uploaded file (PDF, PPTX, DOCX, or text-like).
    """
    logger.info(f"Extracting text from file: {file.filename}")
    try:
        data = await file.read()
        
        text = ""
        pages: Optional[int] = None
        mime = (file.content_type or "").lower()
        name = (file.filename or "").lower()
        mode = (req.mode if req else "fast")
        enable_ocr_flag = req.enable_ocr if req and req.enable_ocr is not None else (mode == "complete")

        # ENHANCED FILE DETECTION
        if "pdf" in mime or name.endswith(".pdf"):
            # Use detailed extractor to leverage OCR/CLIP when requested
            detailed = await extract_text_detailed(
                file_url=file.filename or "uploaded_pdf",
                content_type_hint=file.content_type,
                enable_ocr=enable_ocr_flag,
                mode=mode,
            )
            text = detailed.get("text", "")
            pages = detailed.get("pages")
            coverage_pct = detailed.get("coverage_pct")
            rescued_terms = detailed.get("rescued_terms")
            extraction_mode_used = detailed.get("extraction_mode_used")
        elif any(name.endswith(ext) for ext in (".ppt", ".pptx", ".pps", ".ppsx")) or "presentation" in mime:
            text = extract_from_pptx(data)
        # ADD DOCX SUPPORT HERE TOO
        elif any(name.endswith(ext) for ext in (".docx", ".doc")) or "word" in mime or "document" in mime:
            text = extract_from_docx(data)
        else:
            text = data.decode(errors="ignore")

        text = text.strip()
        wc = to_word_count(text)
        
        # LOG EXTRACTION QUALITY
        logger.info(f"Extracted {wc} words from {file.filename} (pages: {pages})")
        
        if wc < 50:
            logger.warning(f"Low text extraction from {file.filename}: only {wc} words")
        
        return ExtractTextResponse(
            text=text,
            pages=pages,
            word_count=wc,
            coverage_pct=locals().get("coverage_pct"),
            rescued_terms=locals().get("rescued_terms"),
            extraction_mode_used=locals().get("extraction_mode_used")
        )
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


class DebugExtractionResponse(BaseModel):
    """Comprehensive debug response with extraction diagnostics."""
    success: bool
    file_url: str
    detected_format: str
    extraction_method: str
    extracted_text: str
    text_preview: str = Field(description="First 500 chars of extracted text")
    word_count: int
    char_count: int
    pages: Optional[int] = None
    avg_words_per_page: Optional[float] = None
    ocr_triggered: bool = False
    ocr_pages: int = 0
    ocr_time_ms: float = 0.0
    warnings: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    extraction_time_ms: float
    raw_content_type: Optional[str] = None
    file_size_bytes: int
    per_page_word_counts: Optional[List[int]] = None
    tesseract_cmd_used: Optional[str] = None
    # New diagnostics
    coverage_pct: Optional[float] = None
    low_density_pages: Optional[List[int]] = None
    pages_ocrd: Optional[List[int]] = None
    extraction_mode_used: Optional[str] = None
    visual_terms: Optional[Dict[int, List[List]]] = None
    rescued_terms_count: Optional[int] = None
    

class DebugExtractionRequest(BaseModel):
    url: str
    content_type: Optional[str] = None
    enable_ocr: Optional[bool] = True
    max_ocr_pages: Optional[int] = 25
    dpi: Optional[int] = 150
    ocr_config: Optional[str] = "--oem 3 --psm 3"
    # New controls
    mode: Optional[str] = "complete"  # "fast" or "complete"
    full_ocr: Optional[bool] = False
    ocr_page_batch_size: Optional[int] = 20
    ocr_trigger_threshold: Optional[int] = 10
    ocr_word_gain_threshold: Optional[int] = 20
    coverage_word_threshold: Optional[int] = 10
    coverage_target: Optional[float] = 0.95


@router.post("/debug", response_model=DebugExtractionResponse)
async def debug_extraction(req: DebugExtractionRequest):
    """
    Debug endpoint: Extract text with comprehensive diagnostics.
    
    Returns detailed information about the extraction process:
    - Detected file format
    - Extraction method used
    - Full extracted text
    - Word/character counts
    - Warnings (low text, encoding issues, etc.)
    - Metadata (pages, file size, timing)
    
    Use this to diagnose incomplete extraction or validate AI generation inputs.
    """
    start_time = time.time()
    warnings: List[str] = []
    metadata: Dict[str, Any] = {}
    
    logger.info(f"[DEBUG] Extracting from URL: {req.url}")
    
    try:
        # Step 1: Download meta (size + type) for diagnostics
        download_start = time.time()
        data, detected_content_type = await download_file(req.url)
        download_time_ms = (time.time() - download_start) * 1000
        file_size = len(data)
        metadata["file_size_bytes"] = file_size
        metadata["download_time_ms"] = round(download_time_ms, 2)
        if file_size == 0:
            warnings.append("Downloaded file is empty (0 bytes)")
        elif file_size < 100:
            warnings.append(f"Downloaded file is very small ({file_size} bytes)")

        # Step 2: Use enhanced extractor once; it handles format detection + OCR
        detailed = await extract_text_detailed(
            file_url=req.url,
            content_type_hint=req.content_type,
            enable_ocr=bool(req.enable_ocr),
            max_ocr_pages=int(req.max_ocr_pages or 25),
            ocr_trigger_threshold=int(req.ocr_trigger_threshold or 10),
            ocr_word_gain_threshold=int(req.ocr_word_gain_threshold or 20),
            dpi=int(req.dpi or 150),
            ocr_config=req.ocr_config or "--oem 3 --psm 3",
            mode=(req.mode or "complete"),
            full_ocr=bool(req.full_ocr),
            ocr_page_batch_size=int(req.ocr_page_batch_size or 20),
            coverage_word_threshold=int(req.coverage_word_threshold or 10),
            coverage_target=float(req.coverage_target or 0.95)
        )

        text = (detailed.get("text") or "").strip()
        pages = detailed.get("pages")
        word_count = int(detailed.get("word_count") or 0)
        char_count = len(text)
        extraction_method = str(detailed.get("extraction_method") or "unknown")
        avg_words_per_page = detailed.get("avg_words_per_page")
        ocr_triggered = bool(detailed.get("ocr_triggered"))
        ocr_pages = int(detailed.get("ocr_pages") or 0)
        ocr_time_ms = float(detailed.get("ocr_time_ms") or 0.0)
        per_page_word_counts = detailed.get("per_page_word_counts") or None
        tesseract_cmd_used = detailed.get("tesseract_cmd_used")
        coverage_pct = detailed.get("coverage_pct")
        low_density_pages = detailed.get("low_density_pages")
        pages_ocrd = detailed.get("pages_ocrd")
        extraction_mode_used = detailed.get("extraction_mode_used")
        visual_terms = detailed.get("visual_terms")
        rescued_terms_count = detailed.get("rescued_terms_count")

        # Collate warnings
        warnings.extend(list(detailed.get("warnings") or []))

        # Detect format for reporting
        mime = (req.content_type or detected_content_type or "").lower()
        url_lower = req.url.lower()
        if "pdf" in mime or url_lower.endswith(".pdf"):
            detected_format = "PDF"
        elif any(url_lower.endswith(ext) for ext in (".ppt", ".pptx", ".pps", ".ppsx")) or "presentation" in mime:
            detected_format = "PPTX"
        elif any(url_lower.endswith(ext) for ext in (".docx", ".doc")) or ("word" in mime or "document" in mime):
            detected_format = "DOCX"
        else:
            detected_format = "unknown"

        # Build preview
        text_preview = text[:500] + ("..." if len(text) > 500 else "")

        total_time_ms = (time.time() - start_time) * 1000
        metadata.update({
            "total_time_ms": round(total_time_ms, 2),
        })

        logger.info(f"[DEBUG] Extraction complete: {word_count} words, OCR: {ocr_triggered} ({ocr_pages} pages)")

        return DebugExtractionResponse(
            success=True,
            file_url=req.url,
            detected_format=detected_format,
            extraction_method=extraction_method,
            extracted_text=text,
            text_preview=text_preview,
            word_count=word_count,
            char_count=char_count,
            pages=pages,
            avg_words_per_page=avg_words_per_page,
            ocr_triggered=ocr_triggered,
            ocr_pages=ocr_pages,
            ocr_time_ms=round(ocr_time_ms, 2),
            warnings=warnings,
            metadata=metadata,
            extraction_time_ms=round(total_time_ms, 2),
            raw_content_type=detected_content_type,
            file_size_bytes=file_size,
            per_page_word_counts=per_page_word_counts,
            tesseract_cmd_used=tesseract_cmd_used,
            coverage_pct=coverage_pct,
            low_density_pages=low_density_pages,
            pages_ocrd=pages_ocrd,
            extraction_mode_used=extraction_mode_used,
            visual_terms=visual_terms,
            rescued_terms_count=rescued_terms_count,
        )
        
    except Exception as e:
        logger.error(f"[DEBUG] Debug extraction failed: {e}", exc_info=True)
        
        # Return error response
        return DebugExtractionResponse(
            success=False,
            file_url=req.url,
            detected_format="error",
            extraction_method="failed",
            extracted_text="",
            text_preview="",
            word_count=0,
            char_count=0,
            warnings=[f"Fatal error: {type(e).__name__}: {str(e)}", traceback.format_exc()],
            metadata={"error": str(e)},
            extraction_time_ms=(time.time() - start_time) * 1000,
            raw_content_type=None,
            file_size_bytes=0
        )


@router.post("/debug-extraction-no-auth", response_model=DebugExtractionResponse)
async def debug_extraction_file_upload(file: UploadFile = File(...)):
    """
    Debug endpoint for file uploads (no URL required).
    Useful for testing extraction locally without Supabase storage.
    
    **WARNING: This endpoint bypasses authentication. Remove in production.**
    """
    start_time = time.time()
    warnings: List[str] = []
    metadata: Dict[str, Any] = {}
    
    logger.info(f"[DEBUG] Extracting uploaded file: {file.filename}")
    
    try:
        data = await file.read()
        file_size = len(data)
        
        metadata["file_size_bytes"] = file_size
        metadata["filename"] = file.filename
        metadata["content_type"] = file.content_type
        
        if file_size == 0:
            warnings.append("Uploaded file is empty (0 bytes)")
        
        # Detect format
        mime = (file.content_type or "").lower()
        filename_lower = (file.filename or "").lower()
        
        detected_format = "unknown"
        extraction_method = "none"
        text = ""
        pages: Optional[int] = None
        
        extract_start = time.time()
        
        try:
            # Use enhanced extractor for uploaded file by writing to a temp BytesIO accessible via a pseudo URL scheme
            # Since extract_text_detailed expects a URL, we adapt by saving and reading directly.
            # For simplicity here, reuse logic: treat upload as generic bytes decode if not PDF/PPTX/DOCX.
            pseudo_url = f"uploaded://{file.filename}"
            # Write temp file in memory and branch manually similar to enhanced logic
            if "pdf" in mime or filename_lower.endswith(".pdf"):
                detected_format = "PDF"
                # Reuse pdfplumber/pypdf via extract_from_pdf if pdfplumber not available; for OCR require external path logic not triggered here.
                text, pages = extract_from_pdf(data)
                extraction_method = "pypdf (upload)"
                metadata["pages"] = pages
                wc = to_word_count(text)
                if pages and pages > 0:
                    avg_words_per_page = wc / pages
                    metadata["avg_words_per_page"] = round(avg_words_per_page, 1)
                    if avg_words_per_page < 10:
                        warnings.append(f"Low text density ({avg_words_per_page:.1f} words/page). Consider using OCR via /extract/debug with enable_ocr=true")
            elif any(filename_lower.endswith(ext) for ext in (".ppt", ".pptx", ".pps", ".ppsx")) or "presentation" in mime:
                detected_format = "PPTX"
                extraction_method = "python-pptx (upload)"
                text = extract_from_pptx(data)
            elif any(filename_lower.endswith(ext) for ext in (".docx", ".doc")) or "word" in mime:
                detected_format = "DOCX"
                extraction_method = "python-docx (upload)"
                text = extract_from_docx(data)
            else:
                detected_format = "text/plain (fallback)"
                extraction_method = "bytes.decode(utf-8)"
                text = data.decode(errors="ignore")
                warnings.append("Unknown format, attempted text decode")
        except Exception as extract_err:
            warnings.append(f"Extraction error: {type(extract_err).__name__}: {str(extract_err)}")
            logger.error(f"[DEBUG] Extraction error: {extract_err}", exc_info=True)
            try:
                text = data.decode(errors="ignore")
                extraction_method += " (failed, fallback)"
            except Exception:
                text = "[EXTRACTION_FAILED]"
        
        extract_time_ms = (time.time() - extract_start) * 1000
        metadata["extraction_time_ms"] = round(extract_time_ms, 2)
        
        text = text.strip()
        word_count = to_word_count(text)
        char_count = len(text)
        
        if word_count < 10:
            warnings.append(f"Very low word count ({word_count} words)")
        elif word_count < 50:
            warnings.append(f"Low word count ({word_count} words)")
        
        if "EXTRACTION_WARNING" in text:
            warnings.append("Extraction produced warnings")
        if "EXTRACTION_ERROR" in text:
            warnings.append("Extraction encountered errors")
        
        text_preview = text[:500]
        if len(text) > 500:
            text_preview += "..."
        
        total_time_ms = (time.time() - start_time) * 1000
        metadata["total_time_ms"] = round(total_time_ms, 2)
        
        logger.info(f"[DEBUG] File extraction complete: {word_count} words")
        
        return DebugExtractionResponse(
            success=True,
            file_url=file.filename or "uploaded_file",
            detected_format=detected_format,
            extraction_method=extraction_method,
            extracted_text=text,
            text_preview=text_preview,
            word_count=word_count,
            char_count=char_count,
            pages=pages,
            warnings=warnings,
            metadata=metadata,
            extraction_time_ms=round(total_time_ms, 2),
            raw_content_type=file.content_type,
            file_size_bytes=file_size
        )
        
    except Exception as e:
        logger.error(f"[DEBUG] File upload debug failed: {e}", exc_info=True)
        
        return DebugExtractionResponse(
            success=False,
            file_url=file.filename or "unknown",
            detected_format="error",
            extraction_method="failed",
            extracted_text="",
            text_preview="",
            word_count=0,
            char_count=0,
            warnings=[f"Fatal error: {type(e).__name__}: {str(e)}"],
            metadata={"error": str(e)},
            extraction_time_ms=(time.time() - start_time) * 1000,
            raw_content_type=file.content_type if file else None,
            file_size_bytes=0
        )

