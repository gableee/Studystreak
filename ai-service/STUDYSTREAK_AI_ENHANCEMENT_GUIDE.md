# StudyStreak AI Enhancement Guide
## Structured Markdown Output with Visual Engagement

**Date:** November 7, 2025  
**Purpose:** Transform AI-generated content into visually engaging, structured Markdown for optimal learner retention

---

## 🎯 Overview

This guide provides prompt templates, post-processing strategies, and frontend rendering recommendations to enhance StudyStreak's AI content generation with:

- **Structured Markdown** with headings, bullet points, and meaningful emojis
- **Visual engagement** through icons, formatting, and clear sectioning
- **Efficient one-time generation** with persistent storage and reuse
- **Semantic quality** through better prompting and post-processing

---

## 📋 Section 1: Enhanced Prompt Templates

### 1.1 Summary Generation Prompt

**Current Approach:** BART generates plain text summaries  
**Enhanced Approach:** Instruction-based prompting for structured essay-style Markdown

#### **Prompt Template:**

```python
def get_enhanced_summary_prompt(text: str, max_words: int = 400) -> str:
    """Generate structured Markdown summary prompt."""
    return f"""Create a comprehensive summary in structured Markdown format with clear sections and visual icons.

FORMATTING REQUIREMENTS:
- Use markdown headings (##) for sections
- Include relevant emojis/icons at start of each section (📘 📂 🎯 💡 ✨)
- Use bullet points (-) for lists
- Keep total length under {max_words} words

STRUCTURE:
## 📘 Overview
[Brief 2-3 sentence overview of main topic]

## 📂 Main Ideas
- **Concept A** — Clear explanation with context
- **Concept B** — Uses, applications, or examples
- **Concept C** — Related information

## 🎯 Key Takeaway
[Single focused paragraph on core message and learner value]

TEXT TO SUMMARIZE:
{text[:1500]}

Generate structured summary:"""
```

#### **Implementation in `summarizer.py`:**

```python
def generate_summary_with_structure(
    self,
    text: str,
    max_length: int = 400
) -> dict:
    """Generate structured Markdown summary with sections and icons."""
    
    # Use instruction-based prompt
    prompt = f"""Create an essay-style summary with these sections:
    
1. Overview (2-3 sentences)
2. Main Ideas (3-5 key points as bullet list)
3. Key Takeaway (1 paragraph focus)

Format with markdown headers (##) and bullet points.
Keep under {max_length} words total.

Text: {text[:2000]}

Summary:"""
    
    try:
        result = self.pipeline(
            prompt,
            max_length=max_length,
            min_length=max_length // 2,
            do_sample=False,
            truncation=True
        )
        
        raw_summary = result[0]['summary_text'] if result else ""
        
        # Post-process to add structure if missing
        structured = self._apply_summary_structure(raw_summary)
        
        return {
            "summary": structured,
            "word_count": len(structured.split()),
            "confidence": 0.85
        }
    except Exception as e:
        logger.error(f"Enhanced summary failed: {e}")
        # Fallback to original method
        return self.generate_summary(text, max_length)
```

---

### 1.2 Keypoints Extraction Prompt

**Goal:** Generate comprehensive "Term — Description — Usage/Example" entries

#### **Prompt Template:**

```python
def get_enhanced_keypoints_prompt(text: str, num_points: int = 5) -> str:
    """Generate structured keypoints with term-definition-usage format."""
    return f"""Extract {num_points} important keypoints as a comprehensive reviewer.

FORMATTING REQUIREMENTS:
- Format each as: **Term:** Definition. Usage/Example.
- Include relevant emoji prefix (📖 💡 🔍 ⚡ 🎓)
- Keep each entry to 2-3 sentences maximum
- Focus on core concepts, definitions, and practical applications

STRUCTURE PER KEYPOINT:
- **[Term/Concept]:**
  - 📖 Definition: [Clear, factual definition]
  - 💡 Use: [Application, importance, or example]

TEXT TO ANALYZE:
{text[:2000]}

Extract {num_points} keypoints:"""
```

#### **Enhanced Implementation:**

```python
def extract_keypoints_structured(
    self,
    text: str,
    num_points: int = 5
) -> dict:
    """Extract keypoints with Term — Definition — Usage structure."""
    
    prompt = f"""Extract the {num_points} most important concepts from this text.
    
For EACH concept, provide:
1. Term/concept name (2-5 words)
2. Clear definition (1 sentence)
3. Use, importance, or example (1 sentence)

Format as: "Term - Definition. Usage."

Text: {text[:2500]}

Keypoints:"""
    
    try:
        result = self.pipeline(
            prompt,
            max_length=150 * num_points,
            do_sample=False,
            truncation=True
        )
        
        raw_keypoints = result[0]['summary_text'] if result else ""
        
        # Parse and structure keypoints
        keypoints = self._parse_keypoints_with_structure(raw_keypoints, num_points)
        
        # Apply Markdown formatting with icons
        formatted = self._format_keypoints_with_icons(keypoints)
        
        return {
            "keypoints": formatted,
            "count": len(formatted),
            "confidence": 0.85
        }
    except Exception as e:
        logger.error(f"Structured keypoints failed: {e}")
        return self.extract_keypoints(text, num_points)
```

