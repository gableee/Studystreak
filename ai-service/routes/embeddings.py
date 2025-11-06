"""
FastAPI routes for embedding generation using sentence-transformers (local model).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

import config

router = APIRouter(prefix="/embeddings", tags=["embeddings"])
logger = logging.getLogger(__name__)

# Global model instance (loaded once at startup)
_embedding_model = None


def get_embedding_model():
    """Lazy-load the sentence-transformers model."""
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {config.EMBEDDING_MODEL}")
            _embedding_model = SentenceTransformer(
                config.EMBEDDING_MODEL,
                cache_folder=str(config.MODEL_CACHE_DIR)
            )
            logger.info(f"Model loaded successfully: {config.EMBEDDING_MODEL}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}", exc_info=True)
            raise HTTPException(
                status_code=503,
                detail="Embedding model not available"
            )
    return _embedding_model


class EmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Text to embed")
    model: Optional[str] = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="Model to use for embeddings (currently only all-MiniLM-L6-v2 supported)"
    )


class EmbeddingResponse(BaseModel):
    text: str = Field(..., description="Original input text")
    vector: List[float] = Field(..., description="Embedding vector")
    dimensions: int = Field(..., description="Vector dimensions")
    model: str = Field(..., description="Model used for embedding")


@router.post("/generate", response_model=EmbeddingResponse)
async def generate_embedding(req: EmbeddingRequest):
    """
    Generate embedding vector from text using sentence-transformers (local model).
    
    Uses sentence-transformers/all-MiniLM-L6-v2 (384 dimensions).
    Model is loaded once and cached in memory for subsequent requests.
    Returns normalized embedding vector suitable for cosine similarity search.
    
    Note: First request will be slower (~10-30s) as the model downloads and loads.
    Subsequent requests are fast (~50-200ms depending on text length).
    
    Raises:
    - 400: Invalid input text
    - 503: Model loading failed
    - 500: Internal error during embedding generation
    """
    logger.info(f"Generating embedding for text of length {len(req.text)} chars using local model")
    
    try:
        # Get or load the model
        model = get_embedding_model()
        
        # Generate embedding
        # encode() returns numpy array, convert to list
        embedding = model.encode(req.text, convert_to_tensor=False)
        vector = embedding.tolist()
        
        # Validate dimensions
        if len(vector) != config.VECTOR_DIMENSIONS:
            logger.warning(
                f"Expected {config.VECTOR_DIMENSIONS} dimensions, got {len(vector)}"
            )
        
        logger.info(f"Successfully generated {len(vector)}-dimensional embedding")
        
        return EmbeddingResponse(
            text=req.text,
            vector=vector,
            dimensions=len(vector),
            model=config.EMBEDDING_MODEL
        )
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating embedding: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error during embedding generation"
        )
