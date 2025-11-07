import os
import sys
import unicodedata
import pytest

# Ensure we can import utils.truncate_helpers when running from repo root
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_SERVICE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from utils.truncate_helpers import (
    ELLIPSIS,
    finalize_with_ellipsis,
    truncate_words,
    clip_chars,
)


def norm(s: str) -> str:
    """Normalize for robust comparisons with unicode."""
    return unicodedata.normalize("NFC", s)


class TestFinalizeWithEllipsis:
    def test_truncated_strips_trailing_punct_and_appends_unicode(self):
        s = "An example sentence."
        out = finalize_with_ellipsis(s, True)
        assert norm(out) == norm(f"An example sentence{ELLIPSIS}")
        assert out.endswith(ELLIPSIS)
        assert not out.endswith("." + ELLIPSIS)

    def test_truncated_exclamation(self):
        s = "Wow!"
        out = finalize_with_ellipsis(s, True)
        assert norm(out) == norm(f"Wow{ELLIPSIS}")

    def test_not_truncated_adds_period_if_missing(self):
        s = "Short phrase"
        out = finalize_with_ellipsis(s, False)
        assert out.endswith(".")
        assert out == "Short phrase."

    def test_not_truncated_preserves_existing_terminal_punct(self):
        s = "Already punctuated?"
        out = finalize_with_ellipsis(s, False)
        assert out == s

    def test_not_truncated_preserves_existing_unicode_ellipsis(self):
        s = f"Truncated already{ELLIPSIS}"
        out = finalize_with_ellipsis(s, False)
        assert out == s

    def test_none_and_empty(self):
        assert finalize_with_ellipsis(None, True) == ""
        # Current implementation adds '.' for empty string when not truncated
        assert finalize_with_ellipsis("", False) == "."


class TestTruncateWords:
    def test_truncates_and_appends_unicode_ellipsis(self):
        text = "Hello world this will get truncated"
        out, was_truncated = truncate_words(text, 3)
        assert was_truncated is True
        assert out.endswith(ELLIPSIS)
        assert out.startswith("Hello world this")
        assert not out.endswith("." + ELLIPSIS)

    def test_not_truncated_adds_period(self):
        text = "Hello world"
        out, was_truncated = truncate_words(text, 5)
        assert was_truncated is False
        assert out == "Hello world."

    def test_punctuation_safety(self):
        text = "Ends with dots...."
        out, was_truncated = truncate_words(text, 2)
        assert was_truncated is True
        assert out.endswith(ELLIPSIS)
        assert "." + ELLIPSIS not in out

    def test_whitespace_only(self):
        text = "   \t   "
        out, was_truncated = truncate_words(text, 5)
        # No words -> not truncated; finalize adds '.'
        assert was_truncated is False
        assert out == "."


class TestClipChars:
    def test_clip_and_append_unicode_ellipsis(self):
        text = "This is a sentence that will be clipped."
        out, was_truncated = clip_chars(text, 10)
        assert was_truncated is True
        assert out.endswith(ELLIPSIS)
        assert "." + ELLIPSIS not in out

    def test_no_clip_adds_period_if_missing(self):
        text = "Short"
        out, was_truncated = clip_chars(text, 100)
        assert was_truncated is False
        assert out == "Short."

    def test_unicode_multibyte(self):
        text = "こんにちは世界。これはテストです。"  # Japanese
        out, was_truncated = clip_chars(text, 6)
        # Should truncate and append unicode ellipsis; ensure no ASCII '...'
        assert was_truncated is True
        assert out.endswith(ELLIPSIS)
        assert "..." not in out

    def test_whitespace_and_empty(self):
        out, was_truncated = clip_chars("   ", 10)
        assert was_truncated is False
        assert out == "."
        out2, was_truncated2 = clip_chars("", 5)
        assert was_truncated2 is False
        assert out2 == "."