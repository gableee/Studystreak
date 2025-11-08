"""
Text cleaning utilities for AI-generated content.
Removes OCR noise, normalizes formatting, and compresses verbose outputs.
"""

import re
import logging
from typing import List, Optional, Tuple
from collections import Counter

logger = logging.getLogger(__name__)


class TextCleaner:
    """Clean and normalize AI-generated text for better readability."""
    
    def __init__(self):
        # OCR noise patterns to remove
        self.ocr_noise_patterns = [
            r'[➢›→◦▪■□●○◆◇⬥]',  # Special bullets/arrows
            r'…+',  # Multiple ellipses
            r'—+',  # Multiple em-dashes
            r'\s*\[\s*\.\.\.\s*\]\s*',  # [...] placeholders
            r'\b(\w+)\s+\1\b',  # Duplicate words (e.g., "the the")
            r'(?<=[a-z])\.\.+(?=[A-Z])',  # Ellipses between sentences
        ]
        
        # Bullet normalization map
        self.bullet_replacements = {
            '➢': '•',
            '›': '•',
            '→': '•',
            '◦': '•',
            '▪': '•',
            '■': '•',
            '□': '•',
            '●': '•',
            '○': '•',
            '◆': '•',
            '◇': '•',
            '⬥': '•',
            '-': '•',  # Only at start of line
        }
    
    def clean_text(self, text: str, max_length: Optional[int] = None) -> str:
        """
        Clean text by removing OCR noise, normalizing formatting.
        
        Args:
            text: Input text to clean
            max_length: Optional character limit for compression
        
        Returns:
            Cleaned text
        """
        if not text or not text.strip():
            return ""
        
        # Remove OCR noise
        cleaned = self._remove_ocr_noise(text)
        
        # Normalize bullets and formatting
        cleaned = self._normalize_bullets(cleaned)
        
        # Remove duplicate sentences
        cleaned = self._remove_duplicate_sentences(cleaned)
        
        # Fix spacing issues
        cleaned = self._normalize_spacing(cleaned)
        
        # Compress if needed
        if max_length and len(cleaned) > max_length:
            cleaned = self._compress_text(cleaned, max_length)
        
        return cleaned.strip()
    
    def clean_definition(self, definition: str, max_chars: int = 300) -> str:
        """
        Clean and compress a flashcard/keypoint definition.
        
        Args:
            definition: Input definition text
            max_chars: Maximum characters to keep (default: 300)
        
        Returns:
            Cleaned, compressed definition
        """
        # Clean first
        cleaned = self.clean_text(definition)
        
        # If still too long, extract most important sentences
        if len(cleaned) > max_chars:
            sentences = self._split_sentences(cleaned)
            
            # Keep first 2-3 sentences (usually most important)
            keep_count = 3 if len(sentences) > 3 else len(sentences)
            compressed = ' '.join(sentences[:keep_count])
            
            # If still too long, hard truncate with ellipsis
            if len(compressed) > max_chars:
                compressed = compressed[:max_chars-3] + '...'
            
            return compressed
        
        return cleaned
    
    def normalize_bullets(self, text: str) -> str:
        """Convert all bullet types to standard bullets (•)."""
        return self._normalize_bullets(text)
    
    def remove_ocr_residue(self, text: str) -> str:
        """Remove OCR-specific artifacts and noise."""
        return self._remove_ocr_noise(text)
    
    # Private helper methods
    
    def _remove_ocr_noise(self, text: str) -> str:
        """Remove OCR noise patterns."""
        cleaned = text
        
        for pattern in self.ocr_noise_patterns:
            cleaned = re.sub(pattern, '', cleaned)
        
        # Remove orphaned punctuation
        cleaned = re.sub(r'\s+[,;:.!?]\s+', ' ', cleaned)
        
        # Fix broken hyphenation (e.g., "exam- ple" -> "example")
        cleaned = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', cleaned)
        
        return cleaned
    
    def _normalize_bullets(self, text: str) -> str:
        """Normalize all bullet point characters."""
        lines = text.split('\n')
        normalized_lines = []
        
        for line in lines:
            stripped = line.lstrip()
            indent = line[:len(line) - len(stripped)]
            
            # Check if line starts with a bullet character
            if stripped and stripped[0] in self.bullet_replacements:
                normalized = indent + '• ' + stripped[1:].lstrip()
                normalized_lines.append(normalized)
            else:
                normalized_lines.append(line)
        
        return '\n'.join(normalized_lines)
    
    def _remove_duplicate_sentences(self, text: str) -> str:
        """Remove duplicate or near-duplicate sentences."""
        sentences = self._split_sentences(text)
        
        if len(sentences) <= 1:
            return text
        
        # Track seen sentences (normalized)
        seen = set()
        unique_sentences = []
        
        for sentence in sentences:
            # Normalize for comparison (lowercase, no extra spaces)
            normalized = ' '.join(sentence.lower().split())
            
            # Skip if we've seen this (or very similar) sentence
            if normalized not in seen and len(normalized) > 10:  # Skip very short
                seen.add(normalized)
                unique_sentences.append(sentence)
        
        return ' '.join(unique_sentences)
    
    def _normalize_spacing(self, text: str) -> str:
        """Fix spacing issues (multiple spaces, newlines, etc.)."""
        # Remove multiple spaces
        text = re.sub(r' {2,}', ' ', text)
        
        # Remove multiple newlines (keep at most 2)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Remove spaces before punctuation
        text = re.sub(r'\s+([,;:.!?])', r'\1', text)
        
        # Add space after punctuation if missing
        text = re.sub(r'([,;:.!?])([A-Za-z])', r'\1 \2', text)
        
        return text
    
    def _compress_text(self, text: str, max_length: int) -> str:
        """Compress text to fit within max_length."""
        if len(text) <= max_length:
            return text
        
        sentences = self._split_sentences(text)
        
        # Keep adding sentences until we hit the limit
        compressed = []
        current_length = 0
        
        for sentence in sentences:
            if current_length + len(sentence) + 1 <= max_length - 3:  # Leave room for "..."
                compressed.append(sentence)
                current_length += len(sentence) + 1
            else:
                break
        
        result = ' '.join(compressed)
        
        # Add ellipsis if we cut off content
        if len(compressed) < len(sentences):
            result += '...'
        
        return result
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Simple sentence splitter (handles common cases)
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        return [s.strip() for s in sentences if s.strip()]


