"""
FastAPI main application for StudyStreak AI Service.
Provides endpoints for educational content generation using Ollama.
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routes.generation import router as generation_router
from utils.ollama_client import get_ollama_client

# Configure logging
# Ensure logs directory exists before creating file handler
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/ai-service.log', mode='a')
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("StudyStreak AI Service starting up...")
    
    # Check Ollama availability
    try:
        ollama_client = get_ollama_client()
        if ollama_client.is_available():
            models = ollama_client.list_models()
            logger.info(f"Ollama connected - Available models: {models}")
        else:
            logger.warning("Ollama server not available - ensure it's running on http://localhost:11434")
    except Exception as e:
        logger.error(f"Failed to connect to Ollama: {e}")
    logger.info("StudyStreak AI Service ready")
    
    yield
    
    # Shutdown
    logger.info("StudyStreak AI Service shutting down...")


# Initialize FastAPI app
app = FastAPI(
    title="StudyStreak AI Service",
    description="AI-powered educational content generation using Ollama (Qwen3-VL)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc)
        }
    )


# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - service information."""
    return {
        "service": "StudyStreak AI Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "generate_studytools": "/generate/studytools",
            "generate_summary": "/generate/summary",
            "generate_keypoints": "/generate/keypoints",
            "generate_quiz": "/generate/quiz",
            "generate_flashcards": "/generate/flashcards",
            "upload_and_generate": "/generate/upload-and-generate"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        ollama_client = get_ollama_client()
        ollama_available = ollama_client.is_available()
        
        return {
            "status": "healthy" if ollama_available else "degraded",
            "ollama_available": ollama_available,
            "ollama_url": ollama_client.base_url,
            "ollama_model": ollama_client.model
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# Include routers
app.include_router(generation_router)


if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", "8000"))
    
    logger.info(f"Starting server on port {port}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,  # Set to False in production
        log_level="info"
    )
