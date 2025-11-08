"""
Quality validation utilities for AI-generated content.
Ensures minimum quality standards and provides actionable feedback.
"""

import logging
import re
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)


class AIContentValidator:
    """Validate and enforce quality standards on AI-generated content."""
    
    def __init__(self):
        # Configurable thresholds
        self.min_summary_words = 50
        self.max_summary_words = 800
        self.min_keypoints = 3
        self.max_keypoints = 100
        self.min_quiz_questions = 3
        self.min_flashcards = 5
        
        # NEW: Definition/flashcard length limits
        self.max_definition_chars = 300
        self.max_flashcard_back_chars = 400
        
        # OCR residue patterns
        self.ocr_residue_patterns = [
            r'[➢›→◦▪■□●○◆◇⬥]',  # Special bullets
            r'…{2,}',  # Multiple ellipses
            r'—{2,}',  # Multiple em-dashes
            r'\s*\[\s*\.\.\.\s*\]\s*',  # [...] placeholders
        ]
        
        # Quality scoring weights
        self.structure_weight = 0.4
        self.content_weight = 0.4
        self.formatting_weight = 0.2
    
    def validate_summary(self, summary_data: dict) -> Tuple[bool, str, float]:
        """
        Validate summary quality and structure.
        
        Args:
            summary_data: Dictionary with 'summary', 'word_count', 'confidence'
        
        Returns:
            (is_valid, error_message, quality_score)
        """
        summary = summary_data.get('summary', '')
        word_count = summary_data.get('word_count', 0)
        
        # Initialize quality score
        quality_score = 0.0
        errors = []
        
        # 1. Word count validation
        if word_count < self.min_summary_words:
            errors.append(f"Summary too short ({word_count} words, minimum {self.min_summary_words})")
        elif word_count > self.max_summary_words:
            errors.append(f"Summary too long ({word_count} words, maximum {self.max_summary_words})")
        else:
            quality_score += 0.2  # Good length
        
        # 2. Structure validation
        structure_score = self._validate_summary_structure(summary)
        quality_score += structure_score * self.structure_weight
        
        if structure_score < 0.5:
            errors.append("Summary lacks proper structure (needs sections/headings)")
        
        # 3. Content validation
        content_score = self._validate_summary_content(summary)
        quality_score += content_score * self.content_weight
        
        if content_score < 0.3:
            errors.append("Summary contains insufficient meaningful content")
        
        # 4. Formatting validation
        formatting_score = self._validate_markdown_formatting(summary)
        quality_score += formatting_score * self.formatting_weight
        
        # Overall validation
        is_valid = len(errors) == 0 and quality_score >= 0.6
        error_message = '; '.join(errors) if errors else ""
        
        logger.info(f"Summary validation: valid={is_valid}, score={quality_score:.2f}")
        
        return is_valid, error_message, quality_score
    
    def validate_keypoints(self, keypoints_data: dict) -> Tuple[bool, str, float]:
        """
        Validate keypoints quality and count.
        
        Args:
            keypoints_data: Dictionary with 'keypoints', 'count', 'confidence'
        
        Returns:
            (is_valid, error_message, quality_score)
        """
        keypoints = keypoints_data.get('keypoints', [])
        
        quality_score = 0.0
        errors = []
        
        # 1. Count validation
        if len(keypoints) < self.min_keypoints:
            errors.append(f"Too few keypoints ({len(keypoints)}, minimum {self.min_keypoints})")
        elif len(keypoints) > self.max_keypoints:
            errors.append(f"Too many keypoints ({len(keypoints)}, maximum {self.max_keypoints})")
        else:
            quality_score += 0.3  # Good count
        
        # 2. Content validation for each keypoint
        valid_keypoints = 0
        total_substance_score = 0.0
        
        for i, kp in enumerate(keypoints):
            kp_score = self._validate_keypoint_content(kp, i)
            total_substance_score += kp_score
            
            if kp_score >= 0.5:
                valid_keypoints += 1
            else:
                errors.append(f"Keypoint {i+1} lacks substance or proper format")
        
        # Average keypoint quality
        if keypoints:
            avg_kp_quality = total_substance_score / len(keypoints)
            quality_score += avg_kp_quality * 0.5
        
        # 3. Structural validation
        structure_score = self._validate_keypoints_structure(keypoints)
        quality_score += structure_score * 0.2
        
        is_valid = len(errors) == 0 and quality_score >= 0.6
        error_message = '; '.join(errors) if errors else ""
        
        logger.info(f"Keypoints validation: valid={is_valid}, score={quality_score:.2f}")
        
        return is_valid, error_message, quality_score
    
    def validate_quiz(self, quiz_data: dict) -> Tuple[bool, str, float]:
        """
        Validate quiz questions quality.
        
        Args:
            quiz_data: Dictionary with 'questions', 'count', 'confidence'
        
        Returns:
            (is_valid, error_message, quality_score)
        """
        questions = quiz_data.get('questions', [])
        
        quality_score = 0.0
        errors = []
        
        # 1. Count validation
        if len(questions) < self.min_quiz_questions:
            errors.append(f"Too few questions ({len(questions)}, minimum {self.min_quiz_questions})")
        else:
            quality_score += 0.2
        
        # 2. Question validation
        valid_questions = 0
        total_question_score = 0.0
        
        for i, q in enumerate(questions):
            q_score, q_errors = self._validate_quiz_question(q, i)
            total_question_score += q_score
            
            if q_score >= 0.6:
                valid_questions += 1
            
            errors.extend(q_errors)
        
        # Average question quality
        if questions:
            avg_q_quality = total_question_score / len(questions)
            quality_score += avg_q_quality * 0.6
        
        # 3. Diversity validation (different types/difficulties)
        diversity_score = self._validate_quiz_diversity(questions)
        quality_score += diversity_score * 0.2
        
        is_valid = len(errors) == 0 and quality_score >= 0.6
        error_message = '; '.join(errors[:5]) if errors else ""  # Limit to first 5 errors
        
        logger.info(f"Quiz validation: valid={is_valid}, score={quality_score:.2f}, valid_q={valid_questions}/{len(questions)}")
        
        return is_valid, error_message, quality_score
    
    def validate_flashcards(self, flashcards_data: dict) -> Tuple[bool, str, float]:
        """
        Validate flashcards quality.
        
        Args:
            flashcards_data: Dictionary with 'flashcards', 'count', 'confidence'
        
        Returns:
            (is_valid, error_message, quality_score)
        """
        flashcards = flashcards_data.get('flashcards', [])
        
        quality_score = 0.0
        errors = []
        
        # 1. Count validation
        if len(flashcards) < self.min_flashcards:
            errors.append(f"Too few flashcards ({len(flashcards)}, minimum {self.min_flashcards})")
        else:
            quality_score += 0.2
        
        # 2. Flashcard validation
        valid_cards = 0
        total_card_score = 0.0
        
        for i, card in enumerate(flashcards):
            card_score, card_errors = self._validate_flashcard(card, i)
            total_card_score += card_score
            
            if card_score >= 0.6:
                valid_cards += 1
            
            errors.extend(card_errors)
        
        # Average card quality
        if flashcards:
            avg_card_quality = total_card_score / len(flashcards)
            quality_score += avg_card_quality * 0.6
        
        # 3. Diversity validation (different types/topics)
        diversity_score = self._validate_flashcard_diversity(flashcards)
        quality_score += diversity_score * 0.2
        
        # NEW: Check for OCR residue in flashcards
        ocr_issues = self._check_ocr_residue_in_flashcards(flashcards)
        if ocr_issues > 0:
            errors.append(f"OCR residue detected in {ocr_issues} flashcards")
            quality_score -= 0.1 * min(ocr_issues / len(flashcards), 0.5)
        
        is_valid = len(errors) == 0 and quality_score >= 0.6
        error_message = '; '.join(errors[:5]) if errors else ""
        
        logger.info(f"Flashcards validation: valid={is_valid}, score={quality_score:.2f}, valid={valid_cards}/{len(flashcards)}")
        
        return is_valid, error_message, quality_score
    
    # Private validation helpers
    
    def _validate_summary_structure(self, summary: str) -> float:
        """Score summary structure quality (0-1)."""
        score = 0.0
        
        # Has headings
        heading_count = summary.count('##')
        if heading_count >= 2:
            score += 0.4
        elif heading_count == 1:
            score += 0.2
        
        # Has bullet points or numbered lists
        if '\n- ' in summary or '\n* ' in summary or re.search(r'\n\d+\.', summary):
            score += 0.3
        
        # Has multiple paragraphs/sections
        paragraph_count = len([p for p in summary.split('\n\n') if p.strip()])
        if paragraph_count >= 3:
            score += 0.3
        elif paragraph_count >= 2:
            score += 0.15
        
        return min(score, 1.0)
    
    def _validate_summary_content(self, summary: str) -> float:
        """Score summary content quality (0-1)."""
        score = 0.0
        
        # Check for actual meaningful content (not just filler)
        filler_phrases = [
            'this text discusses',
            'the document explains',
            'this material covers',
            'the content includes',
            'this summary provides'
        ]
        
        has_filler = any(phrase in summary.lower() for phrase in filler_phrases)
        if not has_filler:
            score += 0.3
        
        # Has specific terms/concepts (not too generic)
        specific_terms = len(re.findall(r'\b[A-Z][a-z]+\b', summary))  # Capitalized words
        if specific_terms >= 5:
            score += 0.3
        elif specific_terms >= 3:
            score += 0.15
        
        # Sentence variety (not all same length)
        sentences = [s.strip() for s in re.split(r'[.!?]+', summary) if s.strip()]
        if sentences:
            lengths = [len(s.split()) for s in sentences]
            avg_len = sum(lengths) / len(lengths)
            variance = sum((l - avg_len) ** 2 for l in lengths) / len(lengths)
            if variance > 20:  # Good variety
                score += 0.2
            elif variance > 10:
                score += 0.1
        
        # Not empty or placeholder
        if summary.strip() and summary.strip() not in ['', 'Summary not available', 'No content']:
            score += 0.2
        
        return min(score, 1.0)
    
    def _validate_markdown_formatting(self, text: str) -> float:
        """Score Markdown formatting quality (0-1)."""
        score = 0.0
        
        # Has proper heading syntax
        if re.search(r'^##\s+.+$', text, re.MULTILINE):
            score += 0.3
        
        # Has proper list formatting
        if re.search(r'^\s*[-*]\s+.+$', text, re.MULTILINE):
            score += 0.2
        
        # Has bold/emphasis for key terms
        if '**' in text or '__' in text:
            score += 0.2
        
        # Has icons/emojis for visual engagement
        if any(0x1F300 <= ord(c) <= 0x1F9FF for c in text):
            score += 0.3
        
        return min(score, 1.0)
    
    def _validate_keypoint_content(self, keypoint: str, index: int) -> float:
        """Score individual keypoint quality (0-1)."""
        score = 0.0
        
        # Has sufficient length
        word_count = len(keypoint.split())
        if word_count >= 10:
            score += 0.3
        elif word_count >= 5:
            score += 0.15
        
        # Has term-definition structure
        if re.search(r'\*\*(.+?)\*\*\s*[:–—-]', keypoint) or ' - ' in keypoint or ': ' in keypoint:
            score += 0.3
        
        # Has multiple components (term, definition, usage)
        component_count = keypoint.count('-') + keypoint.count(':') + keypoint.count('•')
        if component_count >= 2:
            score += 0.2
        elif component_count >= 1:
            score += 0.1
        
        # Has specific content (not generic)
        if not any(generic in keypoint.lower() for generic in ['key concept', 'important idea', 'main point']):
            score += 0.2
        
        return min(score, 1.0)
    
    def _validate_keypoints_structure(self, keypoints: List[str]) -> float:
        """Score overall keypoints structure (0-1)."""
        score = 0.0
        
        # All keypoints follow consistent format
        formats = []
        for kp in keypoints:
            if '**' in kp and ':' in kp:
                formats.append('bold_colon')
            elif ' - ' in kp:
                formats.append('dash')
            elif ': ' in kp:
                formats.append('colon')
            else:
                formats.append('plain')
        
        # Consistency score
        if formats:
            most_common = max(set(formats), key=formats.count)
            consistency = formats.count(most_common) / len(formats)
            score += consistency * 0.5
        
        # All have icons/bullets
        with_icons = sum(1 for kp in keypoints if any(0x1F300 <= ord(c) <= 0x1F9FF for c in kp))
        if keypoints and with_icons / len(keypoints) >= 0.8:
            score += 0.5
        
        return min(score, 1.0)
    
    def _validate_quiz_question(self, question: dict, index: int) -> Tuple[float, List[str]]:
        """Validate individual quiz question. Returns (score, errors)."""
        score = 0.0
        errors = []
        
        # Has question text
        if not question.get('question'):
            errors.append(f"Question {index+1} missing question text")
            return 0.0, errors
        else:
            score += 0.2
        
        # Question is actually a question (has ? or question word)
        q_text = question['question']
        if '?' in q_text or any(word in q_text.lower() for word in ['what', 'how', 'why', 'when', 'where', 'which', 'who']):
            score += 0.2
        
        # Type-specific validation
        q_type = question.get('type', 'multiple-choice')
        
        if q_type == 'multiple-choice':
            options = question.get('options', [])
            if len(options) >= 3:
                score += 0.3
            elif len(options) >= 2:
                score += 0.15
            else:
                errors.append(f"Question {index+1} has insufficient options ({len(options)})")
            
            # Options should be diverse
            if options and len(set(options)) == len(options):  # No duplicates
                score += 0.1
        
        elif q_type == 'true-false':
            options = question.get('options', [])
            if len(options) == 2:
                score += 0.3
            else:
                errors.append(f"Question {index+1} true-false should have exactly 2 options")
        
        elif q_type == 'short-answer':
            # Should have sample answer
            if question.get('correct_answer') and len(question['correct_answer'].split()) >= 5:
                score += 0.3
        
        # Has correct answer
        if not question.get('correct_answer'):
            errors.append(f"Question {index+1} missing correct answer")
        else:
            score += 0.2
        
        # Has explanation
        if question.get('explanation'):
            score += 0.1
        
        return min(score, 1.0), errors
    
    def _validate_quiz_diversity(self, questions: List[dict]) -> float:
        """Score quiz diversity (0-1)."""
        if not questions:
            return 0.0
        
        score = 0.0
        
        # Multiple question types
        types = [q.get('type', 'multiple-choice') for q in questions]
        unique_types = len(set(types))
        if unique_types >= 2:
            score += 0.5
        
        # Multiple difficulty levels
        difficulties = [q.get('difficulty', 'normal') for q in questions]
        unique_difficulties = len(set(difficulties))
        if unique_difficulties >= 2:
            score += 0.5
        
        return min(score, 1.0)
    
    def _validate_flashcard(self, flashcard: dict, index: int) -> Tuple[float, List[str]]:
        """Validate individual flashcard. Returns (score, errors)."""
        score = 0.0
        errors = []
        
        front = flashcard.get('front', '')
        back = flashcard.get('back', '')
        
        # Has front and back
        if not front:
            errors.append(f"Flashcard {index+1} missing front")
            return 0.0, errors
        if not back:
            errors.append(f"Flashcard {index+1} missing back")
            return 0.0, errors
        
        score += 0.2
        
        # Front is a question or prompt
        if '?' in front or any(word in front.lower() for word in ['what', 'how', 'define', 'explain', 'list']):
            score += 0.3
        else:
            errors.append(f"Flashcard {index+1} front should be a question")
        
        # Back has sufficient content
        back_words = len(back.split())
        if back_words >= 10:
            score += 0.3
        elif back_words >= 5:
            score += 0.15
        else:
            errors.append(f"Flashcard {index+1} back too short ({back_words} words)")
        
        # NEW: Check back length limit
        if len(back) > self.max_flashcard_back_chars:
            errors.append(f"Flashcard {index+1} back too long ({len(back)} chars, max {self.max_flashcard_back_chars})")
            score -= 0.1
        
        # Front and back are different
        if front.lower() != back.lower():
            score += 0.1
        
        # Has confidence score
        if flashcard.get('confidence'):
            score += 0.1
        
        return min(score, 1.0), errors
    
    def _validate_flashcard_diversity(self, flashcards: List[dict]) -> float:
        """Score flashcard diversity (0-1)."""
        if not flashcards:
            return 0.0
        
        score = 0.0
        
        # Different types/categories
        types = [c.get('type', 'sentence') for c in flashcards]
        unique_types = len(set(types))
        if unique_types >= 3:
            score += 0.5
        elif unique_types >= 2:
            score += 0.3
        
        # Different source sections
        sources = [c.get('source_section', '') for c in flashcards if c.get('source_section')]
        unique_sources = len(set(sources))
        if unique_sources >= 3:
            score += 0.5
        elif unique_sources >= 2:
            score += 0.3
        
        return min(score, 1.0)


    def _check_ocr_residue_in_flashcards(self, flashcards: List[dict]) -> int:
        """Count flashcards with OCR residue. Returns count of affected cards."""
        affected_count = 0
        
        for card in flashcards:
            front = str(card.get('front', ''))
            back = str(card.get('back', ''))
            definition = str(card.get('definition', ''))
            
            combined = front + ' ' + back + ' ' + definition
            
            # Check for OCR patterns
            for pattern in self.ocr_residue_patterns:
                if re.search(pattern, combined):
                    affected_count += 1
                    break  # Count each card only once
        
        return affected_count


# Convenience function for use in generation routes

def validate_ai_content(content_type: str, content_data: dict) -> Tuple[bool, str, float]:
    """
    Validate AI-generated content of any type.
    
    Args:
        content_type: 'summary', 'keypoints', 'quiz', or 'flashcards'
        content_data: Generated content dictionary
    
    Returns:
        (is_valid, error_message, quality_score)
    """
    validator = AIContentValidator()
    
    if content_type == 'summary':
        return validator.validate_summary(content_data)
    elif content_type == 'keypoints':
        return validator.validate_keypoints(content_data)
    elif content_type == 'quiz':
        return validator.validate_quiz(content_data)
    elif content_type == 'flashcards':
        return validator.validate_flashcards(content_data)
    else:
        return False, f"Unknown content type: {content_type}", 0.0