---

### 1.3 Quiz Generation Prompt

**Current:** Basic question generation with semantic distractors  
**Enhanced:** Difficulty-aware prompts with engaging formatting

#### **Prompt Templates by Difficulty:**

```python
QUIZ_DIFFICULTY_PROMPTS = {
    "easy": {
        "mc": "Generate a simple recall question testing basic knowledge: {sentence}",
        "tf": "Create a straightforward true/false statement about: {sentence}",
        "sa": "Ask for a simple definition or fact from: {sentence}"
    },
    "normal": {
        "mc": "Generate an application question requiring understanding: {sentence}",
        "tf": "Create a moderately complex true/false requiring comprehension: {sentence}",
        "sa": "Ask for explanation or application of: {sentence}"
    },
    "hard": {
        "mc": "Generate a complex analytical question requiring synthesis: {sentence}",
        "tf": "Create a nuanced true/false testing critical thinking: {sentence}",
        "sa": "Ask for analysis, evaluation, or comparison involving: {sentence}"
    }
}

def get_quiz_prompt(sentence: str, difficulty: str, q_type: str) -> str:
    """Get difficulty and type-specific quiz prompt."""
    type_key = {"multiple-choice": "mc", "true-false": "tf", "short-answer": "sa"}[q_type]
    base_prompt = QUIZ_DIFFICULTY_PROMPTS[difficulty][type_key]
    
    return base_prompt.format(sentence=sentence[:250])
```

#### **Enhanced Question Structure:**

```python
class EnhancedQuizQuestion:
    """Quiz question with metadata for frontend rendering."""
    
    def to_dict(self) -> dict:
        return {
            "question": self.question,
            "options": self.options,
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "type": self.question_type,
            "difficulty": self.difficulty,
            "points": self._calculate_points(),
            "time_estimate": self._estimate_time(),
            "tags": self._extract_tags()
        }
    
    def _calculate_points(self) -> int:
        """Points based on difficulty and type."""
        base_points = {
            "easy": 1,
            "normal": 2,
            "hard": 3
        }[self.difficulty]
        
        type_multiplier = {
            "multiple-choice": 1.0,
            "true-false": 0.5,
            "short-answer": 1.5
        }[self.question_type]
        
        return int(base_points * type_multiplier)
    
    def _estimate_time(self) -> int:
        """Estimated seconds to answer."""
        base_time = {
            "easy": 30,
            "normal": 60,
            "hard": 120
        }[self.difficulty]
        
        type_adjustment = {
            "multiple-choice": 1.0,
            "true-false": 0.5,
            "short-answer": 2.0
        }[self.question_type]
        
        return int(base_time * type_adjustment)
```

---

### 1.4 Flashcard Generation Prompt

**Current:** Enhanced with structure analysis (already excellent!)  
**Additional Enhancement:** Visual categorization

#### **Flashcard Type Icons:**

```python
FLASHCARD_ICONS = {
    "definition": "📖",  # Dictionary/definition
    "heading": "📌",      # Section/topic
    "list": "📋",         # Checklist/items
    "sentence": "💡",     # Key insight
    "example": "🔍",      # Case study
    "formula": "🧮",      # Mathematical
    "process": "⚙️",      # Workflow/steps
    "comparison": "⚖️",   # Contrast/compare
    "fallback": "📝"      # Generic
}

def format_flashcard_with_icon(flashcard: dict) -> dict:
    """Add visual icon based on flashcard type."""
    card_type = flashcard.get('type', 'fallback')
    icon = FLASHCARD_ICONS.get(card_type, "📝")
    
    return {
        "front": f"{icon} {flashcard['front']}",
        "back": flashcard['back'],
        "confidence": flashcard['confidence'],
        "source_section": flashcard.get('source_section'),
        "importance_score": flashcard.get('importance_score'),
        "icon": icon,
        "category": card_type
    }
```

---

## 🔧 Section 2: Post-Processing Pipeline

### 2.1 Markdown Structure Enforcement

**Purpose:** Ensure consistent Markdown structure even if AI output varies

