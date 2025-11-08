"""End-to-end reviewer pipeline (initial scaffold).

Steps:
1. Download or read PDF (from URL or local path) - supports Supabase public URLs.
2. Extract text (pdfplumber + selective OCR fallback).
3. Clean raw text (remove OCR noise, normalize bullets/whitespace).
4. Segment lines into headings & bullet points (layout-lite approach).
5. Build topics (semantic clustering optional; current heuristic-based).
6. Compress long definitions & build reviewer JSON.

Usage:
    python scripts/run_reviewer_pipeline.py --pdf-url https://.../my.pdf --output reviewer.json
    python scripts/run_reviewer_pipeline.py --pdf-path ./materials/my.pdf --output reviewer.json

Later extension:
    - Add Supabase storage integration (signed URLs, private bucket access).
    - Add embedding-based semantic clustering (topic_clustering.py) when environment ready.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from io import BytesIO

from utils.clean_text import clean_text, clean_definition
from utils.extract_text import extract_text_detailed
from utils.material_fetcher import get_material_bytes


@dataclass
class ExtractedMaterial:
    text: str
    pages: int | None
    word_count: int
    warnings: List[str]
    extraction_method: str
    coverage_pct: float


async def fetch_pdf(url: str, timeout: float = 60.0, auth_token: Optional[str] = None) -> bytes:
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"  # Supabase / service role token
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(url, headers=headers)
        r.raise_for_status()
        return r.content


async def extract_pdf(bytes_data: bytes) -> ExtractedMaterial:
    # Use advanced extraction with minimal OCR first (can tune flags)
    detailed = await extract_text_detailed(
        file_url="file://dummy.pdf",  # we feed bytes manually below
        content_type_hint="application/pdf",
        enable_ocr=True,
        mode="complete",
        full_ocr=False,
    )
    # Patch: extract_text_detailed currently downloads using URL; for local bytes workflow
    # we mimic by monkey-patching - simpler approach is to adapt extract_text_detailed to accept bytes.
    # For now we'll just reuse its logic by writing temp file.
    return ExtractedMaterial(
        text=detailed["text"],
        pages=detailed.get("pages"),
        word_count=detailed.get("word_count", 0),
        warnings=detailed.get("warnings", []),
        extraction_method=detailed.get("extraction_method", "unknown"),
        coverage_pct=detailed.get("coverage_pct", 0.0),
    )


def naive_segment(text: str) -> Dict[str, Any]:
    """Segment text lines into headings & bullet items (heuristic)."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    headings: List[str] = []
    bullets: List[str] = []
    for line in lines:
        # bullet detection
        if re.match(r"^[\-•*] \w+", line) or re.match(r"^[A-Z][^a-z]+$", line) and len(line.split()) <= 8:
            # treat all-caps short lines as headings
            if line.isupper() and len(line.split()) <= 10:
                headings.append(line.title())
            else:
                bullets.append(line)
        else:
            # heading heuristic: short line with many capitals
            if (sum(1 for ch in line if ch.isupper()) > len(line) * 0.6) and len(line.split()) <= 10:
                headings.append(line.title())
            else:
                bullets.append(line)
    return {"headings": headings, "bullets": bullets}


def build_reviewer_json(segmented: Dict[str, Any]) -> Dict[str, Any]:
    headings = segmented.get("headings", [])
    bullets = segmented.get("bullets", [])
    # Simple grouping: assign first N bullets per heading sequentially
    topics: List[Dict[str, Any]] = []
    chunk_size = max(6, int(len(bullets) / (len(headings) or 1) + 1))
    bi = 0
    for h in headings:
        slice_ = bullets[bi: bi + chunk_size]
        bi += chunk_size
        topics.append({
            "title": h,
            "icon": "📘",
            "keypoints": [clean_definition(b, max_chars=180) for b in slice_ if b]
        })
    if not topics:
        # fallback single bucket
        topics.append({
            "title": "Overview",
            "icon": "📘",
            "keypoints": [clean_definition(b, max_chars=180) for b in bullets[:24]]
        })
    return {
        "topics": topics,
        "metadata": {
            "headings_detected": len(headings),
            "total_bullets": len(bullets),
        }
    }


async def run_pipeline(material_spec: Dict[str, Any]) -> Dict[str, Any]:
    """Run pipeline on material specification.

    material_spec examples:
      {"type": "url", "url": "https://.../file.pdf"}
      {"type": "supabase", "bucket": "materials", "path": "folder/file.pdf"}
      {"type": "path", "path": "./local/file.pdf"}
    """
    t = material_spec.get("type")
    if t == "path":
        b = Path(material_spec["path"]).read_bytes()
    else:
        b = await get_material_bytes(material_spec)

    # Write bytes to a temporary in-memory buffer for extract_text_detailed adaptation
    # Currently extract_text_detailed expects URL download; we bypass by saving to temp file path if needed.
    temp_path = Path("./tmp_material.pdf")
    temp_path.write_bytes(b)
    # Use pdfplumber + optional selective OCR via existing function (point to local file path)
    # Trick: supply a file:// URL that our downloader can ignore by detecting scheme
    # Simpler: re-read with pypdf directly for this iteration.
    from pypdf import PdfReader
    reader = PdfReader(BytesIO(b))
    raw_text_parts = []
    for page in reader.pages:
        try:
            raw_text_parts.append(page.extract_text() or "")
        except Exception:
            pass
    raw_text = "\n".join(raw_text_parts)
    cleaned = clean_text(raw_text, max_length=200000)
    segmented = naive_segment(cleaned)
    reviewer = build_reviewer_json(segmented)
    reviewer["metadata"].update({
        "pages": len(reader.pages),
        "extraction": "pypdf-basic",
        "word_count": len(cleaned.split()),
        "material_type": t,
    })
    return reviewer


def main() -> None:
    parser = argparse.ArgumentParser(description="Run reviewer pipeline on a PDF")
    parser.add_argument("--pdf-url", help="Remote PDF URL (e.g. Supabase public URL)")
    parser.add_argument("--pdf-path", help="Local PDF path")
    parser.add_argument("--supabase-bucket", help="Supabase bucket name")
    parser.add_argument("--supabase-path", help="Supabase file path inside bucket")
    parser.add_argument("--auth-token", help="Bearer token for private storage access", default=None)
    parser.add_argument("--output", help="Output JSON path", default="reviewer.json")
    args = parser.parse_args()
    spec: Dict[str, Any] = {}
    if args.pdf_path:
        spec = {"type": "path", "path": args.pdf_path}
    elif args.supabase_bucket and args.supabase_path:
        spec = {"type": "supabase", "bucket": args.supabase_bucket, "path": args.supabase_path}
    elif args.pdf_url:
        spec = {"type": "url", "url": args.pdf_url, "token": args.auth_token}
    else:
        raise SystemExit("Provide one of: --pdf-path OR (--supabase-bucket + --supabase-path) OR --pdf-url")

    reviewer = asyncio.run(run_pipeline(spec))
    out_path = Path(args.output)
    out_path.write_text(json.dumps(reviewer, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Reviewer JSON saved -> {out_path}")
    print(f"Topics: {len(reviewer['topics'])}")


if __name__ == "__main__":
    main()
