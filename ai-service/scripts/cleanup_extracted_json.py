"""Cleanup script for previously extracted reviewer JSON.

Reads the existing `.github/extractedtext.txt` (JSON) produced by earlier
pipeline runs and applies normalization:

1. Deduplicate cards (same term + definition hash)
2. Fill empty definitions from `fullDefinition` / `shortDefinition` / highlights
3. Compress verbose definitions to <=300 chars using utilities
4. Remove OCR / slide noise tokens (e.g., stray codepoints, repeated headings)
5. Normalize terms (strip, collapse whitespace, remove trailing punctuation, fix shouting)
6. Produce a compact reviewer-oriented JSON structure

Usage (from repo root or ai-service/):
    python scripts/cleanup_extracted_json.py \
        --input ../../.github/extractedtext.txt \
        --output ../../.github/extractedtext.cleaned.json

If paths omitted, it uses default locations relative to project root.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, Any, List, Tuple, Set

# Reuse cleaning utilities
try:
    from utils.clean_text import clean_text, clean_definition
except Exception:
    # Fallback minimal cleaner if module import fails
    def clean_text(text: str, max_length: int | None = None) -> str:
        text = re.sub(r"[\u2022\u25CF]", "-", text)  # bullets
        text = re.sub(r"[\u2014\u2013]", "-", text)   # dashes
        text = re.sub(r"\s+", " ", text).strip()
        if max_length and len(text) > max_length:
            return text[:max_length].rstrip() + "..."
        return text

    def clean_definition(text: str, max_chars: int = 300) -> str:
        text = clean_text(text)
        if len(text) <= max_chars:
            return text
        return text[:max_chars].rstrip() + "..."


NOISE_PATTERNS = [
    r"^ICSC\d{4,}\b",  # course code prefixes
    r"^INTRODUCTION TO DATABASE CONCEPTS.*$",
    r"^COURSE PACKET.*$",
    r"^LEARNING OBJECTIVES?$",
    r"^RANGE OF DATABASE APPLICATIONS.*$",
    r"^This presentation uses a free template.*FPPT.*$",  # Template spam
    r"^www\.\s*free-power-point-templates.*$",
    r"^\d+$",  # Just numbers
]

OCR_SYMBOLS = ["➢", "…", "—", "–", "●"]


def _load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_json(obj: Dict[str, Any], path: Path) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def normalize_term(term: str) -> str:
    """Normalize and clean up term text."""
    t = term.strip()
    t = re.sub(r"\s+", " ", t)
    # Remove leading bullet/dash markers
    t = re.sub(r"^[\-•●]\s*", "", t)
    # Remove trailing punctuation that isn't meaningful
    t = re.sub(r"[\.:;\-]+$", "", t)
    # Collapse shouting (ALL CAPS long terms) but keep acronyms
    if len(t) > 5 and t.isupper() and not re.search(r"\b(DBMS|SQL|IBM|HTML|HTTP|API|JSON|NLP|ANN|ML|AI|CNN)\b", t):
        t = t.title()
    
    # FIX: Detect incomplete terms (ending with verb/preposition) and flag for merging
    incomplete_endings = r'\b(is|are|was|were|can|should|must|will|has|have|had|provides?|allows?|enables?|refers? to|means?|represents?|to|of|for|by|with|from|in|at)$'
    if re.search(incomplete_endings, t, re.IGNORECASE):
        # Mark as incomplete (will be merged with definition later)
        return t + " [INCOMPLETE]"
    
    return t


def looks_like_noise(term: str) -> bool:
    for pat in NOISE_PATTERNS:
        if re.search(pat, term, re.IGNORECASE):
            return True
    return False


def dedupe_cards(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deduplicate cards by normalized term and definition."""
    seen: Set[Tuple[str, str]] = set()
    deduped: List[Dict[str, Any]] = []
    for c in cards:
        # Terms should already be cleaned by repair_definitions
        term = c.get("term", "").strip()
        definition = c.get("definition", "").strip()
        
        # Normalize for comparison
        term_norm = normalize_term(term) if term else ""
        key = (term_norm.lower(), definition.strip().lower())
        
        if key in seen:
            continue
        seen.add(key)
        
        # Store the cleaned term back
        c["term"] = term_norm.replace(" [INCOMPLETE]", "")  # Remove any leftover markers
        deduped.append(c)
    return deduped