```python
# Add to summarizer.py

class MarkdownStructureEnforcer:
    """Enforce consistent Markdown structure on AI outputs."""
    
    def __init__(self):
        self.section_icons = {
            "overview": "📘",
            "introduction": "📘",
            "main": "📂",
            "key": "🎯",
            "takeaway": "🎯",
            "conclusion": "✨",
            "summary": "💡"
        }
    
    def enforce_summary_structure(self, raw_summary: str) -> str:
        """
        Transform raw summary into structured Markdown with sections.
        
        Ensures:
        - Proper heading hierarchy
        - Section icons
        - Bullet point formatting
        - Consistent spacing
        """
        # Parse existing structure
        lines = raw_summary.split('\n')
        structured_lines = []
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                structured_lines.append("")
                continue
            
            # Check if line looks like a heading (starts with # or is short and ends with :)
            if line.startswith('#'):
                # Already a heading, ensure icon
                heading_text = line.lstrip('#').strip()
                icon = self._get_section_icon(heading_text)
                level = len(line) - len(line.lstrip('#'))
                structured_lines.append(f"{'#' * level} {icon} {heading_text}")
                current_section = heading_text.lower()
            
            elif len(line) < 50 and (line.endswith(':') or line.isupper()):
                # Convert to heading
                heading_text = line.rstrip(':').strip()
                icon = self._get_section_icon(heading_text)
                structured_lines.append(f"## {icon} {heading_text}")
                current_section = heading_text.lower()
            
            elif line.startswith(('-', '*', '•', '›')):
                # Already a bullet point, normalize
                content = line.lstrip('-*•›').strip()
                structured_lines.append(f"- {content}")
            
            elif current_section and any(word in current_section for word in ['main', 'key', 'point']):
                # In a section that should have bullets, convert to bullet
                if not line.startswith('##'):
                    structured_lines.append(f"- {line}")
            
            else:
                # Regular paragraph
                structured_lines.append(line)
        
        # Join and clean
        result = '\n'.join(structured_lines)
        
        # Ensure minimum structure if missing sections
        if '##' not in result:
            result = self._apply_default_structure(result)
        
        return result
    
    def _get_section_icon(self, heading_text: str) -> str:
        """Get appropriate icon for section heading."""
        heading_lower = heading_text.lower()
        
        for keyword, icon in self.section_icons.items():
            if keyword in heading_lower:
                return icon
        
        # Default icons based on position/content
        if any(word in heading_lower for word in ['overview', 'intro', 'about']):
            return "📘"
        elif any(word in heading_lower for word in ['main', 'key', 'important', 'core']):
            return "📂"
        elif any(word in heading_lower for word in ['takeaway', 'conclusion', 'summary', 'final']):
            return "🎯"
        else:
            return "💡"
    
    def _apply_default_structure(self, content: str) -> str:
        """Apply default 3-section structure to unstructured content."""
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        if len(paragraphs) < 3:
            # Too short, return as-is with single heading
            return f"## 📘 Summary\n\n{content}"
        
        # Split into thirds
        third = len(paragraphs) // 3
        
        overview = '\n\n'.join(paragraphs[:third])
        main = '\n'.join([f"- {p}" for p in paragraphs[third:-third]])
        takeaway = '\n\n'.join(paragraphs[-third:])
        
        return f"""## 📘 Overview
{overview}

## 📂 Main Ideas
{main}

## 🎯 Key Takeaway
{takeaway}"""
    
    def enforce_keypoints_structure(self, keypoints: list) -> list:
        """
        Ensure keypoints follow Term — Definition — Usage structure.
        
        Input: List of strings (possibly unstructured)
        Output: List of structured Markdown keypoints with icons
        """
        structured = []
        
        for i, kp in enumerate(keypoints):
            # Parse keypoint into components
            if ' - ' in kp:
                parts = kp.split(' - ', 1)
                term = parts[0].strip()
                description = parts[1].strip() if len(parts) > 1 else ""
            elif ': ' in kp:
                parts = kp.split(': ', 1)
                term = parts[0].strip()
                description = parts[1].strip() if len(parts) > 1 else ""
            else:
                # No clear structure, use first few words as term
                words = kp.split()
                term = ' '.join(words[:min(5, len(words))])
                description = ' '.join(words[5:]) if len(words) > 5 else ""
            
            # Format with structure
            icon_cycle = ["📖", "💡", "🔍", "⚡", "🎓"]
            icon = icon_cycle[i % len(icon_cycle)]
            
            # Try to split description into definition and usage
            sentences = [s.strip() for s in description.split('.') if s.strip()]
            
            if len(sentences) >= 2:
                definition = sentences[0] + '.'
                usage = ' '.join(sentences[1:])
                formatted = f"""- **{term}:**
  - {icon} **Definition:** {definition}
  - 💡 **Use:** {usage}"""
            else:
                formatted = f"- **{term}:** {description}"
            
            structured.append(formatted)
        
        return structured
```

---

### 2.2 Icon and Emoji Enhancement

**Purpose:** Add contextual visual markers automatically

