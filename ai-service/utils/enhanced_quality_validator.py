"""
Enhanced quality validator with 0-10 scoring system.
Rates reviewers on Accuracy, Clarity, Separation, and Structure.
"""

import re
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class QualityMetrics:
    """Quality metrics for reviewer content."""
    accuracy: float  # 0-10: Are definitions correct and factual?
    clarity: float  # 0-10: Are they concise and readable?
    separation: float  # 0-10: Are concepts distinct, not merged?
    structure: float  # 0-10: Is formatting correct and consistent?
    overall: float  # 0-10: Weighted average
    
    issues: List[str]
    recommendations: List[str]
    
    def is_acceptable(self) -> bool:
        """Check if quality meets minimum threshold."""
        return self.overall >= 7.0 and all([
            self.accuracy >= 6.0,
            self.clarity >= 6.0,
            self.separation >= 6.0,
            self.structure >= 6.0
        ])
    
    def to_dict(self) -> Dict:
        return {
            "accuracy": round(self.accuracy, 1),
            "clarity": round(self.clarity, 1),
            "separation": round(self.separation, 1),
            "structure": round(self.structure, 1),
            "overall": round(self.overall, 1),
            "is_acceptable": self.is_acceptable(),
            "issues": self.issues,
            "recommendations": self.recommendations
        }


