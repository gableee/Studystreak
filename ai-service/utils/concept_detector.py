"""
Domain-adaptive concept detection and separation.
Automatically identifies and splits merged concepts, comparisons, type lists, and definitions.
"""

import re
import logging
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ConceptType(Enum):
    """Types of concepts that can be detected."""
    DEFINITION = "definition"
    COMPARISON = "comparison"
    TYPE_LIST = "type_list"
    PROCESS = "process"
    EXAMPLE = "example"
    FORMULA = "formula"
    MERGED = "merged"  # Multiple concepts joined (e.g., "Data and Information")
    SIMPLE = "simple"


@dataclass
class Concept:
    """Represents a detected concept."""
    term: str
    definition: str
    concept_type: ConceptType
    subtypes: List[str] = None
    comparison_partner: Optional[str] = None
    examples: List[str] = None
    importance: float = 0.5
    
    def to_dict(self) -> Dict:
        return {
            "term": self.term,
            "definition": self.definition,
            "type": self.concept_type.value,
            "subtypes": self.subtypes or [],
            "comparison_partner": self.comparison_partner,
            "examples": self.examples or [],
            "importance": self.importance
        }


class ConceptDetector:
    """Detect and separate concepts from text automatically."""
    
    def __init__(self):
        # Patterns for detecting different concept types
        self.definition_patterns = [
            r'^(.+?)\s+(?:is|are|refers? to|means?|represents?|defines?)\s+(.+)$',
            r'^(.+?):\s*(.+)$',
            r'^Definition(?:\s+of)?\s+(.+?):\s*(.+)$',
        ]
        
        self.comparison_patterns = [
            r'^(.+?)\s+(?:vs\.?|versus|compared to|versus)\s+(.+?):\s*(.+)$',
            r'^(.+?)\s+(?:vs\.?|versus)\s+(.+?)$',
            r'Difference between (.+?) and (.+?):\s*(.+)',
            r'(.+?) differs from (.+?) in that (.+)',
        ]
        
        self.type_list_patterns = [
            r'^Types? of (.+?):\s*(.+)$',
            r'^Categories of (.+?):\s*(.+)$',
            r'^Kinds of (.+?):\s*(.+)$',
            r'^(.+?) can be classified into:\s*(.+)$',
        ]
        
        self.merged_patterns = [
            r'^(.+?) (?:and|&) (.+?)$',  # "Data and Information"
            r'^(.+?),\s*(.+?),?\s*(?:and|&)\s*(.+?)$',  # "A, B and C"
        ]
        
        # Common coordinating conjunctions that suggest merged concepts
        self.merge_indicators = {'and', '&', 'or', 'with'}
        
        # Domain indicators for importance scoring
        self.importance_keywords = {
            'key', 'main', 'primary', 'important', 'critical', 'essential',
            'fundamental', 'core', 'basic', 'central', 'major'
        }
    
    def detect_concepts(self, text: str) -> List[Concept]:
        """
        Detect and separate all concepts from text.
        
        Args:
            text: Input text (can be a paragraph or snippet)
        
        Returns:
            List of detected Concept objects
        """
        concepts = []
        
        # Try to detect different types
        if comp := self._detect_comparison(text):
            concepts.append(comp)
        elif type_list := self._detect_type_list(text):
            concepts.extend(type_list)
        elif merged := self._detect_merged(text):
            concepts.extend(merged)
        elif definition := self._detect_definition(text):
            concepts.append(definition)
        else:
            # Fallback: treat as simple concept
            concepts.append(self._create_simple_concept(text))
        
        # Score importance for all concepts
        for concept in concepts:
            concept.importance = self._calculate_importance(concept)
        
        return concepts
    
    def split_merged_concepts(self, term: str, definition: str) -> List[Concept]:
        """
        Split merged concepts like "Data and Information" into separate entries.
        
        Args:
            term: Term that might contain multiple concepts
            definition: Definition text
        
        Returns:
            List of separated Concept objects
        """
        # Check if term contains merge indicators
        if not any(word in term.lower().split() for word in self.merge_indicators):
            return [Concept(term, definition, ConceptType.SIMPLE)]
        
        # Try to split by common patterns
        terms = self._split_term(term)
        
        if len(terms) <= 1:
            return [Concept(term, definition, ConceptType.SIMPLE)]
        
        # Check if definition also mentions multiple concepts
        concepts = []
        definition_parts = self._split_definition_by_concepts(definition, terms)
        
        if len(definition_parts) == len(terms):
            # We have matching definitions for each term
            for i, t in enumerate(terms):
                concepts.append(Concept(
                    term=t.strip(),
                    definition=definition_parts[i].strip(),
                    concept_type=ConceptType.DEFINITION
                ))
        else:
            # Share the definition but mark as separated
            for t in terms:
                concepts.append(Concept(
                    term=t.strip(),
                    definition=definition,
                    concept_type=ConceptType.MERGED
                ))
        
        return concepts
    
    def detect_comparisons(self, text: str) -> Optional[Tuple[Concept, Concept]]:
        """
        Detect comparison patterns (A vs B).
        
        Returns:
            Tuple of (concept_a, concept_b) if comparison detected, else None
        """
        result = self._detect_comparison(text)
        if result and result.comparison_partner:
            # Create second concept for the partner
            partner = Concept(
                term=result.comparison_partner,
                definition=f"Compared with {result.term}",
                concept_type=ConceptType.COMPARISON,
                comparison_partner=result.term
            )
            return (result, partner)
        return None
    
    def detect_type_hierarchy(self, text: str) -> Optional[Dict]:
        """
        Detect type/category hierarchies (Types of X: A, B, C).
        
        Returns:
            Dict with parent concept and list of subtypes
        """
        concepts = self._detect_type_list(text)
        if concepts and len(concepts) > 0:
            parent = concepts[0]
            return {
                "parent": parent.term,
                "subtypes": parent.subtypes or [],
                "definitions": [c.definition for c in concepts]
            }
        return None
    
    # Private detection methods
    
    def _detect_definition(self, text: str) -> Optional[Concept]:
        """Detect standard definition pattern."""
        for pattern in self.definition_patterns:
            if match := re.match(pattern, text, re.IGNORECASE):
                groups = match.groups()
                if len(groups) >= 2:
                    term = groups[0].strip()
                    definition = groups[1].strip()
                    return Concept(term, definition, ConceptType.DEFINITION)
        return None
    
    def _detect_comparison(self, text: str) -> Optional[Concept]:
        """Detect comparison pattern (X vs Y)."""
        for pattern in self.comparison_patterns:
            if match := re.match(pattern, text, re.IGNORECASE):
                groups = match.groups()
                if len(groups) >= 2:
                    term_a = groups[0].strip()
                    term_b = groups[1].strip()
                    definition = groups[2].strip() if len(groups) > 2 else f"Compared with {term_b}"
                    
                    return Concept(
                        term=term_a,
                        definition=definition,
                        concept_type=ConceptType.COMPARISON,
                        comparison_partner=term_b
                    )
        return None
    
    def _detect_type_list(self, text: str) -> List[Concept]:
        """Detect type list pattern (Types of X: A, B, C)."""
        for pattern in self.type_list_patterns:
            if match := re.match(pattern, text, re.IGNORECASE):
                groups = match.groups()
                if len(groups) >= 2:
                    parent_term = groups[0].strip()
                    types_text = groups[1].strip()
                    
                    # Split types by common delimiters
                    subtypes = self._split_list(types_text)
                    
                    concepts = []
                    # Create parent concept
                    concepts.append(Concept(
                        term=parent_term,
                        definition=f"Can be classified into: {', '.join(subtypes)}",
                        concept_type=ConceptType.TYPE_LIST,
                        subtypes=subtypes
                    ))
                    
                    # Create individual type concepts
                    for subtype in subtypes:
                        concepts.append(Concept(
                        term=subtype,
                            definition=f"A type of {parent_term}",
                            concept_type=ConceptType.DEFINITION
                        ))
                    
                    return concepts
        return []
    
    def _detect_merged(self, text: str) -> List[Concept]:
        """Detect merged concepts (Data and Information)."""
        # First try pattern matching
        for pattern in self.merged_patterns:
            if match := re.match(pattern, text, re.IGNORECASE):
                groups = match.groups()
                terms = [g.strip() for g in groups if g]
                
                # Check if these look like separate concepts
                if all(self._is_valid_term(t) for t in terms):
                    return [
                        Concept(t, f"Key concept from the material", ConceptType.MERGED)
                        for t in terms
                    ]
        
        # Fallback: check term structure
        if ' and ' in text or ' & ' in text:
            return self.split_merged_concepts(text, "Key concept from the material")
        
        return []
    
    def _create_simple_concept(self, text: str) -> Concept:
        """Create a simple concept from plain text."""
        # Look for sentence structure: Subject + verb + definition
        # Pattern 1: "Term is/means/refers to definition"
        match = re.match(r'^([A-Z][^.:]+?)\s+(is|are|means?|refers? to|represents?)\s+(.+)$', text.strip())
        if match:
            term = match.group(1).strip()
            definition = match.group(3).strip()
            return Concept(term, definition, ConceptType.SIMPLE)
        
        # Pattern 2: Sentence starting with noun phrase (capitalize first N words)
        words = text.split()
        if len(words) >= 3:
            # Extract noun phrase (up to first verb or 5 words)
            verbs = {'is', 'are', 'was', 'were', 'means', 'refers', 'represents', 'describes', 'includes', 'provides', 'allows', 'enables'}
            verb_pos = None
            for i, word in enumerate(words):
                if word.lower() in verbs and i > 0:
                    verb_pos = i
                    break
            
            if verb_pos and verb_pos <= 8:
                term = ' '.join(words[:verb_pos])
                definition = ' '.join(words[verb_pos+1:]) if verb_pos+1 < len(words) else ' '.join(words[verb_pos:])
            else:
                # Fallback: first 4 words as term
                term = ' '.join(words[:min(4, len(words))])
                definition = ' '.join(words[min(4, len(words)):]) if len(words) > 4 else text
        else:
            term = text
            definition = "Key concept from the material"
        
        return Concept(term, definition, ConceptType.SIMPLE)
    
    def _split_term(self, term: str) -> List[str]:
        """Split a compound term into individual terms."""
        # Handle common patterns
        if ' and ' in term.lower():
            return [t.strip() for t in re.split(r'\s+and\s+', term, flags=re.IGNORECASE)]
        elif ' & ' in term:
            return [t.strip() for t in term.split('&')]
        elif ', ' in term:
            # Handle comma-separated lists
            parts = [t.strip() for t in term.split(',')]
            # Check for final "and" conjunction
            if len(parts) > 1 and ' and ' in parts[-1].lower():
                last_parts = re.split(r'\s+and\s+', parts[-1], flags=re.IGNORECASE)
                return parts[:-1] + [t.strip() for t in last_parts]
            return parts
        
        return [term]
    
    def _split_definition_by_concepts(self, definition: str, terms: List[str]) -> List[str]:
        """Try to split definition into parts matching each term."""
        # Look for patterns that separate definitions
        # e.g., "X is ... Y is ..." or "X: ... Y: ..."
        parts = []
        
        for term in terms:
            # Try to find segment mentioning this term
            pattern = rf'{re.escape(term)}[:\s]+([^.]+\.)'
            if match := re.search(pattern, definition, re.IGNORECASE):
                parts.append(match.group(1).strip())
        
        # If we found matching parts, return them
        if len(parts) == len(terms):
            return parts
        
        # Fallback: try splitting by sentence
        sentences = [s.strip() for s in re.split(r'[.!?]+', definition) if s.strip()]
        if len(sentences) >= len(terms):
            return sentences[:len(terms)]
        
        return []
    
    def _split_list(self, text: str) -> List[str]:
        """Split a list of items."""
        # Handle various list formats
        if re.search(r'\d+\.', text):  # Numbered list
            items = re.split(r'\d+\.\s*', text)
        elif '•' in text or '-' in text:  # Bulleted list
            items = re.split(r'[•\-]\s*', text)
        elif ';' in text:  # Semicolon separated
            items = text.split(';')
        else:  # Comma separated (default)
            items = text.split(',')
        
        # Clean and filter
        cleaned = []
        for item in items:
            item = item.strip().strip('and').strip()
            if item and len(item) > 2:
                # Remove trailing "and" or "or"
                item = re.sub(r'\s+(and|or)$', '', item, flags=re.IGNORECASE)
                cleaned.append(item.strip())
        
        return cleaned
    
    def _is_valid_term(self, term: str) -> bool:
        """Check if a string looks like a valid term."""
        # Must be at least 2 words or a single capitalized word
        words = term.split()
        if len(words) == 0:
            return False
        if len(words) == 1:
            return len(term) >= 3 and (term[0].isupper() or term.isupper())
        return len(term) >= 3
    
    def _calculate_importance(self, concept: Concept) -> float:
        """Calculate importance score for a concept (0-1)."""
        score = 0.5  # Base score
        
        # Boost for comparison and type lists (often important)
        if concept.concept_type == ConceptType.COMPARISON:
            score += 0.2
        elif concept.concept_type == ConceptType.TYPE_LIST:
            score += 0.15
        elif concept.concept_type == ConceptType.DEFINITION:
            score += 0.1
        
        # Boost for importance keywords in term or definition
        combined = (concept.term + ' ' + concept.definition).lower()
        keyword_count = sum(1 for kw in self.importance_keywords if kw in combined)
        score += min(keyword_count * 0.05, 0.2)
        
        # Boost for length (more detailed definitions often more important)
        if len(concept.definition.split()) >= 20:
            score += 0.1
        
        # Boost for having examples
        if concept.examples and len(concept.examples) > 0:
            score += 0.05
        
        return min(1.0, score)


# Convenience functions

def detect_and_split_concepts(text: str) -> List[Dict]:
    """Detect and split all concepts from text."""
    detector = ConceptDetector()
    concepts = detector.detect_concepts(text)
    return [c.to_dict() for c in concepts]


def split_merged_term(term: str, definition: str) -> List[Dict]:
    """Split merged terms like 'Data and Information' into separate concepts."""
    detector = ConceptDetector()
    concepts = detector.split_merged_concepts(term, definition)
    return [c.to_dict() for c in concepts]