```python
# Add to utils/markdown_formatter.py

class VisualEnhancer:
    """Add contextual icons and emojis to enhance visual engagement."""
    
    # Content-based icon mapping
    CONTENT_ICONS = {
        # Academic/Educational
        r'\b(definition|define|means|refers to)\b': '📖',
        r'\b(example|instance|case|illustration)\b': '🔍',
        r'\b(important|key|critical|essential)\b': '⭐',
        r'\b(note|remember|keep in mind)\b': '📌',
        r'\b(formula|equation|calculation)\b': '🧮',
        r'\b(process|procedure|steps|method)\b': '⚙️',
        r'\b(benefit|advantage|pro)\b': '✅',
        r'\b(limitation|drawback|con|issue)\b': '⚠️',
        r'\b(comparison|versus|vs|contrast)\b': '⚖️',
        r'\b(question|quiz|test)\b': '❓',
        r'\b(answer|solution|result)\b': '✔️',
        r'\b(concept|idea|theory)\b': '💡',
        r'\b(fact|truth|reality)\b': '📋',
        r'\b(application|use|usage|apply)\b': '🔧',
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
        import re
        
        if mode == 'subtle':
            # Only enhance section headings
            lines = text.split('\n')
            enhanced = []
            
            for line in lines:
                if line.startswith('##'):
                    # Add icon to headings if not present
                    if not any(emoji in line for emoji in ['📘', '📂', '🎯', '💡', '✨']):
                        # Detect content type
                        icon = self._detect_heading_icon(line)
                        line = line.replace('##', f'## {icon}', 1)
                enhanced.append(line)
            
            return '\n'.join(enhanced)
        
        elif mode == 'moderate':
            # Enhance headings + first occurrence of key terms
            enhanced = text
            seen_patterns = set()
            
            for pattern, icon in self.CONTENT_ICONS.items():
                match = re.search(pattern, enhanced, re.IGNORECASE)
                if match and pattern not in seen_patterns:
                    # Add icon before first occurrence
                    matched_text = match.group(0)
                    enhanced = enhanced.replace(
                        matched_text,
                        f"{icon} {matched_text}",
                        1
                    )
                    seen_patterns.add(pattern)
            
            return enhanced
        
        else:  # rich
            # Enhance all occurrences (may be too cluttered)
            enhanced = text
            
            for pattern, icon in self.CONTENT_ICONS.items():
                enhanced = re.sub(
                    f'({pattern})',
                    f'{icon} \\1',
                    enhanced,
                    count=3,  # Limit to 3 per pattern
                    flags=re.IGNORECASE
                )
            
            return enhanced
    
    def _detect_heading_icon(self, heading: str) -> str:
        """Detect appropriate icon for heading based on content."""
        import re
        
        heading_lower = heading.lower()
        
        # Check patterns
        for pattern, icon in self.CONTENT_ICONS.items():
            if re.search(pattern, heading_lower):
                return icon
        
        # Default section icons
        if any(word in heading_lower for word in ['overview', 'introduction']):
            return '📘'
        elif any(word in heading_lower for word in ['main', 'key', 'core']):
            return '📂'
        elif any(word in heading_lower for word in ['takeaway', 'conclusion', 'summary']):
            return '🎯'
        else:
            return '💡'
```

---

### 2.3 Quality Validation Layer

**Purpose:** Ensure AI output meets minimum quality standards

```python
# Add to utils/quality_validator.py

class AIContentValidator:
    """Validate and enforce quality standards on AI-generated content."""
    
    def __init__(self):
        self.min_summary_words = 50
        self.max_summary_words = 800
        self.min_keypoints = 3
        self.min_quiz_questions = 3
        self.min_flashcards = 5
    
    def validate_summary(self, summary_data: dict) -> tuple[bool, str]:
        """
        Validate summary quality and structure.
        
        Returns:
            (is_valid, error_message)
        """
        summary = summary_data.get('summary', '')
        word_count = summary_data.get('word_count', 0)
        
        # Check word count
        if word_count < self.min_summary_words:
            return False, f"Summary too short ({word_count} words, minimum {self.min_summary_words})"
        
        if word_count > self.max_summary_words:
            return False, f"Summary too long ({word_count} words, maximum {self.max_summary_words})"
        
        # Check for minimum structure
        if '##' not in summary and len(summary.split('\n\n')) < 2:
            return False, "Summary lacks structure (no sections or paragraphs)"
        
        # Check for actual content
        if summary.strip() in ['', 'Summary not available', 'No content']:
            return False, "Summary contains no actual content"
        
        return True, ""
    
    def validate_keypoints(self, keypoints_data: dict) -> tuple[bool, str]:
        """Validate keypoints quality and count."""
        keypoints = keypoints_data.get('keypoints', [])
        
        if len(keypoints) < self.min_keypoints:
            return False, f"Too few keypoints ({len(keypoints)}, minimum {self.min_keypoints})"
        
        # Check each keypoint has substance
        for i, kp in enumerate(keypoints):
            if len(kp.split()) < 5:
                return False, f"Keypoint {i+1} too short (less than 5 words)"
        
        return True, ""
    
    def validate_quiz(self, quiz_data: dict) -> tuple[bool, str]:
        """Validate quiz questions quality."""
        questions = quiz_data.get('questions', [])
        
        if len(questions) < self.min_quiz_questions:
            return False, f"Too few questions ({len(questions)}, minimum {self.min_quiz_questions})"
        
        # Check each question
        for i, q in enumerate(questions):
            # Must have question text
            if not q.get('question'):
                return False, f"Question {i+1} missing question text"
            
            # Multiple choice must have 2+ options
            if q.get('type') == 'multiple-choice':
                if len(q.get('options', [])) < 2:
                    return False, f"Question {i+1} has insufficient options"
            
            # Must have correct answer
            if not q.get('correct_answer'):
                return False, f"Question {i+1} missing correct answer"
        
        return True, ""
    
    def validate_flashcards(self, flashcards_data: dict) -> tuple[bool, str]:
        """Validate flashcards quality."""
        flashcards = flashcards_data.get('flashcards', [])
        
        if len(flashcards) < self.min_flashcards:
            return False, f"Too few flashcards ({len(flashcards)}, minimum {self.min_flashcards})"
        
        # Check each flashcard
        for i, card in enumerate(flashcards):
            if not card.get('front') or not card.get('back'):
                return False, f"Flashcard {i+1} missing front or back"
            
            if len(card['front'].split()) < 3 or len(card['back'].split()) < 5:
                return False, f"Flashcard {i+1} content too short"
        
        return True, ""
```

