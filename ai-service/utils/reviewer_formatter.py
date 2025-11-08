"""
Reviewer formatter - transforms AI outputs into clean, student-friendly reviewers.
Organizes content into scannable sections with icons, bullets, and clear structure.
"""

import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import json

from utils.clean_text import TextCleaner, clean_definition
from utils.topic_clustering import ReviewerSectionBuilder

logger = logging.getLogger(__name__)


class ReviewerFormatter:
    """Format AI-generated content into polished student reviewers."""
    
    def __init__(self):
        self.cleaner = TextCleaner()
        self.section_builder = ReviewerSectionBuilder()
        
        # Default icons for different content types
        self.content_type_icons = {
            'summary': '📘',
            'keypoints': '🎯',
            'definition': '📖',
            'example': '💡',
            'note': '📝',
            'warning': '⚠️',
            'tip': '💡',
            'fact': '📌'
        }
    
    def format_reviewer(
        self,
        raw_data: Dict[str, Any],
        style: str = 'student_friendly'
    ) -> Dict[str, Any]:
        """
        Format raw AI output into a polished reviewer.
        
        Args:
            raw_data: Raw AI-generated data (summary, keypoints, flashcards, etc.)
            style: Formatting style ('student_friendly', 'compact', 'detailed')
        
        Returns:
            Formatted reviewer dictionary
        """
        logger.info(f"Formatting reviewer with style: {style}")
        
        # Extract and clean components
        summary = raw_data.get('summary', '')
        keypoints = raw_data.get('keypoints', [])
        flashcards = raw_data.get('flashcards', [])
        
        # Clean all text content
        cleaned_summary = self.cleaner.clean_text(summary) if summary else ''
        cleaned_keypoints = self._clean_keypoints(keypoints)
        cleaned_flashcards = self._clean_flashcards(flashcards)
        
        # Build sections from keypoints
        sections = self.section_builder.build_sections_from_keypoints(
            cleaned_keypoints,
            target_sections=5
        )
        
        # Build markdown output
        markdown = self._build_markdown(
            cleaned_summary,
            sections,
            style=style
        )
        
        # Build JSON output
        formatted = {
            'documentMarkdown': markdown,
            'summary': cleaned_summary,
            'sections': sections,
            'flashcards': cleaned_flashcards,
            'metadata': {
                'wordCount': len(markdown.split()),
                'sectionCount': len(sections),
                'flashcardCount': len(cleaned_flashcards),
                'style': style,
                'generatedAt': datetime.utcnow().isoformat() + 'Z',
                'confidence': raw_data.get('confidence', 0.85)
            }
        }
        
        return formatted
    
    def format_keypoints_section(
        self,
        keypoints: List[Dict],
        group_by_topic: bool = True,
        max_per_section: int = 5
    ) -> str:
        """
        Format keypoints into clean Markdown sections.
        
        Args:
            keypoints: List of keypoint dictionaries
            group_by_topic: Whether to group by semantic topics (default: True)
            max_per_section: Maximum keypoints per section (default: 5)
        
        Returns:
            Formatted Markdown string
        """
        if not keypoints:
            return ""
        
        if group_by_topic:
            sections = self.section_builder.build_sections_from_keypoints(keypoints)
        else:
            # Single flat section
            sections = [{
                'title': 'Key Concepts',
                'icon': '🎯',
                'keypoints': keypoints
            }]
        
        markdown_lines = []
        
        for section in sections:
            # Section header
            icon = section.get('icon', '📌')
            title = section['title']
            markdown_lines.append(f"\n## {icon} {title}\n")
            
            # Keypoints as bullets
            for kp in section['keypoints'][:max_per_section]:
                kp_text = self._format_single_keypoint(kp)
                markdown_lines.append(f"- {kp_text}")
        
        return '\n'.join(markdown_lines)
    
    def format_flashcard(
        self,
        flashcard: Dict,
        format_type: str = 'compact'
    ) -> Dict:
        """
        Format a single flashcard for cleaner display.
        
        Args:
            flashcard: Flashcard dictionary
            format_type: 'compact' or 'detailed'
        
        Returns:
            Formatted flashcard dictionary
        """
        # Extract and clean fields
        term = flashcard.get('term', '')
        front = flashcard.get('front', term)
        definition = flashcard.get('definition', '')
        back = flashcard.get('back', definition)
        
        # Clean and compress
        cleaned_front = self.cleaner.clean_text(front)
        cleaned_definition = clean_definition(definition, max_chars=300)
        cleaned_back = clean_definition(back, max_chars=300)
        
        # Build formatted output
        formatted = {
            'term': cleaned_front if term else flashcard.get('title', ''),
            'front': cleaned_front,
            'back': cleaned_back,
            'definition': cleaned_definition,
            'icon': flashcard.get('icon', '📖'),
            'confidence': flashcard.get('confidence', 0.8)
        }
        
        if format_type == 'detailed':
            # Add additional fields
            formatted.update({
                'shortDefinition': cleaned_definition[:150] + '...' if len(cleaned_definition) > 150 else cleaned_definition,
                'bulletedHighlights': self._extract_bullets_from_text(cleaned_back),
                'usage': flashcard.get('usage'),
                'sourceSpan': flashcard.get('sourceSpan')
            })
        
        return formatted
    
    # Private formatting methods
    
    def _clean_keypoints(self, keypoints: List) -> List[Dict]:
        """Clean and normalize keypoints."""
        cleaned = []
        
        for kp in keypoints:
            if isinstance(kp, str):
                # Convert string to dict
                cleaned_text = self.cleaner.clean_text(kp)
                cleaned.append({
                    'text': cleaned_text,
                    'term': cleaned_text[:50],
                    'definition': cleaned_text
                })
            elif isinstance(kp, dict):
                # Clean existing dict
                text = kp.get('text') or kp.get('term') or kp.get('definition') or ''
                cleaned_text = self.cleaner.clean_text(text)
                
                cleaned.append({
                    'text': cleaned_text,
                    'term': kp.get('term', cleaned_text[:50]),
                    'definition': clean_definition(kp.get('definition', cleaned_text)),
                    'icon': kp.get('icon', '📌'),
                    'importance': kp.get('importance', 0.5)
                })
        
        return cleaned
    
    def _clean_flashcards(self, flashcards: List[Dict]) -> List[Dict]:
        """Clean and format flashcards."""
        return [self.format_flashcard(fc) for fc in flashcards]
    
    def _build_markdown(
        self,
        summary: str,
        sections: List[Dict],
        style: str = 'student_friendly'
    ) -> str:
        """Build complete Markdown document."""
        lines = []
        
        # Title
        lines.append("# 📘 Study Reviewer\n")
        
        # Summary section (if present)
        if summary:
            lines.append("## 💡 Summary\n")
            lines.append(summary + "\n")
        
        # Sections with keypoints
        lines.append("## 🎯 Key Concepts\n")
        
        for section in sections:
            icon = section.get('icon', '📌')
            title = section['title']
            keypoints = section.get('keypoints', [])
            
            lines.append(f"### {icon} {title}\n")
            
            for kp in keypoints:
                kp_text = self._format_single_keypoint(kp)
                lines.append(f"- {kp_text}")
            
            lines.append("")  # Blank line between sections
        
        return '\n'.join(lines)
    
    def _format_single_keypoint(self, keypoint: Dict) -> str:
        """Format a single keypoint as Markdown."""
        term = keypoint.get('term', '')
        definition = keypoint.get('definition', keypoint.get('text', ''))
        
        # Clean term and definition
        term = term.strip()
        definition = clean_definition(definition, max_chars=200)
        
        if term and definition and term != definition:
            return f"**{term}:** {definition}"
        elif definition:
            return definition
        else:
            return term
    
    def _extract_bullets_from_text(self, text: str, max_bullets: int = 6) -> List[str]:
        """Extract key bullet points from text."""
        # Split into sentences
        sentences = self.cleaner._split_sentences(text)
        
        # Keep first N sentences as bullets
        bullets = []
        for sentence in sentences[:max_bullets]:
            # Limit bullet length
            if len(sentence) > 80:
                sentence = sentence[:77] + '...'
            bullets.append(sentence)
        
        return bullets


