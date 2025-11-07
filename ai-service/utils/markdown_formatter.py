"""
Markdown formatting utilities for structured AI content output.
Enforces consistent structure with icons, headings, and visual engagement.
"""

import re
import logging
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class MarkdownStructureEnforcer:
    """Enforce consistent Markdown structure on AI outputs."""
    
    def __init__(self):
        self.section_icons = {
            "overview": "📘",
            "introduction": "📘",
            "intro": "📘",
            "main": "📂",
            "key": "🎯",
            "takeaway": "🎯",
            "conclusion": "✨",
            "summary": "💡",
            "important": "⭐",
            "ideas": "📂",
            "points": "📌",
            "concepts": "💡"
        }
    
    def enforce_summary_structure(self, raw_summary: str) -> str:
        """
        Transform raw summary into structured Markdown with sections.
        
        Args:
            raw_summary: Raw AI-generated summary text
        
        Returns:
            Structured Markdown with headings, icons, and proper formatting
        """
        try:
            # Parse existing structure
            lines = raw_summary.split('\n')
            structured_lines = []
            current_section = None
            in_list = False
            
            for line in lines:
                line = line.strip()
                
                # Skip empty lines initially (we'll add them back strategically)
                if not line:
                    if structured_lines and structured_lines[-1] != "":
                        structured_lines.append("")
                    continue
                
                # Check if line looks like a heading
                if line.startswith('#'):
                    # Already a heading, ensure icon
                    heading_text = line.lstrip('#').strip()
                    icon = self._get_section_icon(heading_text)
                    level = len(line) - len(line.lstrip('#'))
                    
                    # Remove existing icon if present
                    # Remove emoji at start (using simple char detection instead of broken regex)
                    if heading_text and ord(heading_text[0]) >= 0x1F300:
                        heading_text = heading_text[1:].strip()
                    
                    structured_lines.append(f"{'#' * level} {icon} {heading_text}")
                    current_section = heading_text.lower()
                    in_list = False
                
                elif len(line) < 50 and (line.endswith(':') or line.isupper()):
                    # Convert to heading
                    heading_text = line.rstrip(':').strip()
                    icon = self._get_section_icon(heading_text)
                    
                    structured_lines.append("")  # Spacing before heading
                    structured_lines.append(f"## {icon} {heading_text}")
                    current_section = heading_text.lower()
                    in_list = False
                
                elif line.startswith(('-', '*', '•', '›', '→')):
                    # Already a bullet point, normalize
                    content = line.lstrip('-*•›→').strip()
                    structured_lines.append(f"- {content}")
                    in_list = True
                
                elif current_section and any(word in current_section for word in ['main', 'key', 'point', 'idea']):
                    # In a section that should have bullets, convert to bullet
                    if not line.startswith('##') and not in_list:
                        # Check if it's a new point (starts with number or capital)
                        if re.match(r'^\d+[\.)]\s*', line) or (line[0].isupper() and '.' in line):
                            content = re.sub(r'^\d+[\.)]\s*', '', line)
                            structured_lines.append(f"- {content}")
                            in_list = True
                        else:
                            structured_lines.append(line)
                    else:
                        structured_lines.append(line)
                
                else:
                    # Regular paragraph
                    structured_lines.append(line)
                    in_list = False
            
            # Join and clean
            result = '\n'.join(structured_lines)
            
            # Ensure minimum structure if missing sections
            if result.count('##') < 2:
                result = self._apply_default_structure(result)
            
            # Final cleanup: remove excessive blank lines
            result = re.sub(r'\n{3,}', '\n\n', result)
            
            return result.strip()
            
        except Exception as e:
            logger.error(f"Structure enforcement failed: {e}", exc_info=True)
            return raw_summary  # Return original if processing fails
    
    def _get_section_icon(self, heading_text: str) -> str:
        """Get appropriate icon for section heading."""
        heading_lower = heading_text.lower()
        
        for keyword, icon in self.section_icons.items():
            if keyword in heading_lower:
                return icon
        
        # Default icons based on position/content
        if any(word in heading_lower for word in ['overview', 'intro', 'about']):
            return "📘"
        elif any(word in heading_lower for word in ['main', 'key', 'important', 'core', 'idea']):
            return "📂"
        elif any(word in heading_lower for word in ['takeaway', 'conclusion', 'summary', 'final']):
            return "🎯"
        elif any(word in heading_lower for word in ['concept', 'definition']):
            return "💡"
        elif any(word in heading_lower for word in ['example', 'case', 'application']):
            return "🔍"
        else:
            return "📝"
    
    def _apply_default_structure(self, content: str) -> str:
        """Apply default 3-section structure to unstructured content."""
        # Remove any existing headings
        content = re.sub(r'^#+\s+.*$', '', content, flags=re.MULTILINE)
        
        # Split into paragraphs
        paragraphs = [p.strip() for p in re.split(r'\n\n+', content) if p.strip()]
        
        if len(paragraphs) < 3:
            # Too short, return as-is with single heading
            return f"## 📘 Summary\n\n{content}"
        
        # Calculate section divisions
        total = len(paragraphs)
        
        # Overview: first 20-30% of content
        overview_end = max(1, int(total * 0.25))
        # Takeaway: last 20-30% of content
        takeaway_start = max(overview_end + 1, int(total * 0.75))
        
        overview_paras = paragraphs[:overview_end]
        main_paras = paragraphs[overview_end:takeaway_start]
        takeaway_paras = paragraphs[takeaway_start:]
        
        # Format sections
        overview = '\n\n'.join(overview_paras)
        
        # Main ideas as bullet points
        main = '\n'.join([f"- {p}" for p in main_paras])
        
        takeaway = '\n\n'.join(takeaway_paras)
        
        return f"""## 📘 Overview

{overview}

## 📂 Main Ideas

{main}

## 🎯 Key Takeaway

{takeaway}"""
    
    def enforce_keypoints_structure(self, keypoints: List[str]) -> List[str]:
        """
        Ensure keypoints follow Term — Definition — Usage structure.
        
        Args:
            keypoints: List of strings (possibly unstructured)
        
        Returns:
            List of structured Markdown keypoints with icons
        """
        structured = []
        
        icon_cycle = ["📖", "💡", "🔍", "⚡", "🎓", "📌", "✨", "🧠", "📚", "🔬"]
        
        for i, kp in enumerate(keypoints):
            try:
                # Parse keypoint into components
                term, description = self._parse_keypoint(kp)
                
                # Try to split description into definition and usage
                sentences = [s.strip() for s in re.split(r'[.!?]+', description) if s.strip()]
                
                # Get icon for this keypoint
                icon = icon_cycle[i % len(icon_cycle)]
                
                if len(sentences) >= 2:
                    # Has enough content for definition + usage
                    definition = sentences[0]
                    if not definition.endswith('.'):
                        definition += '.'
                    
                    usage = ' '.join(sentences[1:])
                    if usage and not usage.endswith(('.', '!', '?')):
                        usage += '.'
                    
                    formatted = f"""- **{term}:**
  - {icon} **Definition:** {definition}
  - 💡 **Use:** {usage}"""
                else:
                    # Single sentence, format simply
                    description_clean = description.strip()
                    if description_clean and not description_clean.endswith(('.', '!', '?')):
                        description_clean += '.'
                    
                    formatted = f"- **{term}:** {icon} {description_clean}"
                
                structured.append(formatted)
                
            except Exception as e:
                logger.warning(f"Failed to structure keypoint {i}: {e}")
                # Fallback: keep original with icon
                icon = icon_cycle[i % len(icon_cycle)]
                structured.append(f"- {icon} {kp}")
        
        return structured
    
    def _parse_keypoint(self, kp: str) -> tuple:
        """
        Parse keypoint into (term, description) components.
        
        Handles formats:
        - "Term - Description"
        - "Term: Description"
        - "**Term:** Description"
        - Plain text
        """
        # Remove leading bullet/number
        kp = re.sub(r'^[\d\-*•›\s]+', '', kp).strip()
        
        # Remove bold markers for parsing
        kp_clean = re.sub(r'\*\*', '', kp)
        
        # Try different separators
        if ' - ' in kp_clean:
            parts = kp_clean.split(' - ', 1)
            term = parts[0].strip()
            description = parts[1].strip() if len(parts) > 1 else ""
        elif ': ' in kp_clean:
            parts = kp_clean.split(': ', 1)
            term = parts[0].strip()
            description = parts[1].strip() if len(parts) > 1 else ""
        else:
            # No clear separator, use first few words as term
            words = kp_clean.split()
            term = ' '.join(words[:min(5, len(words))])
            description = ' '.join(words[5:]) if len(words) > 5 else ""
        
        # Clean term
        term = term.strip(':-–—').strip()
        
        # Remove icon emojis from term if present
        term = ''.join(c for c in term if ord(c) < 0x1F300 or ord(c) > 0x1F9FF).strip()
        
        return term, description