---

## 💻 Section 3: Frontend Rendering Tips

### 3.1 Markdown to Visual Cards Component

**React Component for Rendering Structured Content**

```typescript
// src/components/StudyContent/MarkdownRenderer.tsx

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  type: 'summary' | 'keypoints' | 'quiz' | 'flashcards';
}

export function MarkdownRenderer({ content, type }: MarkdownRendererProps) {
  // Parse sections from Markdown
  const sections = parseMarkdownSections(content);
  
  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <MarkdownSection
          key={index}
          section={section}
          type={type}
          index={index}
        />
      ))}
    </div>
  );
}

function MarkdownSection({ section, type, index }) {
  const [isOpen, setIsOpen] = React.useState(index === 0); // First section open
  
  // Extract icon from heading (e.g., "📘 Overview")
  const { icon, title } = extractIconAndTitle(section.heading);
  
  return (
    <Card className="border-l-4 border-l-primary">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <span>{title}</span>
            </CardTitle>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom renderers for enhanced display
                ul: ({ children }) => (
                  <ul className="space-y-2 ml-4">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="flex-1">{children}</span>
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="text-primary font-semibold">
                    {children}
                  </strong>
                ),
                p: ({ children }) => (
                  <p className="text-muted-foreground leading-relaxed">
                    {children}
                  </p>
                ),
              }}
            >
              {section.content}
            </ReactMarkdown>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function parseMarkdownSections(content: string) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  
  for (const line of lines) {
    if (line.startsWith('##')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: line.replace(/^##\s*/, ''),
        content: '',
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

function extractIconAndTitle(heading: string) {
  // Extract emoji/icon from heading
  const emojiMatch = heading.match(/^([\u{1F300}-\u{1F9FF}])\s*(.+)$/u);
  
  if (emojiMatch) {
    return {
      icon: emojiMatch[1],
      title: emojiMatch[2],
    };
  }
  
  return {
    icon: '📄',
    title: heading,
  };
}
```

---

### 3.2 Keypoints Visual Renderer

```typescript
// src/components/StudyContent/KeypointsView.tsx

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface KeypointData {
  term: string;
  definition: string;
  usage: string;
  icon: string;
}

export function KeypointsView({ keypoints }: { keypoints: string[] }) {
  const parsedKeypoints = keypoints.map(parseKeypoint);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {parsedKeypoints.map((kp, index) => (
        <KeypointCard key={index} keypoint={kp} index={index} />
      ))}
    </div>
  );
}

function KeypointCard({ keypoint, index }) {
  const bgColors = [
    'bg-blue-50 dark:bg-blue-950',
    'bg-purple-50 dark:bg-purple-950',
    'bg-green-50 dark:bg-green-950',
    'bg-amber-50 dark:bg-amber-950',
  ];
  
  const borderColors = [
    'border-blue-200 dark:border-blue-800',
    'border-purple-200 dark:border-purple-800',
    'border-green-200 dark:border-green-800',
    'border-amber-200 dark:border-amber-800',
  ];
  
  return (
    <Card
      className={`${bgColors[index % 4]} ${borderColors[index % 4]} border-2`}
    >
      <div className="p-4 space-y-3">
        {/* Term with icon */}
        <div className="flex items-center gap-2">
          <span className="text-3xl">{keypoint.icon}</span>
          <h3 className="text-lg font-bold">{keypoint.term}</h3>
        </div>
        
        {/* Definition */}
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="mt-0.5">📖 Def</Badge>
          <p className="text-sm text-muted-foreground flex-1">
            {keypoint.definition}
          </p>
        </div>
        
        {/* Usage/Application */}
        {keypoint.usage && (
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">💡 Use</Badge>
            <p className="text-sm text-muted-foreground flex-1">
              {keypoint.usage}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function parseKeypoint(keypointText: string): KeypointData {
  // Parse "**Term:** - 📖 Definition: ... - 💡 Use: ..." format
  
  // Extract term
  const termMatch = keypointText.match(/\*\*(.+?)\*\*/);
  const term = termMatch ? termMatch[1] : 'Concept';
  
  // Extract definition
  const defMatch = keypointText.match(/📖.*?Definition:\s*(.+?)(?:\n|💡|$)/s);
  const definition = defMatch ? defMatch[1].trim() : '';
  
  // Extract usage
  const useMatch = keypointText.match(/💡.*?Use:\s*(.+?)$/s);
  const usage = useMatch ? useMatch[1].trim() : '';
  
  // Extract icon (or assign default)
  const iconMatch = keypointText.match(/^-\s*([\u{1F300}-\u{1F9FF}])/u);
  const icon = iconMatch ? iconMatch[1] : ['📖', '💡', '🔍', '⚡'][Math.floor(Math.random() * 4)];
  
  return { term, definition, usage, icon };
}
```

---

### 3.3 Quiz Renderer with Visual Feedback