class ReviewerQualityChecker:
    """Check and improve reviewer quality before output."""
    
    def __init__(self):
        self.cleaner = TextCleaner()
    
    def check_reviewer_quality(self, reviewer: Dict) -> Dict[str, Any]:
        """
        Check reviewer quality and provide feedback.
        
        Args:
            reviewer: Formatted reviewer dictionary
        
        Returns:
            Quality report with score and issues
        """
        issues = []
        score = 1.0
        
        # Check sections
        sections = reviewer.get('sections', [])
        if len(sections) < 2:
            issues.append("Too few sections (minimum 2 recommended)")
            score -= 0.2
        
        # Check keypoint count
        total_keypoints = sum(len(s.get('keypoints', [])) for s in sections)
        if total_keypoints < 5:
            issues.append(f"Too few keypoints ({total_keypoints}, minimum 5 recommended)")
            score -= 0.2
        
        # Check for OCR residue
        markdown = reviewer.get('documentMarkdown', '')
        if self._has_ocr_residue(markdown):
            issues.append("OCR residue detected (special characters, duplicates)")
            score -= 0.1
        
        # Check readability
        avg_sentence_length = self._get_avg_sentence_length(markdown)
        if avg_sentence_length > 30:
            issues.append(f"Long sentences detected (avg {avg_sentence_length:.1f} words)")
            score -= 0.1
        
        # Check metadata
        metadata = reviewer.get('metadata', {})
        if not metadata.get('generatedAt'):
            issues.append("Missing generation timestamp")
            score -= 0.05
        
        return {
            'quality_score': max(0.0, score),
            'issues': issues,
            'is_acceptable': score >= 0.7,
            'recommendations': self._generate_recommendations(issues)
        }
    
    def _has_ocr_residue(self, text: str) -> bool:
        """Check if text has OCR artifacts."""
        # Check for common OCR noise patterns
        noise_patterns = ['➢', '›', '→', '…', '—', '[...]']
        return any(pattern in text for pattern in noise_patterns)
    
    def _get_avg_sentence_length(self, text: str) -> float:
        """Calculate average sentence length in words."""
        sentences = self.cleaner._split_sentences(text)
        if not sentences:
            return 0.0
        
        total_words = sum(len(s.split()) for s in sentences)
        return total_words / len(sentences)
    
    def _generate_recommendations(self, issues: List[str]) -> List[str]:
        """Generate recommendations based on issues."""
        recommendations = []
        
        for issue in issues:
            if 'section' in issue.lower():
                recommendations.append("Add more semantic clustering to create additional sections")
            elif 'keypoint' in issue.lower():
                recommendations.append("Extract more key concepts from the source material")
            elif 'ocr' in issue.lower():
                recommendations.append("Apply text cleaning utilities to remove OCR artifacts")
            elif 'sentence' in issue.lower():
                recommendations.append("Break long sentences into shorter, more scannable points")
        
        return recommendations


# Convenience functions

def format_reviewer(raw_data: Dict, style: str = 'student_friendly') -> Dict:
    """Format raw AI output into polished reviewer."""
    formatter = ReviewerFormatter()
    return formatter.format_reviewer(raw_data, style)


def format_keypoints(keypoints: List[Dict], group_by_topic: bool = True) -> str:
    """Format keypoints as Markdown."""
    formatter = ReviewerFormatter()
    return formatter.format_keypoints_section(keypoints, group_by_topic)


def check_reviewer_quality(reviewer: Dict) -> Dict:
    """Check reviewer quality."""
    checker = ReviewerQualityChecker()
    return checker.check_reviewer_quality(reviewer)