class VisualEnhancer:
    """Add contextual icons and emojis to enhance visual engagement."""
    
    # Content-based icon mapping
    CONTENT_ICONS = {
        # Academic/Educational
        r'\b(definition|define|means|refers to)\b': '📖',
        r'\b(example|instance|case|illustration)\b': '🔍',
        r'\b(important|key|critical|essential|crucial)\b': '⭐',
        r'\b(note|remember|keep in mind|recall)\b': '📌',
        r'\b(formula|equation|calculation|math)\b': '🧮',
        r'\b(process|procedure|steps|method|approach)\b': '⚙️',
        r'\b(benefit|advantage|pro|positive)\b': '✅',
        r'\b(limitation|drawback|con|issue|problem)\b': '⚠️',
        r'\b(comparison|versus|vs|contrast|compare)\b': '⚖️',
        r'\b(question|quiz|test|exam)\b': '❓',
        r'\b(answer|solution|result|outcome)\b': '✔️',
        r'\b(concept|idea|theory|principle)\b': '💡',
        r'\b(fact|truth|reality|evidence)\b': '📋',
        r'\b(application|use|usage|apply|implement)\b': '🔧',
        r'\b(research|study|investigation)\b': '🔬',
        r'\b(analysis|examine|evaluate)\b': '🔎',
    }
    
    def enhance_text(self, text: str, mode: str = 'subtle') -> str:
        """
        Add contextual icons to text based on content.
        
        Args:
            text: Input text
            mode: 'subtle' (few icons), 'moderate', or 'rich' (many icons)
        
        Returns:
            Enhanced text with icons
        """
        if mode == 'subtle':
            return self._enhance_subtle(text)
        elif mode == 'moderate':
            return self._enhance_moderate(text)
        else:  # rich
            return self._enhance_rich(text)
    
    def _enhance_subtle(self, text: str) -> str:
        """Only enhance section headings."""
        lines = text.split('\n')
        enhanced = []
        
        for line in lines:
            if line.startswith('##'):
                # Add icon to headings if not present
                if not self._has_emoji(line):
                    # Detect content type
                    icon = self._detect_heading_icon(line)
                    line = line.replace('##', f'## {icon}', 1)
            enhanced.append(line)
        
        return '\n'.join(enhanced)
    
    def _enhance_moderate(self, text: str) -> str:
        """Enhance headings + first occurrence of key terms."""
        enhanced = text
        seen_patterns = set()
        
        # First, enhance headings
        enhanced = self._enhance_subtle(enhanced)
        
        # Then add icons to first occurrence of key terms
        for pattern, icon in self.CONTENT_ICONS.items():
            if pattern in seen_patterns:
                continue
            
            match = re.search(pattern, enhanced, re.IGNORECASE)
            if match:
                matched_text = match.group(0)
                # Only add if not already part of a heading or bullet
                line_with_match = [line for line in enhanced.split('\n') if matched_text in line]
                if line_with_match and not any(l.startswith(('#', '-', '*')) for l in line_with_match):
                    enhanced = enhanced.replace(
                        matched_text,
                        f"{icon} {matched_text}",
                        1
                    )
                    seen_patterns.add(pattern)
        
        return enhanced
    
    def _enhance_rich(self, text: str) -> str:
        """Enhance all occurrences (may be cluttered)."""
        enhanced = self._enhance_subtle(text)
        
        for pattern, icon in self.CONTENT_ICONS.items():
            # Add icon before pattern (limit to 3 per pattern to avoid clutter)
            count = 0
            
            def replace_with_icon(match):
                nonlocal count
                if count < 3:
                    count += 1
                    return f'{icon} {match.group(0)}'
                return match.group(0)
            
            enhanced = re.sub(
                f'({pattern})',
                replace_with_icon,
                enhanced,
                flags=re.IGNORECASE
            )
        
        return enhanced
    
    def _detect_heading_icon(self, heading: str) -> str:
        """Detect appropriate icon for heading based on content."""
        heading_lower = heading.lower()
        
        # Check patterns
        for pattern, icon in self.CONTENT_ICONS.items():
            if re.search(pattern, heading_lower):
                return icon
        
        # Default section icons
        if any(word in heading_lower for word in ['overview', 'introduction', 'about']):
            return '📘'
        elif any(word in heading_lower for word in ['main', 'key', 'core', 'primary']):
            return '📂'
        elif any(word in heading_lower for word in ['takeaway', 'conclusion', 'summary', 'final']):
            return '🎯'
        elif any(word in heading_lower for word in ['example', 'case', 'application']):
            return '🔍'
        else:
            return '💡'
    
    def _has_emoji(self, text: str) -> bool:
        """Check if text contains emoji characters."""
        return any(0x1F300 <= ord(c) <= 0x1F9FF for c in text)