class DefinitionCompressor:
    """Compress verbose definitions using rule-based and ML-assisted methods."""
    
    def __init__(self):
        self.cleaner = TextCleaner()
    
    def compress_definition(
        self,
        definition: str,
        target_length: int = 300,
        use_bart: bool = False
    ) -> Tuple[str, bool]:
        """
        Compress a definition to target length.
        
        Args:
            definition: Input definition text
            target_length: Target character length (default: 300)
            use_bart: Whether to use BART model for compression (default: False)
        
        Returns:
            (compressed_text, was_compressed)
        """
        # First pass: clean
        cleaned = self.cleaner.clean_text(definition)
        
        if len(cleaned) <= target_length:
            return cleaned, False
        
        # Second pass: extract key sentences
        compressed = self._extract_key_sentences(cleaned, target_length)
        
        # Optional: use BART for further compression
        if use_bart and len(compressed) > target_length:
            try:
                compressed = self._bart_compress(compressed, target_length)
            except Exception as e:
                logger.warning(f"BART compression failed: {e}, using rule-based")
        
        return compressed, True
    
    def _extract_key_sentences(self, text: str, target_length: int) -> str:
        """Extract most important sentences to fit target length."""
        sentences = self.cleaner._split_sentences(text)
        
        if not sentences:
            return text[:target_length]
        
        # Score sentences by importance
        scored_sentences = []
        for i, sentence in enumerate(sentences):
            score = self._score_sentence_importance(sentence, i, len(sentences))
            scored_sentences.append((score, sentence))
        
        # Sort by score (descending)
        scored_sentences.sort(reverse=True, key=lambda x: x[0])
        
        # Keep adding highest-scored sentences until target length
        selected = []
        current_length = 0
        
        for score, sentence in scored_sentences:
            if current_length + len(sentence) + 1 <= target_length - 3:
                selected.append(sentence)
                current_length += len(sentence) + 1
            else:
                break
        
        # Re-order selected sentences by original position
        original_order = []
        for sentence in sentences:
            if sentence in selected:
                original_order.append(sentence)
        
        result = ' '.join(original_order)
        
        # Add ellipsis if we cut content
        if len(selected) < len(sentences):
            result += '...'
        
        return result
    
    def _score_sentence_importance(self, sentence: str, position: int, total: int) -> float:
        """Score a sentence's importance (higher = more important)."""
        score = 0.0
        
        # Position bias (first and last sentences often important)
        if position == 0:
            score += 2.0
        elif position == total - 1:
            score += 1.0
        
        # Length (medium-length sentences often most informative)
        word_count = len(sentence.split())
        if 10 <= word_count <= 25:
            score += 1.5
        elif 5 <= word_count < 10:
            score += 1.0
        elif word_count < 5:
            score -= 1.0  # Very short sentences less informative
        
        # Has key educational markers
        key_markers = [
            'define', 'definition', 'refers to', 'means', 'is a',
            'example', 'for instance', 'such as', 'including',
            'important', 'key', 'critical', 'essential', 'main',
            'causes', 'results in', 'leads to', 'affects'
        ]
        marker_count = sum(1 for marker in key_markers if marker in sentence.lower())
        score += marker_count * 0.5
        
        # Has capitalized terms (likely important concepts)
        capitalized = len(re.findall(r'\b[A-Z][a-z]+\b', sentence))
        score += capitalized * 0.3
        
        # Has numbers/statistics
        if re.search(r'\d+', sentence):
            score += 0.5
        
        return score
    
    def _bart_compress(self, text: str, target_length: int) -> str:
        """Use BART model to compress text (if available)."""
        # This is a placeholder for optional BART compression
        # Can be implemented if needed by importing summarizer
        # For now, fall back to rule-based
        logger.debug("BART compression not implemented, using rule-based")
        return text[:target_length-3] + '...'


# Convenience functions

def clean_text(text: str, max_length: Optional[int] = None) -> str:
    """Clean text (removes OCR noise, normalizes formatting)."""
    cleaner = TextCleaner()
    return cleaner.clean_text(text, max_length)


def clean_definition(definition: str, max_chars: int = 300) -> str:
    """Clean and compress a definition."""
    cleaner = TextCleaner()
    return cleaner.clean_definition(definition, max_chars)


def compress_definition(definition: str, target_length: int = 300) -> Tuple[str, bool]:
    """Compress a definition to target length."""
    compressor = DefinitionCompressor()
    return compressor.compress_definition(definition, target_length)
