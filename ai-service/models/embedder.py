"""
Embedding model using sentence-transformers for semantic search.
(Copied from routes/embeddings.py for proper organization)
"""

import logging
from typing import Optional
from sentence_transformers import SentenceTransformer
import config

logger = logging.getLogger(__name__)

# Global cache for embedding model
_embedding_model: Optional[SentenceTransformer] = None


def get_embedding_model() -> SentenceTransformer:
    """
    Lazy-load and cache the sentence-transformers model.
    
    Returns:
        SentenceTransformer model for generating embeddings
    """
    global _embedding_model
    
    if _embedding_model is None:
        logger.info(f"Loading embedding model ({config.EMBEDDING_MODEL})...")
        try:
            device = config.get_device()
            # SentenceTransformer accepts 'cpu', 'cuda' or 'cuda:0' style device strings
            _embedding_model = SentenceTransformer(
                config.EMBEDDING_MODEL,
                cache_folder=str(config.MODEL_CACHE_DIR),
                device=device
            )
            logger.info(f"✅ Embedding model loaded successfully on {device}")
        except Exception as e:
            logger.error(f"❌ Failed to load embedding model: {e}")
            raise
    
    return _embedding_model