# Convenience functions for use in other modules

def format_summary(raw_summary: str, enhance_mode: str = 'subtle') -> str:
    """
    Format summary with structure and visual enhancements.
    
    Args:
        raw_summary: Raw AI-generated summary
        enhance_mode: Visual enhancement mode ('subtle', 'moderate', 'rich')
    
    Returns:
        Structured and enhanced Markdown summary
    """
    enforcer = MarkdownStructureEnforcer()
    enhancer = VisualEnhancer()
    
    # First enforce structure
    structured = enforcer.enforce_summary_structure(raw_summary)
    
    # Then add visual enhancements
    enhanced = enhancer.enhance_text(structured, mode=enhance_mode)
    
    return enhanced


def format_keypoints(raw_keypoints: List[str]) -> List[str]:
    """
    Format keypoints with Term-Definition-Usage structure and icons.
    
    Args:
        raw_keypoints: List of raw keypoint strings
    
    Returns:
        List of structured Markdown keypoints
    """
    enforcer = MarkdownStructureEnforcer()
    return enforcer.enforce_keypoints_structure(raw_keypoints)


def to_structured_keypoints(raw_keypoints: List[str]) -> List[Dict]:
    """Convert simple keypoint strings into structured objects with dual-level content.

    Output schema per item:
    - term: str
    - definition: str (for backwards compatibility, set to short_definition)
    - short_definition: str (concise 1-2 sentences, ~25 words)
    - full_definition: str (complete definition with all details)
    - bulleted_highlights: List[str] (2-6 key facts as bullets)
    - usage: Optional[str]
    - icon: str
    - importance: float (0-1)
    - source_span: Optional[str]
    """
    from models.summarizer import Summarizer
    
    enforcer = MarkdownStructureEnforcer()
    summarizer = Summarizer()
    structured: List[Dict] = []

    icon_cycle = ["📖", "💡", "🔍", "⚡", "🎓", "📌", "✨", "🧠", "📚", "🔬"]

    for i, kp in enumerate(raw_keypoints):
        try:
            term, description = enforcer._parse_keypoint(kp)
            # Split description into definition and usage sentences
            sentences = [s.strip() for s in re.split(r'[.!?]+', description) if s.strip()]
            full_def = sentences[0] if sentences else description
            usage = ' '.join(sentences[1:]) if len(sentences) > 1 else None

            # Ensure punctuation
            if full_def and not full_def.endswith(('.', '!', '?')):
                full_def += '.'
            if usage and not usage.endswith(('.', '!', '?')):
                usage += '.'

            # Create short definition (concise, scannable)
            short_def = summarizer.create_short_definition(full_def, max_words=40)
            
            # Create bulleted highlights from full definition
            bullets = summarizer.create_bulleted_highlights(full_def, max_bullets=6)

            icon = icon_cycle[i % len(icon_cycle)]
            # Simple importance heuristic: earlier points are more important
            importance = 1.0 - (i / max(1, len(raw_keypoints) - 1)) * 0.5  # range ~ [0.5, 1.0]

            structured.append({
                "term": term or f"Concept {i+1}",
                "definition": short_def,  # Backwards compatible: use short version
                "short_definition": short_def,
                "full_definition": full_def or "Key concept from the material.",
                "bulleted_highlights": bullets,
                "usage": usage,
                "icon": icon,
                "importance": round(max(0.0, min(1.0, importance)), 2),
                "source_span": None,
            })
        except Exception as e:
            logger.warning(f"Failed to parse keypoint {i}: {e}")
            # Fallback: trim to ~40 words with typographic ellipsis if needed
            from utils.truncate_helpers import truncate_words
            words = kp.split()
            if len(words) <= 40:
                fallback_def = kp
            else:
                fallback_def, _ = truncate_words(kp, 40)
            structured.append({
                "term": f"Concept {i+1}",
                "definition": fallback_def,
                "short_definition": fallback_def,
                "full_definition": kp,
                "bulleted_highlights": [],
                "usage": None,
                "icon": icon_cycle[i % len(icon_cycle)],
                "importance": 0.5,
                "source_span": None,
            })

    return structured