def _normalize_for_compare(s: str) -> str:
    """Normalize a string for lightweight similarity comparison."""
    if not s:
        return ""
    s = s.lower()
    # remove punctuation
    s = re.sub(r"[\W_]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def remove_near_duplicate_cards(cards: List[Dict[str, Any]], overlap_threshold: float = 0.85) -> List[Dict[str, Any]]:
    """Remove near-duplicate cards where definitions/terms significantly overlap.

    This handles cases where the same sentence appears twice with minor
    differences (e.g., one copy prefixed by an icon or trailing punctuation)
    which were not caught by exact dedupe.
    """
    kept: List[Dict[str, Any]] = []
    norms: List[str] = []

    def word_set(text: str) -> Set[str]:
        return set([w for w in _normalize_for_compare(text).split() if len(w) > 1])

    for c in cards:
        def_text = c.get("definition", "") or ""
        term_text = c.get("term", "") or ""
        base = f"{term_text} {def_text}"
        norm = _normalize_for_compare(base)
        wset = word_set(norm)

        is_dup = False
        for prev in norms:
            prev_set = set(prev.split())
            if not prev_set or not wset:
                continue
            # overlap ratio relative to smaller set
            inter = len(prev_set & wset)
            smaller = min(len(prev_set), len(wset))
            if smaller == 0:
                continue
            ratio = inter / smaller
            if ratio >= overlap_threshold:
                is_dup = True
                break

        if not is_dup:
            kept.append(c)
            norms.append(" ".join(sorted(wset)))

    return kept


def repair_definitions(cards: List[Dict[str, Any]]) -> None:
    """Repair and normalize definitions, merging incomplete terms with their definitions."""
    incomplete_endings = r'\b(is|are|was|were|can|should|must|will|has|have|had|provides?|allows?|enables?|refers? to|means?|represents?|to|of|for|by|with|from|in|at|the)$'
    
    for c in cards:
        term = c.get("term", "").strip()
        definition = c.get("definition") or ""
        
        # FIX: If term ends with verb/preposition, it's incomplete - merge with definition
        if re.search(incomplete_endings, term, re.IGNORECASE):
            # Merge term + definition into full sentence
            full_text = f"{term} {definition}".strip()
            
            # Try to re-extract proper term and definition
            # Pattern: "Term is/means/refers to definition"
            match = re.match(r'^(.+?)\s+(is|are|was|were|means?|refers? to|represents?|can|provides?|allows?|enables?)\s+(.+)$', full_text, re.IGNORECASE)
            if match:
                term = match.group(1).strip()
                definition = match.group(3).strip()
                # Clean leading articles
                definition = re.sub(r'^(a|an|the)\s+', '', definition, flags=re.IGNORECASE)
            else:
                # Fallback: use first N words as term
                words = full_text.split()
                if len(words) > 5:
                    term = ' '.join(words[:4])
                    definition = ' '.join(words[4:])
        
        if not definition.strip():
            # fallback order
            for k in ("fullDefinition", "shortDefinition"):
                if c.get(k):
                    definition = c[k]
                    break
            if not definition and c.get("bulletedHighlights"):
                definition = "; ".join(h for h in c["bulletedHighlights"] if h)
        
        definition = clean_definition(definition, max_chars=300)
        # remove OCR symbols
        for sym in OCR_SYMBOLS:
            definition = definition.replace(sym, "")
        
        c["term"] = term
        c["definition"] = definition.strip()

        # Remove bulletedHighlights that duplicate the main definition
        if c.get("bulletedHighlights"):
            cleaned_bh = []
            for bh in c.get("bulletedHighlights", []):
                if not bh:
                    continue
                bh_norm = _normalize_for_compare(bh)
                def_norm = _normalize_for_compare(c["definition"])
                # If highlight is contained in definition or highly similar, skip it
                if bh_norm and (bh_norm in def_norm or def_norm in bh_norm):
                    continue
                cleaned_bh.append(bh)
            c["bulletedHighlights"] = cleaned_bh


def remove_noise_cards(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove noise cards (template text, incomplete terms, etc)."""
    filtered: List[Dict[str, Any]] = []
    for c in cards:
        term = c.get("term", "").strip()
        definition = c.get("definition", "").strip()
        
        if not term or not definition:
            continue
        if looks_like_noise(term):
            continue
        
        # Remove cards with template spam in term
        if "presentation uses a free template" in term.lower():
            continue
        if "fppt" in term.lower() and "template" in term.lower():
            continue
        
        # Remove very short or meaningless terms
        if len(term) < 3:
            continue
        
        # Remove terms that are just punctuation/symbols
        if re.match(r'^[\W\d\s]+$', term):
            continue
        
        filtered.append(c)
    return filtered


def build_topics(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Simple heuristic grouping: classify by keyword buckets."""
    buckets = {
        "Storage": ["cache", "memory", "disk", "storage", "tape"],
        "Keys": ["key", "primary", "foreign", "alternate", "natural", "composite"],
        "Models": ["relational", "hierarchical", "network"],
        "DBMS": ["dbms", "database", "record", "field", "table"],
    }
    grouped: Dict[str, List[str]] = {k: [] for k in buckets}
    misc: List[str] = []
    for c in cards:
        term = c.get("term", "")
        definition = c.get("definition", "")
        lower = term.lower()
        placed = False
        for bucket, kws in buckets.items():
            if any(kw in lower for kw in kws):
                grouped[bucket].append(f"{term}: {definition}")
                placed = True
                break
        if not placed:
            misc.append(f"{term}: {definition}")
    topics: List[Dict[str, Any]] = []
    icon_map = {"Storage": "💾", "Keys": "🔑", "Models": "🧩", "DBMS": "🗄️", "Misc": "📌"}
    for name, items in grouped.items():
        if items:
            topics.append({"title": name, "icon": icon_map.get(name, "📌"), "keypoints": items[:12]})
    if misc:
        topics.append({"title": "Misc", "icon": icon_map.get("Misc", "📌"), "keypoints": misc[:12]})
    return topics


def main() -> None:
    parser = argparse.ArgumentParser(description="Cleanup previously extracted reviewer JSON")
    parser.add_argument("--input", default="../../.github/extractedtext.txt", help="Path to input JSON file")
    parser.add_argument("--output", default="../../.github/extractedtext.cleaned.json", help="Path for cleaned JSON output")
    args = parser.parse_args()

    in_path = Path(args.input).resolve()
    out_path = Path(args.output).resolve()
    if not in_path.exists():
        raise SystemExit(f"Input file not found: {in_path}")

    raw = _load_json(in_path)
    cards = raw.get("cards", {}).get("items", [])

    # 1. Repair definitions FIRST (merge incomplete terms)
    repair_definitions(cards)
    # 2. Deduplicate
    cards = dedupe_cards(cards)
    # 2b. Remove near-duplicates that survived exact dedupe (OCR variants)
    cards = remove_near_duplicate_cards(cards)
    # 3. Remove noise / heading duplicates
    cards = remove_noise_cards(cards)
    # 4. Build topics (light grouping)
    topics = build_topics(cards)

    cleaned = {
        "source": str(in_path),
        "original_count": raw.get("cards", {}).get("count"),
        "cleaned_count": len(cards),
        "topics": topics,
        "cards": [
            {"term": c["term"], "definition": c["definition"], "icon": c.get("icon", "📌"), "importance": c.get("importance")}
            for c in cards
        ],
        "metadata": {
            "generatedFrom": "cleanup_extracted_json.py",
            "removedNoise": raw.get("cards", {}).get("count", 0) - len(cards),
        },
    }

    _save_json(cleaned, out_path)
    print(f"✓ Cleaned JSON written: {out_path}")
    print(f"Original cards: {raw.get('cards', {}).get('count')} -> Cleaned: {len(cards)}")
    print(f"Topics built: {len(topics)}")


if __name__ == "__main__":
    main()
