"""
FastAPI routes for AI content generation (summary, keypoints, quiz, flashcards).
"""
from utils.markdown_formatter import format_summary, format_keypoints, to_structured_keypoints, build_study_note
from utils.material_fetcher import get_material_bytes
from utils.quality_validator import validate_ai_content
from utils.reviewer_formatter import format_reviewer, ReviewerFormatter
from utils.clean_text import clean_text, clean_definition
from utils.topic_clustering import build_reviewer_sections
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pydantic import model_validator
import re
from typing import Optional, List, Dict
import logging
import io
from datetime import datetime
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
reviewer_formatter = ReviewerFormatter()  # NEW: Student-friendly formatter


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

class ReviewerTopic(BaseModel):
    title: str
    icon: str
    keypoints: List[str]

class ReviewerResponse(BaseModel):
    materialId: Optional[str] = None
    topics: List[ReviewerTopic]
    cleaned_word_count: int
    pages: Optional[int] = None
    extraction_method: Optional[str] = None
    warnings: List[str] = []
    generatedAt: str


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
    """
    Generate a concise summary of the input text using BART.
    """
    logger.info(f"Generating summary for text of length {len(req.text)}")
    
    try:
        # Use cache if material_id provided
        ck = _cache_key("summary", req)
        if ck:
            cached = get_cached("summary", ck)
            if cached:
                return SummaryResponse(**cached)
        
        # Actually generate summary using BART
        max_words = req.max_words if req.max_words is not None else 400
        min_words = req.min_words if req.min_words is not None else 0
        result = summarizer.generate_summary(req.text, max_length=max_words, min_length=min_words)
        
        # Clean and validate
        cleaned_summary = clean_text(result['summary'], max_length=5000)
        result['summary'] = cleaned_summary
        result['word_count'] = len(cleaned_summary.split())
        
        # Validate quality
        is_valid, error_msg, quality_score = validate_ai_content('summary', result)
        logger.info(f"Summary quality score: {quality_score:.2f}")
        
        resp = SummaryResponse(**result)
        if ck:
            set_cached("summary", ck, resp.model_dump())
        return resp
    except Exception as e:
        logger.error(f"Summary generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")


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
        
        # NEW: Clean and format keypoints
        cleaned_kps = [clean_text(kp) for kp in result.get('keypoints', [])]
        result['keypoints'] = format_keypoints(cleaned_kps)
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
        
        # NEW: Clean keypoints before structuring
        cleaned_raw_kps = [clean_text(kp) for kp in raw_kps]
        total_count = len(cleaned_raw_kps)

        structured = to_structured_keypoints(cleaned_raw_kps)

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
        
        # NEW: Clean quiz questions and answers
        for question in result.get('questions', []):
            if 'question' in question:
                question['question'] = clean_text(question['question'], max_length=500)
            if 'answer' in question:
                question['answer'] = clean_text(question['answer'], max_length=300)
            if 'options' in question and isinstance(question['options'], list):
                question['options'] = [clean_text(opt, max_length=300) for opt in question['options']]

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
        
        # NEW: Clean and compress flashcard definitions
        for card in result.get('flashcards', []):
            if 'front' in card:
                card['front'] = clean_text(card['front'], max_length=200)
            if 'back' in card:
                card['back'] = clean_definition(card['back'], max_chars=300)

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
        
        # NEW: Clean summary text
        cleaned_summary = clean_text(summary_res['summary'], max_length=max_words * 6)
        summary_md = format_summary(cleaned_summary, enhance_mode='subtle')

        # Generate structured keypoints
        kp_res = summarizer.extract_keypoints(req.text, num_points=24)
        
        # NEW: Clean keypoints
        cleaned_kps = [clean_text(kp) for kp in kp_res.get('keypoints', [])]
        kp_struct = to_structured_keypoints(cleaned_kps)

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


