"""
Structured formatting templates for different concept types.
Provides domain-adaptive formatting for definitions, comparisons, type lists, etc.
"""

import re
import logging
from typing import List, Dict, Optional
from utils.concept_detector import ConceptType, Concept

logger = logging.getLogger(__name__)


class StructuredFormatter:
    """Format concepts using structured templates based on type."""
    
    def __init__(self):
        # Icon mapping for different concept types
        self.type_icons = {
            ConceptType.DEFINITION: "📖",
            ConceptType.COMPARISON: "⚖️",
            ConceptType.TYPE_LIST: "📚",
            ConceptType.PROCESS: "⚙️",
            ConceptType.EXAMPLE: "💡",
            ConceptType.FORMULA: "🧮",
            ConceptType.MERGED: "🧩",
            ConceptType.SIMPLE: "📌"
        }
        
        # Domain-specific icon suggestions
        self.domain_icons = {
            'medical': '🩺', 'anatomy': '🧬', 'clinical': '🏥',
            'law': '⚖️', 'legal': '📜', 'statute': '📋',
            'computer': '💻', 'programming': '⌨️', 'algorithm': '🔢',
            'business': '💼', 'finance': '💰', 'economics': '📈',
            'science': '🔬', 'chemistry': '🧪', 'physics': '⚛️'
        }
    
    def format_concept(self, concept: Concept, style: str = 'markdown') -> str:
        """
        Format a concept using appropriate template.
        
        Args:
            concept: Concept object to format
            style: Output style ('markdown', 'json', 'plain')
        
        Returns:
            Formatted string
        """
        if style == 'markdown':
            return self._format_markdown(concept)
        elif style == 'json':
            return self._format_json(concept)
        else:
            return self._format_plain(concept)
    
    def format_definition(self, term: str, definition: str, example: Optional[str] = None) -> str:
        """
        Format a definition block.
        
        Template:
        🧩 [Concept]
        📖 Definition: ...
        💡 Example: ... (if provided)
        """
        icon = "🧩"
        lines = [f"{icon} **{term}**"]
        lines.append(f"- 📖 **Definition:** {definition}")
        
        if example:
            lines.append(f"- 💡 **Example:** {example}")
        
        return '\n'.join(lines)
    
    def format_comparison(
        self,
        term_a: str,
        term_b: str,
        def_a: str,
        def_b: str,
        difference: Optional[str] = None
    ) -> str:
        """
        Format a comparison block.
        
        Template:
        ⚖️ [Concept A] vs [Concept B]
        • [Concept A]: ...
        • [Concept B]: ...
        🧩 Note: [Key difference]
        """
        lines = [f"⚖️ **{term_a} vs {term_b}**"]
        lines.append(f"- **{term_a}:** {def_a}")
        lines.append(f"- **{term_b}:** {def_b}")
        
        if difference:
            lines.append(f"- 🧩 **Note:** {difference}")
        
        return '\n'.join(lines)
    
    def format_type_list(
        self,
        parent_term: str,
        subtypes: List[Dict[str, str]]
    ) -> str:
        """
        Format a type/category list.
        
        Template:
        📚 Types of [Concept]
        • Type A: ...
        • Type B: ...
        """
        lines = [f"📚 **Types of {parent_term}**"]
        
        for subtype in subtypes:
            type_name = subtype.get('name', '')
            type_def = subtype.get('definition', '')
            
            if type_def:
                lines.append(f"- **{type_name}:** {type_def}")
            else:
                lines.append(f"- {type_name}")
        
        return '\n'.join(lines)
    
    def format_process(
        self,
        process_name: str,
        steps: List[str],
        description: Optional[str] = None
    ) -> str:
        """
        Format a process/procedure.
        
        Template:
        ⚙️ [Process Name]
        📖 Description: ... (if provided)
        Steps:
        1. ...
        2. ...
        """
        lines = [f"⚙️ **{process_name}**"]
        
        if description:
            lines.append(f"- 📖 {description}")
        
        lines.append("\n**Steps:**")
        for i, step in enumerate(steps, 1):
            lines.append(f"{i}. {step}")
        
        return '\n'.join(lines)
    
    def detect_and_format(self, text: str) -> str:
        """
        Auto-detect concept type and format appropriately.
        
        Args:
            text: Raw text to analyze and format
        
        Returns:
            Formatted markdown string
        """
        from utils.concept_detector import ConceptDetector
        
        detector = ConceptDetector()
        concepts = detector.detect_concepts(text)
        
        if not concepts:
            return text
        
        formatted_parts = []
        for concept in concepts:
            formatted = self._format_markdown(concept)
            formatted_parts.append(formatted)
        
        return '\n\n'.join(formatted_parts)
    
    # Private formatting methods
    
    def _format_markdown(self, concept: Concept) -> str:
        """Format concept as Markdown."""
        icon = self._get_icon(concept)
        
        if concept.concept_type == ConceptType.COMPARISON:
            # Comparison template
            lines = [f"{icon} **{concept.term}**"]
            if concept.comparison_partner:
                lines[0] = f"{icon} **{concept.term} vs {concept.comparison_partner}**"
            lines.append(f"- {concept.definition}")
            return '\n'.join(lines)
        
        elif concept.concept_type == ConceptType.TYPE_LIST:
            # Type list template
            lines = [f"{icon} **Types of {concept.term}**"]
            if concept.subtypes:
                for subtype in concept.subtypes:
                    lines.append(f"- {subtype}")
            else:
                lines.append(f"- {concept.definition}")
            return '\n'.join(lines)
        
        elif concept.concept_type == ConceptType.DEFINITION:
            # Standard definition template
            lines = [f"{icon} **{concept.term}**"]
            lines.append(f"- 📖 {concept.definition}")
            
            if concept.examples:
                lines.append(f"- 💡 **Examples:** {', '.join(concept.examples)}")
            
            return '\n'.join(lines)
        
        else:
            # Simple format
            return f"{icon} **{concept.term}:** {concept.definition}"
    
    def _format_json(self, concept: Concept) -> Dict:
        """Format concept as JSON dict."""
        return {
            "term": concept.term,
            "definition": concept.definition,
            "type": concept.concept_type.value,
            "icon": self._get_icon(concept),
            "subtypes": concept.subtypes or [],
            "comparison_partner": concept.comparison_partner,
            "examples": concept.examples or [],
            "importance": concept.importance
        }
    
    def _format_plain(self, concept: Concept) -> str:
        """Format concept as plain text."""
        if concept.concept_type == ConceptType.COMPARISON and concept.comparison_partner:
            return f"{concept.term} vs {concept.comparison_partner}: {concept.definition}"
        elif concept.concept_type == ConceptType.TYPE_LIST and concept.subtypes:
            return f"{concept.term}: {', '.join(concept.subtypes)}"
        else:
            return f"{concept.term}: {concept.definition}"
    
    def _get_icon(self, concept: Concept) -> str:
        """Get appropriate icon for concept."""
        # First try type-specific icon
        icon = self.type_icons.get(concept.concept_type, "📌")
        
        # Check for domain-specific override
        combined = (concept.term + ' ' + concept.definition).lower()
        for domain, domain_icon in self.domain_icons.items():
            if domain in combined:
                return domain_icon
        
        return icon