```typescript
// src/components/StudyContent/QuizView.tsx

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export function QuizView({ questions, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  
  const handleSubmit = () => {
    setShowResults(true);
    onSubmit(answers);
  };
  
  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <QuizHeader questions={questions} />
      
      {/* Questions */}
      {questions.map((q, index) => (
        <QuizQuestion
          key={index}
          question={q}
          index={index}
          answer={answers[index]}
          showResult={showResults}
          onAnswer={(answer) => setAnswers({ ...answers, [index]: answer })}
        />
      ))}
      
      {/* Submit Button */}
      {!showResults && (
        <Button onClick={handleSubmit} className="w-full" size="lg">
          Submit Quiz
        </Button>
      )}
      
      {/* Results Summary */}
      {showResults && <QuizResults questions={questions} answers={answers} />}
    </div>
  );
}

function QuizHeader({ questions }) {
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
  const totalTime = questions.reduce((sum, q) => sum + (q.time_estimate || 60), 0);
  
  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">📝 Quiz</h2>
            <p className="text-muted-foreground">
              {questions.length} questions • {totalPoints} points
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>~{Math.ceil(totalTime / 60)} min</span>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function QuizQuestion({ question, index, answer, showResult, onAnswer }) {
  const isCorrect = showResult && answer === question.correct_answer;
  const isIncorrect = showResult && answer && answer !== question.correct_answer;
  
  // Difficulty badge color
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  
  return (
    <Card className={`
      ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
      ${isIncorrect ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''}
    `}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Q{index + 1}</Badge>
              <Badge className={difficultyColors[question.difficulty]}>
                {question.difficulty}
              </Badge>
              <Badge variant="secondary">{question.points} pts</Badge>
            </div>
            <h3 className="text-lg font-medium">{question.question}</h3>
          </div>
          
          {showResult && (
            <div>
              {isCorrect && <CheckCircle className="h-6 w-6 text-green-500" />}
              {isIncorrect && <XCircle className="h-6 w-6 text-red-500" />}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {question.type === 'multiple-choice' && (
          <MultipleChoiceOptions
            options={question.options}
            selected={answer}
            correctAnswer={question.correct_answer}
            showResult={showResult}
            onSelect={onAnswer}
          />
        )}
        
        {question.type === 'true-false' && (
          <TrueFalseOptions
            selected={answer}
            correctAnswer={question.correct_answer}
            showResult={showResult}
            onSelect={onAnswer}
          />
        )}
        
        {question.type === 'short-answer' && (
          <ShortAnswerInput
            value={answer}
            onChange={onAnswer}
            disabled={showResult}
          />
        )}
        
        {/* Explanation (shown after submission) */}
        {showResult && question.explanation && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>💡 Explanation:</strong> {question.explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MultipleChoiceOptions({ options, selected, correctAnswer, showResult, onSelect }) {
  return (
    <div className="space-y-2">
      {options.map((option, i) => {
        const isSelected = selected === option;
        const isCorrect = option === correctAnswer;
        
        let bgClass = 'bg-background hover:bg-muted';
        let borderClass = 'border-border';
        
        if (showResult) {
          if (isCorrect) {
            bgClass = 'bg-green-100 dark:bg-green-950';
            borderClass = 'border-green-500';
          } else if (isSelected && !isCorrect) {
            bgClass = 'bg-red-100 dark:bg-red-950';
            borderClass = 'border-red-500';
          }
        } else if (isSelected) {
          bgClass = 'bg-primary/10';
          borderClass = 'border-primary';
        }
        
        return (
          <button
            key={i}
            onClick={() => !showResult && onSelect(option)}
            disabled={showResult}
            className={`
              w-full text-left p-3 rounded-lg border-2 transition-all
              ${bgClass} ${borderClass}
              ${!showResult ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center
                ${isSelected ? 'bg-primary border-primary' : 'border-border'}
              `}>
                {isSelected && <div className="w-3 h-3 rounded-full bg-white" />}
              </div>
              <span>{option}</span>
              {showResult && isCorrect && <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

---

## 🔄 Section 4: Backend API Integration & One-Time Generation

### 4.1 One-Time Generation Flow

```typescript
// Backend pseudocode (PHP controller logic)

class StudyToolsController {
  
  public function generateContent(Request $request, string $materialId, string $type): Response {
    // 1. Check if AI content already exists
    $existing = $this->aiVersionRepo->getLatestVersion($materialId, $type);
    
    if ($existing && !$request->get('force_regenerate')) {
      // Return cached result
      return JsonResponder::success([
        'content' => $existing->content,
        'generated_at' => $existing->created_at,
        'cached' => true
      ]);
    }
    
    // 2. Get material text content
    $material = $this->materialRepo->getById($materialId);
    $textContent = $this->extractText($material);
    
    // 3. Call AI service with enhanced prompts
    $aiResponse = $this->aiService->generate($type, [
      'text' => $textContent,
      'options' => $this->getGenerationOptions($type, $request)
    ]);
    
    // 4. Post-process AI output
    $processed = $this->postProcessContent($aiResponse, $type);
    
    // 5. Validate quality
    $validation = $this->validator->validate($processed, $type);
    
    if (!$validation->isValid) {
      // Log and retry with fallback
      logger->warning("AI content failed validation: " . $validation->error);
      $processed = $this->generateFallbackContent($textContent, $type);
    }
    
    // 6. Store in database (one-time save)
    $version = $this->aiVersionRepo->create([
      'material_id' => $materialId,
      'type' => $type,
      'content' => $processed->content,
      'metadata' => json_encode($processed->metadata),
      'version' => $this->aiVersionRepo->getNextVersion($materialId, $type)
    ]);
    
    // 7. Return structured response
    return JsonResponder::success([
      'content' => $version->content,
      'generated_at' => $version->created_at,
      'cached' => false,
      'metadata' => $processed->metadata
    ]);
  }
  
  private function postProcessContent($aiResponse, string $type) {
    $processor = $this->getProcessor($type);
    
    switch ($type) {
      case 'summary':
        return $processor->enforceSummaryStructure($aiResponse);
      
      case 'keypoints':
        return $processor->enforceKeypointsStructure($aiResponse);
      
      case 'quiz':
        return $processor->enhanceQuizQuestions($aiResponse);
      
      case 'flashcards':
        return $processor->addFlashcardIcons($aiResponse);
      
      default:
        return $aiResponse;
    }
  }
}
```

---

### 4.2 Frontend Cache Strategy

```typescript
// src/hooks/useStudyContent.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useStudyContent(materialId: string, contentType: 'summary' | 'keypoints' | 'quiz' | 'flashcards') {
  const queryClient = useQueryClient();
  
  // Fetch content (cached by React Query)
  const { data, isLoading, error } = useQuery({
    queryKey: ['study-content', materialId, contentType],
    queryFn: () => fetchStudyContent(materialId, contentType),
    staleTime: Infinity, // Content never goes stale (generated once)
    cacheTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });
  
  // Force regeneration mutation
  const regenerate = useMutation({
    mutationFn: () => fetchStudyContent(materialId, contentType, { forceRegenerate: true }),
    onSuccess: (newData) => {
      queryClient.setQueryData(['study-content', materialId, contentType], newData);
    },
  });
  
  return {
    content: data?.content,
    metadata: data?.metadata,
    isCached: data?.cached,
    generatedAt: data?.generated_at,
    isLoading,
    error,
    regenerate: regenerate.mutate,
    isRegenerating: regenerate.isPending,
  };
}

