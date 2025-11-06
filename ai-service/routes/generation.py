"""
FastAPI routes for AI content generation (summary, keypoints, quiz, flashcards).
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pydantic import model_validator
from typing import Optional, List
import logging
from models.summarizer import Summarizer
from models.qa_generator import QAGenerator

router = APIRouter(prefix="/generate", tags=["generation"])
logger = logging.getLogger(__name__)

# Initialize models (lazy-loaded on first use)
summarizer = Summarizer()
qa_generator = QAGenerator()


class GenerateRequest(BaseModel):
    # Allow large inputs; models will internally truncate/chunk as needed.
    text: str = Field(..., min_length=10, max_length=200000)
    language: Optional[str] = None
    # Optional summary controls (in words)
    min_words: Optional[int] = Field(default=None, ge=0, description="Minimum target words for summary")
    max_words: Optional[int] = Field(default=None, ge=50, le=4000, description="Maximum target words for summary")

    @model_validator(mode="after")
    def validate_word_bounds(self):
        min_w = self.min_words
        max_w = self.max_words
        if min_w is not None and max_w is not None and min_w > max_w:
            raise ValueError('min_words cannot be greater than max_words')
        return self


class SummaryResponse(BaseModel):
    summary: str
    word_count: int
    confidence: float


class KeyPointsResponse(BaseModel):
    keypoints: List[str]
    count: int
    confidence: float


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]
    count: int
    confidence: float


class Flashcard(BaseModel):
    front: str
    back: str


class FlashcardsResponse(BaseModel):
    flashcards: List[Flashcard]
    count: int
    confidence: float


@router.post("/summary", response_model=SummaryResponse)
async def generate_summary(req: GenerateRequest):
    """
    Generate a summary from input text using BART model.
    """
    logger.info(f"Generating summary for text of length {len(req.text)}")
    
    try:
        # Determine target bounds; provide sensible defaults
        max_words = req.max_words if req.max_words is not None else 400
        min_words = req.min_words if req.min_words is not None else 0
        result = summarizer.generate_summary(req.text, max_length=max_words, min_length=min_words)
        return SummaryResponse(**result)
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keypoints", response_model=KeyPointsResponse)
async def generate_keypoints(req: GenerateRequest):
    """
    Extract key points from input text.
    """
    logger.info(f"Generating keypoints for text of length {len(req.text)}")
    
    try:
        result = summarizer.extract_keypoints(req.text)
        return KeyPointsResponse(**result)
    except Exception as e:
        logger.error(f"Keypoints generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(
    req: GenerateRequest,
    num_questions: int = Query(default=5, ge=1, le=20)
):
    """
    Generate quiz questions from input text.
    """
    logger.info(f"Generating {num_questions} quiz questions")
    
    try:
        result = qa_generator.generate_quiz(req.text, num_questions)
        return QuizResponse(**result)
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/flashcards", response_model=FlashcardsResponse)
async def generate_flashcards(
    req: GenerateRequest,
    num_cards: int = Query(default=10, ge=1, le=50)
):
    """
    Generate flashcards from input text.
    """
    logger.info(f"Generating {num_cards} flashcards")
    
    try:
        result = qa_generator.generate_flashcards(req.text, num_cards)
        return FlashcardsResponse(**result)
    except Exception as e:
        logger.error(f"Flashcard generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
