"""
FastAPI routes for StudyTools generation.
Endpoints for generating summaries, keypoints, quizzes, and flashcards.
"""

import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import tempfile
import os

from models.studytools_generator import StudyToolsGenerator
from extractors.document_extractor import DocumentExtractor
from utils.supabase_client import get_storage_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generate", tags=["generation"])

# Initialize generator
studytools_generator = StudyToolsGenerator()


class GenerationRequest(BaseModel):
    """Request model for content generation."""
    content: Optional[str] = Field(None, description="Text content to process")
    supabase_file_path: Optional[str] = Field(None, description="Path to file in Supabase storage")
    assignment: Optional[str] = Field(None, description="Assignment/task description")
    num_quiz_questions: int = Field(5, description="Number of quiz questions", ge=1, le=20)
    num_flashcards: int = Field(10, description="Number of flashcards", ge=1, le=50)


class SummaryRequest(BaseModel):
    """Request model for summary generation."""
    content: Optional[str] = Field(None, description="Text content")
    supabase_file_path: Optional[str] = Field(None, description="Supabase file path")
    assignment: Optional[str] = Field(None, description="Assignment description")


class KeypointsRequest(BaseModel):
    """Request model for keypoints generation."""
    content: Optional[str] = Field(None, description="Text content")
    supabase_file_path: Optional[str] = Field(None, description="Supabase file path")
    assignment: Optional[str] = Field(None, description="Assignment description")


class QuizRequest(BaseModel):
    """Request model for quiz generation."""
    content: Optional[str] = Field(None, description="Text content")
    supabase_file_path: Optional[str] = Field(None, description="Supabase file path")
    assignment: Optional[str] = Field(None, description="Assignment description")
    num_questions: int = Field(5, ge=1, le=20)
    question_type: str = Field('multiple-choice', description="Question type: multiple-choice, true-false, or short-answer")
    difficulty: str = Field('normal', description="Difficulty level: easy, normal, or hard")


class FlashcardsRequest(BaseModel):
    """Request model for flashcards generation."""
    content: Optional[str] = Field(None, description="Text content")
    supabase_file_path: Optional[str] = Field(None, description="Supabase file path")
    assignment: Optional[str] = Field(None, description="Assignment description")
    num_cards: int = Field(10, ge=1, le=50)


def get_content_from_request(content: Optional[str], supabase_file_path: Optional[str]) -> str:
    """
    Extract content from either direct text or Supabase file.
    
    Args:
        content: Direct text content
        supabase_file_path: Path to file in Supabase storage
    
    Returns:
        Extracted text content
    """
    if content:
        logger.info("Using direct content from request")
        return content
    
    if supabase_file_path:
        logger.info(f"Fetching file from Supabase: {supabase_file_path}")
        try:
            # Get file from Supabase
            storage_client = get_storage_client()
            file_bytes = storage_client.download_file(supabase_file_path)
            
            # Detect file extension
            file_ext = os.path.splitext(supabase_file_path)[1].lower()
            
            # Extract text
            extractor = DocumentExtractor()
            result = extractor.extract_from_file(file_bytes, file_extension=file_ext)
            
            extracted_text = result.get('text', '')
            logger.info(f"✅ Extracted {len(extracted_text)} chars from {supabase_file_path}")
            
            return extracted_text
        
        except Exception as e:
            logger.error(f"❌ Failed to fetch/extract from Supabase: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")
    
    raise HTTPException(status_code=400, detail="Either 'content' or 'supabase_file_path' must be provided")