class ReviewerDocumentBuilder:
    """Build complete reviewer documents with structured sections."""
    
    def __init__(self):
        self.formatter = StructuredFormatter()
    
    def build_document(
        self,
        concepts: List[Concept],
        title: Optional[str] = None,
        group_by_type: bool = True
    ) -> str:
        """
        Build a complete reviewer document from concepts.
        
        Args:
            concepts: List of Concept objects
            title: Optional document title
            group_by_type: Whether to group concepts by type (default: True)
        
        Returns:
            Complete Markdown document
        """
        lines = []
        
        # Title
        if title:
            lines.append(f"# 📘 {title}\n")
        else:
            lines.append("# 📘 Study Reviewer\n")
        
        if group_by_type:
            # Group concepts by type
            grouped = self._group_concepts_by_type(concepts)
            
            for concept_type, type_concepts in grouped.items():
                if not type_concepts:
                    continue
                
                # Section header
                section_title = self._get_section_title(concept_type)
                lines.append(f"## {section_title}\n")
                
                # Format each concept
                for concept in type_concepts:
                    formatted = self.formatter.format_concept(concept, style='markdown')
                    lines.append(formatted)
                    lines.append("")  # Blank line between concepts
        
        else:
            # Flat list of concepts
            lines.append("## 📌 Key Concepts\n")
            for concept in concepts:
                formatted = self.formatter.format_concept(concept, style='markdown')
                lines.append(formatted)
                lines.append("")
        
        return '\n'.join(lines)
    
    def _group_concepts_by_type(self, concepts: List[Concept]) -> Dict[ConceptType, List[Concept]]:
        """Group concepts by their type."""
        grouped = {}
        for concept in concepts:
            if concept.concept_type not in grouped:
                grouped[concept.concept_type] = []
            grouped[concept.concept_type].append(concept)
        
        # Sort groups by pedagogical importance
        importance_order = [
            ConceptType.DEFINITION,
            ConceptType.TYPE_LIST,
            ConceptType.COMPARISON,
            ConceptType.PROCESS,
            ConceptType.EXAMPLE,
            ConceptType.SIMPLE
        ]
        
        sorted_grouped = {}
        for ctype in importance_order:
            if ctype in grouped:
                sorted_grouped[ctype] = grouped[ctype]
        
        # Add any remaining types
        for ctype, concepts in grouped.items():
            if ctype not in sorted_grouped:
                sorted_grouped[ctype] = concepts
        
        return sorted_grouped
    
    def _get_section_title(self, concept_type: ConceptType) -> str:
        """Get section title for concept type."""
        titles = {
            ConceptType.DEFINITION: "📖 Definitions",
            ConceptType.COMPARISON: "⚖️ Comparisons",
            ConceptType.TYPE_LIST: "📚 Classifications",
            ConceptType.PROCESS: "⚙️ Processes",
            ConceptType.EXAMPLE: "💡 Examples",
            ConceptType.FORMULA: "🧮 Formulas",
            ConceptType.MERGED: "🧩 Related Concepts",
            ConceptType.SIMPLE: "📌 Key Points"
        }
        return titles.get(concept_type, "📌 Concepts")


# Convenience functions

def format_definition(term: str, definition: str, example: Optional[str] = None) -> str:
    """Format a definition block."""
    formatter = StructuredFormatter()
    return formatter.format_definition(term, definition, example)


def format_comparison(term_a: str, term_b: str, def_a: str, def_b: str) -> str:
    """Format a comparison block."""
    formatter = StructuredFormatter()
    return formatter.format_comparison(term_a, term_b, def_a, def_b)


def format_type_list(parent_term: str, subtypes: List[Dict[str, str]]) -> str:
    """Format a type/category list."""
    formatter = StructuredFormatter()
    return formatter.format_type_list(parent_term, subtypes)


def auto_format(text: str) -> str:
    """Auto-detect and format text with appropriate template."""
    formatter = StructuredFormatter()
    return formatter.detect_and_format(text)
