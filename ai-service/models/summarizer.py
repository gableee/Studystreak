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
        logger.info("Loading summarization model (facebook/bart-large-cnn)...")
        try:
            _summarization_pipeline = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                device=-1  # CPU (use 0 for GPU)
            )
            logger.info("✅ Summarization model loaded successfully")
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
            desired = max(1, min(10, num_points))
            prompt = (
                "Extract the most important key points from the following text. "
                "For each key point, provide a term or concept followed by a brief, factual explanation (1-2 sentences max). "
                "Format as: 'Term - Explanation'. Focus on core definitions, facts, and concepts, not a summary. "
                f"Limit to {desired} points.\n\nText:\n" + text
            )
            logger.info(f"Keypoints prompt: {prompt[:160]}...")

            keypoints: List[str] = []
            try:
                # Allocate enough space: ~60 words per point
                kp_max = min(120 * desired, 1200)
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
                        term, expl = line.split(' - ', 1)
                    elif ': ' in line:
                        term, expl = line.split(': ', 1)
                    else:
                        # Fallback: first 5 words as term
                        words = line.split()
                        term = ' '.join(words[:5])
                        expl = ' '.join(words[5:]) if len(words) > 5 else ''
                    term = term.strip(' -:').strip()
                    expl = expl.strip()
                    if term and expl:
                        # Ensure sentence ending
                        if not expl.endswith(('.', '!', '?')):
                            expl = expl + '.'
                        normalized.append(f"{term} - {expl}")

                keypoints = normalized[:desired]
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
