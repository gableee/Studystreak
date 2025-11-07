"""
Utilities for consistent truncation and ellipsis handling.

Rules:
- Use typographic ellipsis (U+2026, '…') when and only when content is actually truncated.
- Before appending an ellipsis, strip trailing punctuation characters to avoid sequences like '....' or '.…'.
- When not truncated, ensure the text ends with normal sentence punctuation (., !, ?, or …).
"""

from __future__ import annotations

import re
from typing import Tuple

ELLIPSIS = "\u2026"  # single-character typographic ellipsis


def _strip_trailing_punctuation(text: str) -> str:
    """Strip trailing sentence/phrase punctuation before adding an ellipsis.

    Removes trailing characters in the set [.,;:!?…] to avoid duplicates like '....' or '.…'.
    """
    return re.sub(r"[\.,;:!\?\u2026]+$", "", text or "").rstrip()


def finalize_with_ellipsis(snippet: str, truncated: bool) -> str:
    """Finalize a snippet based on whether it was truncated.

    - If truncated: strip trailing punctuation and append a single typographic ellipsis.
    - If not truncated: ensure the snippet ends with sentence punctuation (., !, ?, or …).
    """
    if snippet is None:
        return ""

    snippet = snippet.rstrip()

    if truncated:
        clean = _strip_trailing_punctuation(snippet)
        return f"{clean}{ELLIPSIS}"
    else:
        # Ensure terminal punctuation if missing
        if not re.search(r"[\.\!\?\u2026]$", snippet):
            return snippet + "."
        return snippet


def truncate_words(text: str, limit: int) -> Tuple[str, bool]:
    """Truncate at word boundary to the first `limit` words.

    Returns (result, was_truncated) where result has ellipsis logic applied via finalize_with_ellipsis.
    """
    words = (text or "").strip().split()
    was_truncated = len(words) > limit
    snippet = " ".join(words[:limit]).rstrip()
    return finalize_with_ellipsis(snippet, was_truncated), was_truncated


def clip_chars(text: str, limit: int) -> Tuple[str, bool]:
    """Clip by character count (simple slice), returning (result, was_truncated).

    Applies punctuation sanitization and typographic ellipsis only if truncated.
    """
    text = (text or "").strip()
    if len(text) <= limit:
        return finalize_with_ellipsis(text, False), False

    snippet = text[:limit].rstrip()
    clean = _strip_trailing_punctuation(snippet)
    return f"{clean}{ELLIPSIS}", True