async function fetchStudyContent(
  materialId: string,
  type: string,
  options = {}
) {
  const params = new URLSearchParams();
  if (options.forceRegenerate) {
    params.append('force_regenerate', 'true');
  }
  
  const response = await fetch(
    `/api/materials/${materialId}/study-tools/${type}?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${type}`);
  }
  
  return response.json();
}
```

---

## 🚀 Section 5: Gradual Model Upgrades & Future Enhancements

### 5.1 Model Upgrade Path

**Current:** BART (summarization), T5-base (Q&A), all-MiniLM-L6-v2 (embeddings)

**Recommended Progression:**

1. **Short-term (3-6 months):**
   - Upgrade to `facebook/bart-large-cnn` → `facebook/bart-large-xsum` (better abstractive summaries)
   - Upgrade to `t5-base` → `google/flan-t5-large` (better instruction following)
   - Keep embeddings (sufficient for current needs)

2. **Medium-term (6-12 months):**
   - Consider `google/pegasus-xsum` for longer document summaries
   - Try `valhalla/t5-base-qg-hl` specifically for question generation
   - Upgrade embeddings to `sentence-transformers/all-mpnet-base-v2` (better quality)

3. **Long-term (12+ months):**
   - Experiment with `meta-llama/Llama-3.1-8B` for unified generation (requires GPU)
   - Implement retrieval-augmented generation (RAG) for very long documents
   - Add multimodal support for image/diagram understanding

---

### 5.2 Multimodal Augmentation

**Future Enhancement: Process Documents with Images/Diagrams**

```python
# Future: Add to extraction.py

from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image

class MultimodalExtractor:
    """Extract text AND visual information from documents."""
    
    def __init__(self):
        self.blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        self.blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
    
    async def extract_with_images(self, file_path: str) -> dict:
        """Extract text and image descriptions."""
        
        # Extract text (existing)
        text_content = await extract_text_from_file(file_path)
        
        # Extract images
        images = self._extract_images_from_pdf(file_path)
        
        # Generate captions for images
        image_descriptions = []
        for img in images:
            caption = self._generate_image_caption(img)
            image_descriptions.append({
                'page': img['page'],
                'caption': caption,
                'context': img['surrounding_text']
            })
        
        # Combine text + image context
        enriched_text = self._merge_text_and_images(text_content, image_descriptions)
        
        return {
            'text': enriched_text,
            'images': image_descriptions,
            'has_visuals': len(image_descriptions) > 0
        }
    
    def _generate_image_caption(self, image: Image) -> str:
        """Generate natural language description of image."""
        inputs = self.blip_processor(image, return_tensors="pt")
        output = self.blip_model.generate(**inputs)
        caption = self.blip_processor.decode(output[0], skip_special_tokens=True)
        return caption
```

---

## 📊 Section 6: Testing & Quality Metrics

### 6.1 Content Quality Metrics

```python
# Add to utils/metrics.py

