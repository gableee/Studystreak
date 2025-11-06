"""
Configuration for AI service.
Holds model paths, vector dimensions, and API keys.
"""

import os
from pathlib import Path

# AI Service Settings
AI_SERVICE_HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))
API_KEY = os.getenv("AI_SERVICE_API_KEY", None)

# HuggingFace API Token (for Inference API or private models)
HF_API_TOKEN = os.getenv("HF_API_TOKEN", None)

# Model Settings
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
VECTOR_DIMENSIONS = 384  # all-MiniLM-L6-v2 produces 384-dim vectors

SUMMARY_MODEL = "facebook/bart-large-cnn"
KEYPOINTS_MODEL = "facebook/bart-large-cnn"
QUIZ_MODEL = "t5-base"  # TODO: Fine-tune for question generation
FLASHCARD_MODEL = "t5-base"

# Model Cache Directory (avoid conflict with models/ Python package)
MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", "./model_cache"))
MODEL_CACHE_DIR.mkdir(exist_ok=True)

# Request Limits
MAX_TEXT_LENGTH = 10000  # characters
MAX_BATCH_SIZE = 32

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = Path("./logs/ai_service.log")
LOG_FILE.parent.mkdir(exist_ok=True)
