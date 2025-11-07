"""
FastAPI routes for AI content generation (summary, keypoints, quiz, flashcards).
"""
from utils.markdown_formatter import format_summary, format_keypoints, to_structured_keypoints, build_study_note
from utils.quality_validator import validate_ai_content
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pydantic import model_validator
from typing import Optional, List, Dict
import logging
from models.summarizer import Summarizer
from models.qa_generator import QAGenerator
from models.flashcard_generator import get_flashcard_generator
from utils.cache import get_cached, set_cached
import hashlib

router = APIRouter(prefix="/generate", tags=["generation"])
logger = logging.getLogger(__name__)

# Initialize models (lazy-loaded on first use)
summarizer = Summarizer()
qa_generator = QAGenerator()
flashcard_generator = None  # Lazy-loaded on first use


class GenerateRequest(BaseModel):
    # Allow large inputs; models will internally truncate/chunk as needed.
    text: str = Field(..., min_length=10, max_length=200000)
    language: Optional[str] = None
    # Optional summary controls (in words)
    min_words: Optional[int] = Field(default=None, ge=0, description="Minimum target words for summary")
    max_words: Optional[int] = Field(default=None, ge=50, le=4000, description="Maximum target words for summary")
    # Extraction metadata (pass-through for rescued terms & coverage)
    coverage_pct: Optional[float] = Field(default=None, serialization_alias="coveragePct")
    rescued_terms: Optional[List[str]] = Field(default=None, serialization_alias="rescuedTerms")
    material_id: Optional[str] = Field(default=None, description="Unique material identifier for caching")
    material_version: Optional[str] = Field(default=None, description="Version or hash of material content for cache invalidation")
    mode: Optional[str] = Field(default="fast", description="Extraction mode used: fast|complete")

    @model_validator(mode="after")
    def validate_word_bounds(self):
        min_w = self.min_words
        max_w = self.max_words
        if min_w is not None and max_w is not None and min_w > max_w:
            raise ValueError('min_words cannot be greater than max_words')
        return self


class QuizRequest(BaseModel):
    """Request model for quiz generation with difficulty and type support."""
    text: str = Field(..., min_length=10, max_length=200000)
    language: Optional[str] = None
    difficulty: str = Field(
        default="normal",
        pattern="^(easy|normal|hard)$",
        description="Difficulty level: easy (recall), normal (application), hard (analysis)"
    )
    question_type: str = Field(
        default="multiple-choice",
        pattern="^(multiple-choice|true-false|short-answer)$",
        description="Question type: multiple-choice, true-false, or short-answer"
    )


class SummaryResponse(BaseModel):
    summary: str
    word_count: int
    confidence: float


class KeyPointsResponse(BaseModel):
    keypoints: List[str]
    count: int
    confidence: float


class KeyPointItemV2(BaseModel):
    term: str
    definition: str  # Backwards compatible: maps to short_definition
    short_definition: Optional[str] = Field(default=None, serialization_alias="shortDefinition")
    full_definition: Optional[str] = Field(default=None, serialization_alias="fullDefinition")
    bulleted_highlights: Optional[List[str]] = Field(default=None, serialization_alias="bulletedHighlights")
    usage: Optional[str] = None
    icon: str = Field(default="📌")
    importance: float = Field(default=0.8, ge=0.0, le=1.0)
    source_span: Optional[str] = Field(default=None, serialization_alias="sourceSpan")


class KeyPointsV2Response(BaseModel):
    items: List[KeyPointItemV2]
    count: int
    total_count: int
    page: int
    page_size: int = Field(serialization_alias="pageSize")
    confidence: float


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None
    type: str = Field(default="multiple-choice", description="Question type")


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]
    count: int
    confidence: float


class Flashcard(BaseModel):
    front: str
    back: str
    confidence: Optional[float] = None
    source_section: Optional[str] = None
    importance_score: Optional[float] = None


class FlashcardsResponse(BaseModel):
    flashcards: List[Flashcard]
    count: int
    confidence: float
    total_generated: Optional[int] = None
    filtered_count: Optional[int] = None


class OutlineItem(BaseModel):
    title: str
    level: int


class StudyNoteResponse(BaseModel):
    document_markdown: str = Field(serialization_alias="documentMarkdown")
    outline: List[OutlineItem]
    word_count: int = Field(serialization_alias="wordCount")
    confidence: float
    keypoints_count: int = Field(serialization_alias="keypointsCount")
    coverage_pct: Optional[float] = Field(default=None, serialization_alias="coveragePct")
    rescued_terms_count: Optional[int] = Field(default=None, serialization_alias="rescuedTermsCount")
    rescued_terms: Optional[List[str]] = Field(default=None, serialization_alias="rescuedTerms")