class ContentQualityMetrics:
    """Track quality metrics for AI-generated content."""
    
    def calculate_summary_metrics(self, original_text: str, summary: str) -> dict:
        """
        Calculate quality metrics for summary.
        
        Returns:
            - compression_ratio: How much text was reduced
            - coverage_score: How much of original is represented
            - structure_score: Quality of Markdown structure
            - readability: Flesch reading ease score
        """
        compression_ratio = len(summary.split()) / len(original_text.split())
        
        coverage_score = self._calculate_coverage(original_text, summary)
        
        structure_score = self._calculate_structure_score(summary)
        
        readability = self._calculate_readability(summary)
        
        return {
            'compression_ratio': round(compression_ratio, 2),
            'coverage_score': round(coverage_score, 2),
            'structure_score': round(structure_score, 2),
            'readability': round(readability, 2),
            'overall_quality': round((coverage_score + structure_score + min(readability/100, 1)) / 3, 2)
        }
    
    def _calculate_coverage(self, original: str, summary: str) -> float:
        """Calculate what % of key concepts are covered."""
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        
        vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        vectors = vectorizer.fit_transform([original, summary])
        
        similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
        return float(similarity)
    
    def _calculate_structure_score(self, text: str) -> float:
        """Score based on Markdown structure quality."""
        score = 0.0
        
        # Has headings
        if '##' in text:
            score += 0.3
        
        # Has bullet points
        if '\n- ' in text or '\n* ' in text:
            score += 0.3
        
        # Has multiple paragraphs
        if text.count('\n\n') >= 2:
            score += 0.2
        
        # Has emojis/icons
        import re
        if re.search(r'[\u{1F300}-\u{1F9FF}]', text, re.UNICODE):
            score += 0.2
        
        return min(score, 1.0)
    
    def _calculate_readability(self, text: str) -> float:
        """Flesch Reading Ease score (0-100, higher = easier)."""
        import textstat
        
        try:
            return textstat.flesch_reading_ease(text)
        except:
            return 50.0  # Default moderate difficulty
```

---

## 📝 Summary & Implementation Checklist

### ✅ **Immediate Actions (Week 1-2)**

1. **Add Enhanced Prompts:**
   - [ ] Update `summarizer.py` with structured summary prompts
   - [ ] Update `summarizer.py` with Term-Definition-Usage keypoint prompts
   - [ ] Already done: Quiz difficulty prompts ✓

2. **Implement Post-Processing:**
   - [ ] Create `MarkdownStructureEnforcer` class
   - [ ] Create `VisualEnhancer` class for icon injection
   - [ ] Create `AIContentValidator` for quality checks

3. **Update Database Schema (if needed):**
   - [ ] Ensure `material_ai_versions.metadata` can store JSON
   - [ ] Add index on `(material_id, type, version)` for fast lookups

### 🎨 **Frontend Updates (Week 2-3)**

4. **Create Visual Components:**
   - [ ] `MarkdownRenderer.tsx` with collapsible sections
   - [ ] `KeypointsView.tsx` with colored cards
   - [ ] `QuizView.tsx` with visual feedback
   - [ ] `FlashcardsView.tsx` with flip animations

5. **Add Caching Strategy:**
   - [ ] Implement `useStudyContent` hook with React Query
   - [ ] Add "Regenerate" button with confirmation dialog
   - [ ] Show cache status ("Generated 2 days ago")

### 🧪 **Testing & Validation (Week 3-4)**

6. **Quality Assurance:**
   - [ ] Test with diverse documents (short, long, technical, general)
   - [ ] Validate Markdown structure consistency
   - [ ] Measure content quality metrics
   - [ ] User testing for visual engagement

7. **Performance Optimization:**
   - [ ] Profile AI generation times
   - [ ] Implement request queuing if needed
   - [ ] Add progress indicators for long generations

### 🚀 **Future Enhancements (Month 2+)**

8. **Model Upgrades:**
   - [ ] Evaluate FLAN-T5-large for better instruction following
   - [ ] Test PEGASUS for long document summaries
   - [ ] Benchmark quality improvements

9. **Advanced Features:**
   - [ ] Multimodal support (images/diagrams)
   - [ ] Custom user preferences for structure
   - [ ] A/B testing different prompt templates
   - [ ] Analytics dashboard for content quality

---

## 🎓 Key Principles for Success

1. **Consistency:** All content types follow similar Markdown structure patterns
2. **Visual Hierarchy:** Icons and headings guide learner attention
3. **Quality First:** Validate before storing, fallback if needed
4. **Efficient Reuse:** Generate once, cache forever (unless regenerated)
5. **User Control:** Allow regeneration with clear feedback
6. **Iterative Improvement:** Track metrics, gather feedback, refine prompts

---

## 📚 Additional Resources

- **Markdown Guide:** https://www.markdownguide.org/
- **Emoji Cheat Sheet:** https://github.com/ikatyang/emoji-cheat-sheet
- **React Markdown:** https://remarkjs.github.io/react-markdown/
- **Hugging Face Model Hub:** https://huggingface.co/models
- **TF-IDF Tutorial:** https://scikit-learn.org/stable/modules/feature_extraction.html#tfidf-term-weighting

---

**End of Guide**

*This guide provides the foundation for transforming StudyStreak's AI content into visually engaging, structured learning materials. Implement gradually, test thoroughly, and iterate based on user feedback.*
