"""
Routes package for AI service.
Exposes extraction, generation, and embeddings routers.
"""

from . import extraction, generation, embeddings

__all__ = ["extraction", "generation", "embeddings"]