def _cache_key(endpoint: str, req) -> Optional[str]:
    material_id = getattr(req, "material_id", None)
    material_version = getattr(req, "material_version", None)
    if not material_id or not material_version:
        return None
    text = getattr(req, "text", "")
    raw = f"{endpoint}:{material_id}:{material_version}:{len(text)}"
    return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()


@router.post("/summary", response_model=SummaryResponse)
async def generate_summary(req: GenerateRequest):
    logger.info(f"Generating summary for text of length {len(req.text)}")
    
    try:
        ck = _cache_key("summary", req)
        if ck:
            cached = get_cached("summary", ck)
            if cached:
                return SummaryResponse(**cached)
        max_words = req.max_words if req.max_words is not None else 400
        min_words = req.min_words if req.min_words is not None else 0
        result = summarizer.generate_summary(req.text, max_length=max_words, min_length=min_words)
        
        # NEW: Apply formatting
        result['summary'] = format_summary(result['summary'], enhance_mode='subtle')
        result['word_count'] = len(result['summary'].split())
        
        # NEW: Validate quality
        is_valid, error_msg, quality_score = validate_ai_content('summary', result)
        logger.info(f"Summary quality score: {quality_score:.2f}")
        
        resp = SummaryResponse(**result)
        if ck:
            set_cached("summary", ck, resp.model_dump())
        return resp
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keypoints", response_model=KeyPointsResponse)
async def generate_keypoints(req: GenerateRequest):
    logger.info(f"Generating keypoints for text of length {len(req.text)}")
    
    try:
        ck = _cache_key("keypoints", req)
        if ck:
            cached = get_cached("keypoints", ck)
            if cached:
                return KeyPointsResponse(**cached)
        result = summarizer.extract_keypoints(req.text)
        
        # NEW: Apply formatting
        result['keypoints'] = format_keypoints(result['keypoints'])
        result['count'] = len(result['keypoints'])
        
        # NEW: Validate quality
        is_valid, error_msg, quality_score = validate_ai_content('keypoints', result)
        logger.info(f"Keypoints quality score: {quality_score:.2f}")
        
        resp = KeyPointsResponse(**result)
        if ck:
            set_cached("keypoints", ck, resp.model_dump())
        return resp
    except Exception as e:
        logger.error(f"Keypoints generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keypoints/v2", response_model=KeyPointsV2Response)
async def generate_keypoints_v2(
    req: GenerateRequest,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=50)
):
    """
    Generate structured keypoints suitable for card rendering, with pagination.
    """
    logger.info(f"Generating structured keypoints v2 (page={page}, size={page_size})")

    try:
        ck = _cache_key("keypoints_v2", req)
        if ck:
            cached = get_cached("keypoints_v2", ck)
            if cached and cached.get("page") == page and cached.get("pageSize") == page_size:
                return KeyPointsV2Response(**cached)
        # Request enough points for pages up to the requested one
        requested_total = page * page_size
        kpres = summarizer.extract_keypoints(req.text, num_points=requested_total)
        raw_kps = kpres.get('keypoints', [])
        total_count = len(raw_kps)

        structured = to_structured_keypoints(raw_kps)

        # Pagination slice
        start = (page - 1) * page_size
        end = start + page_size
        items_page = structured[start:end]

        # Validate quality by rendering to strings
        try:
            rendered = []
            for item in items_page:
                term = item.get('term')
                definition = item.get('definition')
                usage = item.get('usage')
                icon = item.get('icon', '📌')
                if usage:
                    rendered.append(f"- **{term}:** {icon} {definition}  - Use: {usage}")
                else:
                    rendered.append(f"- **{term}:** {icon} {definition}")
            _ = validate_ai_content('keypoints', {"keypoints": rendered})
        except Exception as ve:
            logger.warning(f"Keypoints v2 quality validation failed: {ve}")

        resp = KeyPointsV2Response(
            items=[KeyPointItemV2(**i) for i in items_page],
            count=len(items_page),
            total_count=total_count,
            page=page,
            page_size=page_size,
            confidence=kpres.get('confidence', 0.8)
        )
        if ck:
            set_cached("keypoints_v2", ck, resp.model_dump())
        return resp
    except Exception as e:
        logger.error(f"Keypoints v2 generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(
    req: QuizRequest,
    num_questions: int = Query(default=5, ge=1, le=50)
):
    """
    Generate quiz questions from input text with configurable difficulty and type.
    
    - **difficulty**: easy (simple recall), normal (application/understanding), hard (analysis/synthesis)
    - **question_type**: multiple-choice, true-false, or short-answer
    """
    logger.info(f"Generating {num_questions} {req.difficulty} {req.question_type} quiz questions")
    
    try:
        ck = _cache_key("quiz", req)
        if ck:
            cached = get_cached("quiz", ck)
            if cached:
                return QuizResponse(**cached)
        # Validate inputs (Pydantic already validates patterns, but double-check)
        valid_difficulties = ["easy", "normal", "hard"]
        valid_types = ["multiple-choice", "true-false", "short-answer"]
        
        if req.difficulty not in valid_difficulties:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}"
            )
        
        if req.question_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid question_type. Must be one of: {', '.join(valid_types)}"
            )
        
        # Pass difficulty and question_type to generate_quiz
        result = qa_generator.generate_quiz(
            req.text,
            num_questions,
            difficulty=req.difficulty,
            question_type=req.question_type
        )

        # NEW: Validate quality for quiz
        try:
            is_valid, error_msg, quality_score = validate_ai_content('quiz', result)
            logger.info(f"Quiz quality score: {quality_score:.2f}")
        except Exception as ve:
            logger.warning(f"Quiz quality validation failed: {ve}")

        resp = QuizResponse(**result)
        if ck:
            set_cached("quiz", ck, resp.model_dump())
        return resp
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/flashcards", response_model=FlashcardsResponse)
async def generate_flashcards(
    req: GenerateRequest,
    num_cards: int = Query(default=10, ge=1, le=50)
):
    """
    Generate enhanced flashcards from input text using:
    - Document structure analysis (headings, definitions, lists)
    - TF-IDF importance ranking
    - Semantic deduplication
    - Quality filtering
    
    Returns flashcards with confidence scores, source sections, and importance ratings.
    """
    logger.info(f"Generating {num_cards} enhanced flashcards")
    
    try:
        ck = _cache_key("flashcards", req)
        if ck:
            cached = get_cached("flashcards", ck)
            if cached:
                return FlashcardsResponse(**cached)
        # Lazy-load flashcard generator
        global flashcard_generator
        if flashcard_generator is None:
            flashcard_generator = get_flashcard_generator()
        
        # Use enhanced flashcard generator
        result = flashcard_generator.generate_flashcards(req.text, num_cards, rescued_terms=req.rescued_terms)

        # NEW: Validate quality for flashcards
        try:
            is_valid, error_msg, quality_score = validate_ai_content('flashcards', result)
            logger.info(f"Flashcards quality score: {quality_score:.2f}")
        except Exception as ve:
            logger.warning(f"Flashcards quality validation failed: {ve}")

        resp = FlashcardsResponse(**result)
        if ck:
            set_cached("flashcards", ck, resp.model_dump())
        return resp
    except Exception as e:
        logger.error(f"Flashcard generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/study-note", response_model=StudyNoteResponse)