@router.get("/reviewer", response_model=ReviewerResponse)
async def generate_reviewer(
    material_url: str,
    material_id: Optional[str] = None,
    max_keypoints_per_topic: int = Query(default=12, ge=3, le=30),
    auth_token: Optional[str] = None,
    use_semantic_clustering: bool = Query(default=False, description="Use sentence-transformers for topic clustering")
):
    """Generate reviewer JSON directly from a material URL (PDF).

    NEW: Enhanced pipeline with concept detection, separation, and structured formatting.
    - Detects and splits merged concepts (e.g., "Data and Information" → two entries)
    - Identifies comparisons (X vs Y), type lists, definitions automatically
    - Uses domain-adaptive formatting templates
    - Optional semantic clustering with sentence-transformers
    """
    logger.info(f"Generating reviewer for material_url={material_url} (semantic={use_semantic_clustering})")
    try:
        # Fetch bytes (public or private via bearer token)
        spec = {"type": "url", "url": material_url, "token": auth_token} if material_url.lower().startswith("http") else {"type": "path", "path": material_url}
        data = await get_material_bytes(spec)
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        raw_parts = []
        for page in reader.pages:
            try:
                raw_parts.append(page.extract_text() or "")
            except Exception:
                pass
        raw_text = "\n".join(raw_parts)
        cleaned = clean_text(raw_text, max_length=250000)
        
        # NEW: Use enhanced concept detection and separation
        from utils.concept_detector import ConceptDetector, Concept
        from utils.structured_formatter import StructuredFormatter, ReviewerDocumentBuilder
        from utils.enhanced_quality_validator import validate_reviewer_quality
        
        detector = ConceptDetector()
        formatter = StructuredFormatter()
        
        # Extract concepts from cleaned text
        # Split by paragraph/segment for better concept detection
        segments = [s.strip() for s in re.split(r'\n\n+', cleaned) if s.strip() and len(s.split()) >= 5]
        
        all_concepts: List[Concept] = []
        for segment in segments[:100]:  # Limit to first 100 segments for performance
            concepts = detector.detect_concepts(segment)
            all_concepts.extend(concepts)
        
        logger.info(f"Detected {len(all_concepts)} concepts from {len(segments)} segments")
        
        # Group concepts by semantic clustering if requested
        if use_semantic_clustering and len(all_concepts) > 5:
            try:
                from utils.topic_clustering import TopicClusterer
                clusterer = TopicClusterer()
                
                # Extract text from concepts for clustering
                concept_texts = [f"{c.term}: {c.definition}" for c in all_concepts]
                clusters = clusterer.cluster_text_segments(
                    concept_texts,
                    min_clusters=2,
                    max_clusters=8
                )
                
                # Generate labels
                labels = clusterer.generate_cluster_labels(concept_texts, clusters)
                
                # Build topics from clusters
                topics = []
                for cluster_id in sorted(clusters.keys()):
                    cluster_concepts = [all_concepts[i] for i in clusters[cluster_id]]
                    
                    # Format keypoints using structured formatter
                    keypoints = []
                    for concept in cluster_concepts[:max_keypoints_per_topic]:
                        formatted = formatter.format_concept(concept, style='markdown')
                        keypoints.append(formatted)
                    
                    # Assign icon based on cluster content
                    icon = formatter._get_icon(cluster_concepts[0]) if cluster_concepts else "📌"
                    
                    topics.append(ReviewerTopic(
                        title=labels[cluster_id],
                        icon=icon,
                        keypoints=keypoints
                    ))
                
                logger.info(f"Created {len(topics)} topics via semantic clustering")
            except Exception as e:
                logger.warning(f"Semantic clustering failed, falling back to heuristic: {e}")
                use_semantic_clustering = False
        
        # Fallback: heuristic grouping if semantic clustering disabled or failed
        if not use_semantic_clustering or len(all_concepts) <= 5:
            # Group by concept type
            from utils.concept_detector import ConceptType
            type_groups: Dict[ConceptType, List[Concept]] = {}
            for concept in all_concepts:
                if concept.concept_type not in type_groups:
                    type_groups[concept.concept_type] = []
                type_groups[concept.concept_type].append(concept)
            
            # Build topics from type groups
            topics = []
            type_titles = {
                ConceptType.DEFINITION: "Definitions",
                ConceptType.COMPARISON: "Comparisons",
                ConceptType.TYPE_LIST: "Classifications",
                ConceptType.SIMPLE: "Key Concepts"
            }
            
            for concept_type, concepts in type_groups.items():
                if not concepts:
                    continue
                
                keypoints = []
                for concept in concepts[:max_keypoints_per_topic]:
                    formatted = formatter.format_concept(concept, style='markdown')
                    keypoints.append(formatted)
                
                icon = formatter._get_icon(concepts[0])
                title = type_titles.get(concept_type, "Concepts")
                
                topics.append(ReviewerTopic(
                    title=title,
                    icon=icon,
                    keypoints=keypoints
                ))
        
        # Ensure we have at least one topic
        if not topics:
            topics = [ReviewerTopic(
                title="Overview",
                icon="📘",
                keypoints=[clean_definition(cleaned[:500], max_chars=220)]
            )]
        
        # NEW: Quality validation
        reviewer_dict = {
            "topics": [{"title": t.title, "icon": t.icon, "keypoints": t.keypoints} for t in topics],
            "documentMarkdown": "\n\n".join([f"## {t.icon} {t.title}\n" + "\n".join(t.keypoints) for t in topics])
        }
        quality_metrics = validate_reviewer_quality(reviewer_dict, cleaned)
        
        warnings = []
        if not quality_metrics['is_acceptable']:
            warnings.append(f"Quality score: {quality_metrics['overall']:.1f}/10 - Below threshold")
            warnings.extend(quality_metrics['recommendations'][:3])
        
        logger.info(f"Reviewer quality: {quality_metrics['overall']:.1f}/10 (accuracy={quality_metrics['accuracy']:.1f}, clarity={quality_metrics['clarity']:.1f}, separation={quality_metrics['separation']:.1f})")
        
        resp = ReviewerResponse(
            materialId=material_id,
            topics=topics,
            cleaned_word_count=len(cleaned.split()),
            pages=len(reader.pages),
            extraction_method="enhanced-concept-detection" if not use_semantic_clustering else "semantic-clustering",
            warnings=warnings,
            generatedAt=datetime.utcnow().isoformat() + "Z"
        )
        return resp
    except Exception as e:
        logger.error(f"Reviewer generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