def build_study_note(summary_markdown: str, keypoints_struct: List[Dict], title: Optional[str] = None,
                     keypoints_heading: str = "Key Concepts") -> Tuple[str, List[Dict]]:
    """Build a cohesive markdown document combining summary and keypoints.

    Returns (document_markdown, outline) where outline is a list of {title, level}.
    """
    # Ensure summary has structure and subtle enhancements
    summary_md = format_summary(summary_markdown, enhance_mode='subtle')

    # Build keypoints section
    kp_lines: List[str] = []
    kp_lines.append(f"## 📌 {keypoints_heading}")
    for item in keypoints_struct:
        term = item.get("term", "Term")
        definition = item.get("definition", "")
        usage = item.get("usage")
        icon = item.get("icon", "📌")
        
        # Normalize definition and usage to clean bullets
        definition_clean = _normalize_list_separators(definition)
        usage_clean = _normalize_list_separators(usage) if usage else None
        
        if usage_clean:
            kp_lines.append(f"- **{term}:** {icon} {definition_clean}")
            kp_lines.append(f"  - 💡 Use: {usage_clean}")
        else:
            kp_lines.append(f"- **{term}:** {icon} {definition_clean}")

    keypoints_md = "\n".join(kp_lines)

    # Optional title
    title_md = f"# 📝 {title}\n\n" if title else ""

    document_md = f"{title_md}{summary_md}\n\n{keypoints_md}".strip()

    # Build outline by scanning headings
    outline: List[Dict] = []
    for line in document_md.split('\n'):
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            heading_text = line.lstrip('#').strip()
            # Remove leading emoji
            if heading_text and ord(heading_text[0]) >= 0x1F300:
                heading_text = heading_text[1:].strip()
            outline.append({"title": heading_text, "level": level})

    return document_md, outline