async def generate_study_note(req: GenerateRequest):
    """
    Generate a cohesive study note combining the structured summary and key concepts.
    """
    logger.info("Generating study note (summary + key concepts)")
    try:
        ck = _cache_key("study_note", req)
        if ck:
            cached = get_cached("study_note", ck)
            if cached:
                return StudyNoteResponse(**cached)
        # Generate and format summary
        max_words = req.max_words if req.max_words is not None else 500
        min_words = req.min_words if req.min_words is not None else 0
        summary_res = summarizer.generate_summary(req.text, max_length=max_words, min_length=min_words)
        summary_md = format_summary(summary_res['summary'], enhance_mode='subtle')

        # Generate structured keypoints
        kp_res = summarizer.extract_keypoints(req.text, num_points=24)
        kp_struct = to_structured_keypoints(kp_res.get('keypoints', []))

        # Build document
        document_md, outline = build_study_note(summary_md, kp_struct, title=None)

        # Validate as a summary-style document
        try:
            content = {
                'summary': document_md,
                'word_count': len(document_md.split()),
                'confidence': 0.9
            }
            _ = validate_ai_content('summary', content)
        except Exception as ve:
            logger.warning(f"Study note validation warning: {ve}")

        # NOTE: Coverage and rescued terms would normally come from extraction phase.
        # For now, attempt to infer presence of Visual Terms section.
        coverage_pct = None
        rescued_terms: List[str] = []
        if "## 📌 Visual Terms" in document_md:
            # naive parse of rescued terms list
            lines = document_md.splitlines()
            collecting = False
            for line in lines:
                if line.startswith("## ") and "Visual Terms" in line and not collecting:
                    collecting = True
                    continue
                if collecting:
                    if line.startswith("- "):
                        rescued_terms.append(line[2:].strip())
                    elif line.startswith("## "):
                        break
        resp = StudyNoteResponse(
            document_markdown=document_md,
            outline=[OutlineItem(**o) for o in outline],
            word_count=len(document_md.split()),
            confidence=min(1.0, (summary_res.get('confidence', 0.85) + kp_res.get('confidence', 0.8)) / 2 + 0.05),
            keypoints_count=len(kp_struct),
            coverage_pct=coverage_pct,
            rescued_terms_count=len(rescued_terms) if rescued_terms else None,
            rescued_terms=rescued_terms if rescued_terms else None,
        )
        if ck:
            set_cached("study_note", ck, resp.model_dump())
        return resp
    except Exception as e:
        logger.error(f"Study note generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
