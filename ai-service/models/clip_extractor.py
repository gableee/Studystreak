"""
Optional CLIP-based visual term extractor.

This module is a scaffold: if OpenAI CLIP and pdf2image are available, it will attempt to
render PDF pages and produce a small set of visual labels per page using a zero-shot
style prompt list. If dependencies are not installed, it returns empty results gracefully.

Usage:
    from models.clip_extractor import extract_visual_terms_from_pdf
    terms = extract_visual_terms_from_pdf(pdf_bytes, pages=[1,2,3])
"""
from __future__ import annotations

from typing import List, Dict, Optional, Tuple
from config import get_device

try:
    from pdf2image import convert_from_bytes  # type: ignore
    HAS_PDF2IMAGE = True
except Exception:
    HAS_PDF2IMAGE = False

try:
    import torch
    import clip  # type: ignore
    from PIL import Image
    HAS_CLIP = True
except Exception:
    HAS_CLIP = False

DEFAULT_LABELS = [
    # General academic labels (expand as needed)
    "definition", "example", "algorithm", "diagram", "chart", "table", "formula",
    "code", "schema", "architecture", "flowchart", "database", "entity",
    "relationship", "hierarchy", "key", "storage", "index", "query", "transaction",
]


def extract_visual_terms_from_pdf(
    data: bytes,
    pages: Optional[List[int]] = None,
    dpi: int = 150,
    poppler_path: Optional[str] = None,
    labels: Optional[List[str]] = None,
    device: Optional[str] = None,
) -> Dict[int, List[Tuple[str, float]]]:
    """Return {page_number: [(label, score), ...]} for visual cues.

    If CLIP/pdf2image are unavailable, returns empty dict.
    This is intentionally conservative and meant to be merged with OCR text
    rather than used as a standalone extraction.
    """
    if not (HAS_PDF2IMAGE and HAS_CLIP):
        return {}

    if device is None:
        device = get_device()

    label_list = labels or DEFAULT_LABELS

    # Load CLIP (small ViT for speed)
    try:
        model, preprocess = clip.load("ViT-B/32", device=device)  # type: ignore
    except Exception:
        return {}

    try:
        if pages:
            # Batch by contiguous ranges to save rendering time
            ranges = []
            sorted_pages = sorted(set(pages))
            start = prev = sorted_pages[0]
            for p in sorted_pages[1:]:
                if p == prev + 1:
                    prev = p
                else:
                    ranges.append((start, prev))
                    start = prev = p
            ranges.append((start, prev))
        else:
            # No page list given -> extract first 5 as a conservative default
            ranges = [(1, 5)]

        label_tokens = clip.tokenize(label_list).to(device)  # type: ignore
        with torch.no_grad():
            text_features = model.encode_text(label_tokens)
            text_features /= text_features.norm(dim=-1, keepdim=True)

        results: Dict[int, List[Tuple[str, float]]] = {}
        for r_start, r_end in ranges:
            try:
                images = convert_from_bytes(
                    data,
                    dpi=dpi,
                    first_page=r_start,
                    last_page=r_end,
                    poppler_path=poppler_path,
                )
            except Exception:
                continue

            for idx, img in enumerate(images, start=r_start):
                try:
                    image_input = preprocess(img).unsqueeze(0).to(device)
                    with torch.no_grad():
                        image_features = model.encode_image(image_input)
                        image_features /= image_features.norm(dim=-1, keepdim=True)
                        logits_per_image = image_features @ text_features.T
                        probs = logits_per_image.softmax(dim=-1).squeeze(0)
                    # Take top-k labels
                    topk = min(5, len(label_list))
                    values, indices = probs.topk(topk)
                    labels_scores = [(label_list[i], float(values[j].item())) for j, i in enumerate(indices.tolist())]
                    results[idx] = labels_scores
                except Exception:
                    continue

        return results
    except Exception:
        return {}