class EnhancedQualityValidator:
    """Validate reviewer quality with detailed 0-10 scoring."""
    
    def __init__(self):
        # Patterns that indicate poor quality
        self.generic_phrases = [
            'key concept', 'important idea', 'main point',
            'from the material', 'from the text', 'described in'
        ]
        
        self.ocr_residue = [
            '➢', '›', '→', '◦', '▪', '■', '□', '●', '○',
            '…{2,}', '—{2,}', r'\[\.\.\.\]'
        ]
        
        self.merge_indicators = [
            r'\b(\w+) and (\w+)\b',  # Potential merged concepts
            r'\b(\w+) & (\w+)\b'
        ]
        
        # Scoring weights for overall calculation
        self.weights = {
            'accuracy': 0.3,
            'clarity': 0.3,
            'separation': 0.2,
            'structure': 0.2
        }
    
    def validate_reviewer(
        self,
        reviewer_data: Dict,
        content_text: Optional[str] = None
    ) -> QualityMetrics:
        """
        Comprehensive quality validation of a reviewer.
        
        Args:
            reviewer_data: Dict with topics, cards, or markdown
            content_text: Optional raw text for reference checking
        
        Returns:
            QualityMetrics with detailed scores
        """
        issues = []
        recommendations = []
        
        # Extract content for analysis
        topics = reviewer_data.get('topics', [])
        cards = reviewer_data.get('cards', [])
        markdown = reviewer_data.get('documentMarkdown', '')
        
        # If no structured data, try to extract from markdown
        if not topics and not cards and markdown:
            topics, cards = self._extract_from_markdown(markdown)
        
        # Score each dimension
        accuracy_score = self._score_accuracy(topics, cards, content_text)
        clarity_score = self._score_clarity(topics, cards)
        separation_score = self._score_separation(topics, cards)
        structure_score = self._score_structure(markdown, topics)
        
        # Collect issues based on scores
        if accuracy_score < 7.0:
            issues.append(f"Accuracy concerns (score: {accuracy_score:.1f}/10)")
            recommendations.append("Verify definitions against source material")
        
        if clarity_score < 7.0:
            issues.append(f"Clarity issues (score: {clarity_score:.1f}/10)")
            recommendations.append("Simplify complex sentences and compress verbose definitions")
        
        if separation_score < 7.0:
            issues.append(f"Concept separation needed (score: {separation_score:.1f}/10)")
            recommendations.append("Split merged concepts like 'X and Y' into separate entries")
        
        if structure_score < 7.0:
            issues.append(f"Structure improvements needed (score: {structure_score:.1f}/10)")
            recommendations.append("Ensure consistent formatting and proper Markdown structure")
        
        # Calculate overall score (weighted average)
        overall = (
            accuracy_score * self.weights['accuracy'] +
            clarity_score * self.weights['clarity'] +
            separation_score * self.weights['separation'] +
            structure_score * self.weights['structure']
        )
        
        return QualityMetrics(
            accuracy=accuracy_score,
            clarity=clarity_score,
            separation=separation_score,
            structure=structure_score,
            overall=overall,
            issues=issues,
            recommendations=recommendations
        )
    
    def _score_accuracy(
        self,
        topics: List[Dict],
        cards: List[Dict],
        content_text: Optional[str]
    ) -> float:
        """
        Score accuracy (0-10): Are definitions correct and factual?
        """
        score = 10.0
        
        all_definitions = []
        for topic in topics:
            for kp in topic.get('keypoints', []):
                if isinstance(kp, dict):
                    all_definitions.append(kp.get('definition', ''))
                elif isinstance(kp, str):
                    all_definitions.append(kp)
        
        for card in cards:
            all_definitions.append(card.get('definition', ''))
        
        if not all_definitions:
            return 5.0  # Neutral if no content
        
        # Check for generic/placeholder text
        generic_count = 0
        for defn in all_definitions:
            if any(phrase in defn.lower() for phrase in self.generic_phrases):
                generic_count += 1
        
        if generic_count > 0:
            penalty = min(3.0, (generic_count / len(all_definitions)) * 5.0)
            score -= penalty
        
        # Check for incomplete definitions
        incomplete_count = sum(1 for d in all_definitions if len(d.split()) < 5)
        if incomplete_count > len(all_definitions) * 0.2:
            score -= 2.0
        
        # Check for contradictions (basic heuristic)
        # TODO: Could use semantic similarity to detect contradictory statements
        
        return max(0.0, min(10.0, score))
    
    def _score_clarity(self, topics: List[Dict], cards: List[Dict]) -> float:
        """
        Score clarity (0-10): Are definitions concise and readable?
        """
        score = 10.0
        
        all_definitions = []
        for topic in topics:
            for kp in topic.get('keypoints', []):
                if isinstance(kp, dict):
                    all_definitions.append(kp.get('definition', ''))
                elif isinstance(kp, str):
                    all_definitions.append(kp)
        
        for card in cards:
            all_definitions.append(card.get('definition', ''))
        
        if not all_definitions:
            return 5.0
        
        # Check average length (sweet spot: 10-30 words)
        lengths = [len(d.split()) for d in all_definitions]
        avg_length = sum(lengths) / len(lengths)
        
        if avg_length < 5:
            score -= 3.0  # Too short
        elif avg_length > 40:
            score -= 2.0  # Too long
        
        # Check for overly long definitions (>300 chars)
        long_count = sum(1 for d in all_definitions if len(d) > 300)
        if long_count > 0:
            penalty = min(2.0, (long_count / len(all_definitions)) * 4.0)
            score -= penalty
        
        # Check for OCR residue
        ocr_count = 0
        for defn in all_definitions:
            if any(re.search(pattern, defn) for pattern in self.ocr_residue):
                ocr_count += 1
        
        if ocr_count > 0:
            penalty = min(2.0, (ocr_count / len(all_definitions)) * 3.0)
            score -= penalty
        
        # Check readability (sentence structure)
        # Count very long sentences (>50 words)
        long_sentences = 0
        for defn in all_definitions:
            sentences = [s.strip() for s in re.split(r'[.!?]+', defn) if s.strip()]
            for sent in sentences:
                if len(sent.split()) > 50:
                    long_sentences += 1
        
        if long_sentences > 0:
            score -= min(1.5, long_sentences * 0.3)
        
        return max(0.0, min(10.0, score))
    
    def _score_separation(self, topics: List[Dict], cards: List[Dict]) -> float:
        """
        Score separation (0-10): Are concepts distinct, not merged?
        """
        score = 10.0
        
        all_terms = []
        for topic in topics:
            for kp in topic.get('keypoints', []):
                if isinstance(kp, dict):
                    all_terms.append(kp.get('term', ''))
                elif isinstance(kp, str):
                    # Extract term from "Term: Definition" format
                    if ':' in kp:
                        all_terms.append(kp.split(':')[0].strip())
                    else:
                        all_terms.append(kp[:50])
        
        for card in cards:
            all_terms.append(card.get('term', ''))
        
        if not all_terms:
            return 5.0
        
        # Check for merged concepts (e.g., "Data and Information")
        merged_count = 0
        for term in all_terms:
            # Check for coordinating conjunctions
            if re.search(r'\b(and|&|or)\b', term.lower()):
                # Verify it's likely a merged concept (not a proper name)
                words = term.split()
                if len(words) >= 3 and not term.isupper():
                    merged_count += 1
        
        if merged_count > 0:
            penalty = min(4.0, (merged_count / len(all_terms)) * 8.0)
            score -= penalty
        
        # Check for duplicate terms (case-insensitive)
        unique_terms = set(t.lower().strip() for t in all_terms if t)
        if len(unique_terms) < len(all_terms):
            duplicates = len(all_terms) - len(unique_terms)
            penalty = min(2.0, (duplicates / len(all_terms)) * 4.0)
            score -= penalty
        
        # Check for overly similar terms (basic check)
        # TODO: Could use edit distance or semantic similarity
        
        return max(0.0, min(10.0, score))
    
    def _score_structure(self, markdown: str, topics: List[Dict]) -> float:
        """
        Score structure (0-10): Is Markdown/JSON formatting correct?
        """
        score = 10.0
        
        if not markdown and not topics:
            return 5.0
        
        # Check Markdown structure
        if markdown:
            # Should have headings
            heading_count = len(re.findall(r'^#{1,3}\s+', markdown, re.MULTILINE))
            if heading_count < 2:
                score -= 2.0
            
            # Should have lists
            list_item_count = len(re.findall(r'^\s*[-*•]\s+', markdown, re.MULTILINE))
            if list_item_count < 3:
                score -= 1.5
            
            # Should have icons/emojis
            has_emoji = any(0x1F300 <= ord(c) <= 0x1F9FF for c in markdown)
            if not has_emoji:
                score -= 1.0
            
            # Check for broken Markdown (unmatched bold, links)
            broken_bold = markdown.count('**') % 2 != 0
            if broken_bold:
                score -= 0.5
        
        # Check topic structure
        if topics:
            # Each topic should have title, icon, and keypoints
            for topic in topics:
                if not topic.get('title'):
                    score -= 0.5
                if not topic.get('icon'):
                    score -= 0.3
                if not topic.get('keypoints'):
                    score -= 0.5
        
        # Check consistency (all topics have similar structure)
        if topics and len(topics) > 1:
            icon_present = [bool(t.get('icon')) for t in topics]
            if not all(icon_present) and any(icon_present):
                score -= 1.0  # Inconsistent icon usage
        
        return max(0.0, min(10.0, score))
    
    def _extract_from_markdown(self, markdown: str) -> Tuple[List[Dict], List[Dict]]:
        """Extract topics and cards from Markdown text."""
        topics = []
        cards = []
        
        # Extract headings as topics
        heading_pattern = r'^#{2,3}\s+([\U0001F300-\U0001F9FF]?)\s*(.+)$'
        matches = re.finditer(heading_pattern, markdown, re.MULTILINE)
        
        for match in matches:
            icon = match.group(1) or '📌'
            title = match.group(2).strip()
            topics.append({'title': title, 'icon': icon, 'keypoints': []})
        
        # Extract list items as cards
        list_pattern = r'^\s*[-*•]\s+\*\*(.+?)\*\*[:\s]+(.+)$'
        matches = re.finditer(list_pattern, markdown, re.MULTILINE)
        
        for match in matches:
            term = match.group(1).strip()
            definition = match.group(2).strip()
            cards.append({'term': term, 'definition': definition})
        
        return topics, cards


# Convenience function

def validate_reviewer_quality(reviewer_data: Dict, content_text: Optional[str] = None) -> Dict:
    """
    Validate reviewer quality with detailed 0-10 scoring.
    
    Args:
        reviewer_data: Reviewer dictionary (topics, cards, markdown)
        content_text: Optional source text for reference
    
    Returns:
        Dict with scores and recommendations
    """
    validator = EnhancedQualityValidator()
    metrics = validator.validate_reviewer(reviewer_data, content_text)
    return metrics.to_dict()