@router.post("/studytools")
async def generate_studytools(request: GenerationRequest) -> Dict[str, Any]:
    """
    Generate complete StudyTools package (summary, keypoints, quiz, flashcards).
    
    Request body:
        - content: Direct text content (optional)
        - supabase_file_path: Path to file in Supabase storage (optional)
        - assignment: Task description (optional)
        - num_quiz_questions: Number of quiz questions (default: 5)
        - num_flashcards: Number of flashcards (default: 10)
    
    Returns:
        Complete studytools JSON with all components
    """
    try:
        logger.info("=== Generate StudyTools Request ===")
        
        # Get content
        content = get_content_from_request(request.content, request.supabase_file_path)
        
        if not content or len(content.strip()) < 100:
            raise HTTPException(status_code=400, detail="Content too short (minimum 100 characters)")
        
        # Generate all study tools
        studytools = studytools_generator.generate_all_studytools(
            content=content,
            assignment=request.assignment,
            num_quiz_questions=request.num_quiz_questions,
            num_flashcards=request.num_flashcards
        )
        
        logger.info("✅ StudyTools generation completed successfully")
        
        return {
            "success": True,
            "studytools": studytools
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ StudyTools generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/summary")
async def generate_summary(request: SummaryRequest) -> Dict[str, Any]:
    """
    Generate summary only.
    
    Returns:
        Summary with content, word_count, reading_time
    """
    try:
        logger.info("=== Generate Summary Request ===")
        
        content = get_content_from_request(request.content, request.supabase_file_path)
        
        summary = studytools_generator.generate_summary(content, request.assignment)
        
        logger.info("✅ Summary generation completed")
        
        return {
            "success": True,
            "summary": summary
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Summary generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/keypoints")
async def generate_keypoints(request: KeypointsRequest) -> Dict[str, Any]:
    """
    Generate keypoints only.
    
    Returns:
        Keypoints with topics, terms, definitions, importance levels
    """
    try:
        logger.info("=== Generate Keypoints Request ===")
        
        content = get_content_from_request(request.content, request.supabase_file_path)
        
        keypoints = studytools_generator.generate_keypoints(content, request.assignment)
        
        logger.info("✅ Keypoints generation completed")
        
        return {
            "success": True,
            "keypoints": keypoints
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Keypoints generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/quiz")
async def generate_quiz(request: QuizRequest) -> Dict[str, Any]:
    """
    Generate quiz only.
    
    Returns:
        Quiz questions with answers, explanations, difficulty, time estimates
    """
    try:
        logger.info("=== Generate Quiz Request ===")
        
        content = get_content_from_request(request.content, request.supabase_file_path)
        
        # Get quiz parameters
        question_type = getattr(request, 'question_type', 'multiple-choice')
        difficulty = getattr(request, 'difficulty', 'normal')
        
        quiz = studytools_generator.generate_quiz(
            content, 
            request.assignment, 
            request.num_questions,
            question_type=question_type,
            difficulty=difficulty
        )
        
        logger.info("✅ Quiz generation completed")
        
        return {
            "success": True,
            "quiz": quiz,
            "metadata": {
                "total_questions": len(quiz),
                "total_score": f"0/{len(quiz)}"
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Quiz generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/flashcards")
async def generate_flashcards(request: FlashcardsRequest) -> Dict[str, Any]:
    """
    Generate flashcards only.
    
    Returns:
        Flashcards with questions, answers, categories
    """
    try:
        logger.info("=== Generate Flashcards Request ===")
        
        content = get_content_from_request(request.content, request.supabase_file_path)
        
        flashcards = studytools_generator.generate_flashcards(content, request.assignment, request.num_cards)
        
        logger.info("✅ Flashcards generation completed")
        
        return {
            "success": True,
            "flashcards": flashcards,
            "metadata": {
                "total_cards": len(flashcards)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Flashcards generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/upload-and-generate")
async def upload_and_generate(
    file: UploadFile = File(...),
    assignment: Optional[str] = Form(None),
    num_quiz_questions: int = Form(5),
    num_flashcards: int = Form(10)
) -> Dict[str, Any]:
    """
    Upload a file directly and generate StudyTools.
    
    Form data:
        - file: File upload (PDF, DOCX, PPTX, images)
        - assignment: Task description (optional)
        - num_quiz_questions: Number of quiz questions
        - num_flashcards: Number of flashcards
    
    Returns:
        Complete studytools JSON
    """
    try:
        logger.info(f"=== Upload and Generate Request: {file.filename} ===")
        
        # Save to temporary file
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            # Extract text
            extractor = DocumentExtractor()
            result = extractor.extract_from_file(tmp_path, file_extension=file_ext)
            extracted_text = result.get('text', '')
            
            if not extracted_text or len(extracted_text.strip()) < 100:
                raise HTTPException(status_code=400, detail="Could not extract sufficient text from file")
            
            # Generate study tools
            studytools = studytools_generator.generate_all_studytools(
                content=extracted_text,
                assignment=assignment,
                num_quiz_questions=num_quiz_questions,
                num_flashcards=num_flashcards
            )
            
            logger.info("✅ Upload and generation completed successfully")
            
            return {
                "success": True,
                "filename": file.filename,
                "studytools": studytools
            }
        
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Upload and generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
