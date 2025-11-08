"""
Summarization model using BART or T5 for generating summaries and extracting keypoints.
"""

import logging
from typing import List, Optional
import re
from transformers import pipeline, Pipeline
import config

logger = logging.getLogger(__name__)

# Global cache for summarization model
_summarization_pipeline: Optional[Pipeline] = None


def get_summarization_model() -> Pipeline:
    """
    Lazy-load and cache the summarization pipeline.
    
    Returns:
        Hugging Face summarization pipeline (BART)
    """
    global _summarization_pipeline
    
    if _summarization_pipeline is None:
        device_id = config.get_hf_pipeline_device_id()
        logger.info(f"Loading summarization model (facebook/bart-large-cnn) on device={device_id}...")
        try:
            _summarization_pipeline = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                device=device_id
            )
            logger.info(f"✅ Summarization model loaded successfully on device={device_id}")
        except Exception as e:
            logger.error(f"❌ Failed to load summarization model: {e}")
            raise
    
    return _summarization_pipeline


class Summarizer:
    """
    Handles text summarization and keypoint extraction using BART model.
    """
    
    def __init__(self):
        self.pipeline = get_summarization_model()
    
    def generate_summary(
        self,
        text: str,
        max_length: int = 400,
        min_length: int = 0,
        do_sample: bool = False
    ) -> dict:
        """
        Generate a summary from input text.
        
        Args:
            text: Input text to summarize
            max_length: Maximum length of summary (default: 150 words)
            min_length: Minimum length of summary (default: 50 words)
            do_sample: Whether to use sampling (default: False for deterministic)
        
        Returns:
            dict with 'summary', 'word_count', 'confidence'
        """
        try:
            logger.info(f"Generating summary (target_max_words={max_length})")
            
            # Clean and normalize text
            text = text.strip()
            if not text:
                raise ValueError("Empty text provided for summarization")
            
            # Chunk the input into ~600-700 word segments to respect BART context window
            words = text.split()
            chunk_size = 650
            chunks = [' '.join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]

            partial_summaries: List[str] = []
            for idx, chunk in enumerate(chunks):
                try:
                    wc = len(chunk.split())
                    # Target ~120-180 words per chunk summary
                    chunk_max = min(180, max(60, wc // 3))
                    # min_length optional; keep small to avoid failures
                    result = self.pipeline(
                        chunk,
                        max_length=chunk_max,
                        do_sample=do_sample,
                        truncation=True,
                        clean_up_tokenization_spaces=True
                    )
                    if result and len(result) > 0:
                        partial_summaries.append(result[0]['summary_text'])
                except Exception as ce:
                    logger.warning(f"Chunk {idx+1} summarization failed: {ce}")

            if not partial_summaries:
                raise ValueError("Model returned empty result across all chunks")

            combined = ' '.join(partial_summaries)
            combined_words = combined.split()
            # If combined is excessively long, do a final pass to ~max_length words
            if len(combined_words) > max_length and max_length > 0:
                try:
                    logger.info("Running final compression pass for essay-style summary")
                    result = self.pipeline(
                        combined,
                        max_length=max_length,
                        truncation=True,
                        clean_up_tokenization_spaces=True
                    )
                    if result and len(result) > 0:
                        combined = result[0]['summary_text']
                except Exception as fe:
                    logger.warning(f"Final compression failed: {fe}")

            summary_text = combined.strip()
            word_count = len(summary_text.split())

            # Enforce minimum words if requested and feasible
            if min_length and word_count < min_length:
                # Use the uncompressed combined words as source to pad up to min_length
                summary_text = ' '.join(combined_words[:min_length]) if len(combined_words) >= min_length else summary_text
                word_count = len(summary_text.split())
            
            # Confidence score (placeholder - BART doesn't provide it directly)
            # In production, you could use model logits or perplexity
            confidence = 0.85
            
            logger.info(f"✅ Summary generated ({word_count} words)")
            
            return {
                "summary": summary_text,
                "word_count": word_count,
                "confidence": confidence
            }
            
        except Exception as e:
            logger.error(f"❌ Summary generation failed: {e}", exc_info=True)
            raise
    
    def extract_keypoints(
        self,
        text: str,
        num_points: int = 5
    ) -> dict:
        """
        Extract key points from text using extractive summarization.
        
        Args:
            text: Input text
            num_points: Number of key points to extract (default: 5)
        
        Returns:
            dict with 'keypoints' (list), 'count', 'confidence'
        """
        try:
            logger.info(f"Extracting {num_points} keypoints")
            
            # Clean text
            text = text.strip()
            if not text:
                raise ValueError("Empty text provided for keypoint extraction")
            
            # Instruction-based prompting to produce "Term - Explanation" key points
            # Allow larger requests (server will paginate in API). Cap at 50 to avoid overly long generations.
            desired = max(1, min(50, num_points))
            prompt = (
                "Extract the most important key points from the following text. "
                "For each key point, provide a term or concept followed by a brief, factual explanation (1-2 sentences max). "
                "Format as: 'Term - Explanation'. Focus on core definitions, facts, and concepts, not a summary. "
                f"Limit to {desired} points.\n\nText:\n" + text
            )
            # Log prompt preview with safe typographic ellipsis if truncated
            try:
                from utils.truncate_helpers import clip_chars
                _preview, _tr = clip_chars(prompt, 160)
                logger.info(f"Keypoints prompt: {_preview}")
            except Exception:
                # Fallback to simple slice if helpers unavailable
                logger.info(f"Keypoints prompt: {prompt[:160]}")

            keypoints: List[str] = []
            try:
                # Allocate enough space: ~60 words per point (cap tokens reasonably)
                kp_max = min(120 * desired, 2000)
                result = self.pipeline(
                    prompt,
                    max_length=kp_max,
                    do_sample=False,
                    truncation=True,
                    clean_up_tokenization_spaces=True
                )
                raw = result[0]['summary_text'] if result and len(result) > 0 else ''
                # Split by newlines or semicolons
                lines = [l.strip(" \t-•\u2022") for l in re.split(r"[\n;]+", raw) if l.strip()]

                # Normalize to "Term - Explanation"
                normalized: List[str] = []
                for line in lines:
                    # Try to split on ' - ' first, else ':'
                    if ' - ' in line:
                        parts = line.split(' - ', 1)
                        if len(parts) == 2:
                            term, expl = parts
                        else:
                            continue
                    elif ': ' in line:
                        parts = line.split(': ', 1)
                        if len(parts) == 2:
                            term, expl = parts
                        else:
                            continue
                    else:
                        # Fallback: first 5 words as term
                        words = line.split()
                        if len(words) == 0:
                            continue
                        term = ' '.join(words[:min(5, len(words))])
                        expl = ' '.join(words[5:]) if len(words) > 5 else 'Key concept from the material.'
                    term = term.strip(' -:').strip()
                    expl = expl.strip()
                    if term and expl:
                        # Ensure sentence ending
                        if not expl.endswith(('.', '!', '?')):
                            expl = expl + '.'
                        normalized.append(f"{term} - {expl}")

                keypoints = normalized[:desired] if len(normalized) > 0 else []
            except Exception as pe:
                logger.warning(f"Prompt-based keypoint extraction failed, falling back: {pe}")
                keypoints = []

            # Fallback to sentence-chunking method if prompt-based returned nothing
            if not keypoints:
                sentences = [s.strip() for s in text.replace('\n', '. ').split('. ') if s.strip()]
                if len(sentences) <= num_points:
                    keypoints = [s + ('.' if not s.endswith('.') else '') for s in sentences]
                else:
                    chunk_size = max(2, len(sentences) // desired)
                    chunks = ['. '.join(sentences[i:i+chunk_size]) for i in range(0, len(sentences), chunk_size)]
                    for chunk in chunks[:desired]:
                        first_sent = chunk.split('. ')[0]
                        if first_sent:
                            keypoints.append(first_sent + ('.' if not first_sent.endswith('.') else ''))

            # Ensure limit
            keypoints = keypoints[:desired]
            if not keypoints:
                keypoints = ["Key information extracted from the material."]
            
            logger.info(f"✅ Extracted {len(keypoints)} keypoints")
            
            return {
                "keypoints": keypoints,
                "count": len(keypoints),
                "confidence": 0.80
            }
            
        except Exception as e:
            logger.error(f"❌ Keypoint extraction failed: {e}", exc_info=True)
            raise
    
    def create_short_definition(self, text: str, max_words: int = 40) -> str:
        """
        Create a concise definition from longer text.
        
        Args:
            text: Input text (definition, explanation)
            max_words: Maximum words for short definition
        
        Returns:
            Shortened definition (1-2 sentences)
        """
        try:
            text = text.strip()
            if not text:
                return ""
            
            # If already short enough, ensure punctuation and return as-is
            from utils.truncate_helpers import finalize_with_ellipsis
            words = text.split()
            if len(words) <= max_words:
                return finalize_with_ellipsis(text, False)
            
            # Try to extract first 1-2 sentences up to max_words
            sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
            if sentences:
                # Take first sentence
                first_sent = sentences[0]
                first_words = first_sent.split()
                
                if len(first_words) <= max_words:
                    # First sentence fits, try adding second if room
                    result = first_sent
                    if len(sentences) > 1:
                        second_sent = sentences[1]
                        combined_words = (result + ' ' + second_sent).split()
                        if len(combined_words) <= max_words:
                            result = result + '. ' + second_sent
                    from utils.truncate_helpers import finalize_with_ellipsis
                    return finalize_with_ellipsis(result, False)
                else:
                    # First sentence is too long, truncate at word boundary
                    from utils.truncate_helpers import truncate_words
                    truncated, _ = truncate_words(first_sent, max_words)
                    return truncated
            
            # Fallback: hard truncate using helper
            from utils.truncate_helpers import truncate_words
            truncated, _ = truncate_words(text, max_words)
            return truncated
            
        except Exception as e:
            logger.warning(f"Short definition creation failed: {e}")
            # Return first N words as fallback via helper
            from utils.truncate_helpers import truncate_words
            truncated, _ = truncate_words(text, max_words)
            return truncated
    
    def create_bulleted_highlights(self, text: str, max_bullets: int = 6) -> List[str]:
        """
        Extract key facts/highlights from text as bullet points.
        
        Args:
            text: Input text (definition, explanation)
            max_bullets: Maximum number of bullets
        
        Returns:
            List of short bullet point strings
        """
        try:
            text = text.strip()
            if not text:
                return []
            
            # Split on existing bullets or list-like separators
            bullet_pattern = r'[\n;]+|\s+[•–—\-]\s+'
            parts = [p.strip(' \t-•\u2022') for p in re.split(bullet_pattern, text) if p.strip()]
            
            # Filter out very short or empty parts
            meaningful = [p for p in parts if len(p.split()) >= 3]
            
            if not meaningful:
                # Try sentence split
                sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
                meaningful = [s for s in sentences if len(s.split()) >= 3]
            
            # Take first max_bullets, ensure each is reasonably short (6-20 words ideal)
            bullets = []
            from utils.truncate_helpers import _strip_trailing_punctuation, ELLIPSIS
            for item in meaningful[:max_bullets]:
                words = item.split()
                if len(words) > 20:
                    # Truncate long bullets with typographic ellipsis
                    truncated = ' '.join(words[:18]).rstrip()
                    truncated = _strip_trailing_punctuation(truncated) + ELLIPSIS
                    item = truncated
                bullets.append(item)
            
            return bullets[:max_bullets]
            
        except Exception as e:
            logger.warning(f"Bulleted highlights creation failed: {e}")
            return []