def _normalize_list_separators(text: str) -> str:
    """Convert list-like separators into clean markdown bullets.
    
    Converts patterns like " - ", " • ", "• " into proper line-break bullets
    when there are multiple separators and minimal punctuation.
    
    Args:
        text: Input text with potential list separators
    
    Returns:
        Normalized text with proper bullets or original if not list-like
    """
    if not text or '\n' in text:
        # Already has newlines or empty, skip
        return text
    
    # Count space-surrounded separators and periods
    bullet_pattern = r'\s+[•–—\-]\s+'
    separator_count = len(re.findall(bullet_pattern, text))
    period_count = text.count('.')
    
    # Only normalize if looks like a list (>=2 separators, <=1 period)
    if separator_count < 2 or period_count > 1:
        return text
    
    # Split on the separator pattern
    parts = re.split(bullet_pattern, text)
    
    # Clean and filter parts
    cleaned_parts = []
    for part in parts:
        part = part.strip()
        # Skip empty or very short segments
        if len(part) < 3:
            continue
        # Skip if purely punctuation
        if not any(c.isalnum() for c in part):
            continue
        cleaned_parts.append(part)
    
    # Cap at 8 bullets for readability
    if len(cleaned_parts) > 8:
        cleaned_parts = cleaned_parts[:8]
        cleaned_parts.append("…")
    
    # If we got meaningful parts, format as bullets
    if len(cleaned_parts) >= 2:
        # Join with newline bullets
        return '\n• ' + '\n• '.join(cleaned_parts)
    else:
        # Not enough parts, return original
        return text

