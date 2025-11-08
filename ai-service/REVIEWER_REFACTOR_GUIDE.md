# Reviewer Generation Pipeline — Refactor Guide

## 🎯 Overview

This document describes the **enhanced reviewer generation pipeline** that produces student-friendly, domain-adaptive study materials from any uploaded content.

### Key Improvements

✅ **Automatic Concept Detection & Separation**
- Detects and splits merged concepts (e.g., "Data and Information" → two entries)
- Identifies comparisons (X vs Y), type lists, definitions, processes
- Domain-agnostic: works for law, medicine, CS, business, etc.

✅ **Structured Formatting Templates**
- Concept/definition/example blocks
- Comparison (A vs B) templates
- Type list formatting
- Process/procedure templates

✅ **Enhanced Quality Validation**
- 0-10 scoring on Accuracy, Clarity, Separation, Structure
- Automatic flagging if score < 7.0
- Actionable recommendations

✅ **Semantic Clustering (Optional)**
- Uses sentence-transformers for topic grouping
- Falls back to heuristic grouping if disabled

---

## 📁 New Modules

### `utils/concept_detector.py`
**Purpose:** Detect and separate concepts from text

**Key Classes:**
- `ConceptDetector`: Main detection engine
- `Concept`: Dataclass representing a detected concept
- `ConceptType`: Enum for concept types (DEFINITION, COMPARISON, TYPE_LIST, etc.)

**Usage:**
```python
from utils.concept_detector import ConceptDetector

detector = ConceptDetector()
concepts = detector.detect_concepts("Data and Information: Raw facts vs processed facts")
# Returns: [Concept(term="Data", ...), Concept(term="Information", ...)]
```

**Features:**
- Automatic splitting of merged terms using coordinating conjunctions
- Pattern matching for comparisons (X vs Y, X versus Y, etc.)
- Type list detection (Types of X: A, B, C)
- Definition extraction (X is/means/refers to Y)

---

### `utils/structured_formatter.py`
**Purpose:** Format concepts using domain-adaptive templates

**Key Classes:**
- `StructuredFormatter`: Applies formatting templates
- `ReviewerDocumentBuilder`: Builds complete documents

**Templates:**

#### Definition Template
```markdown
🧩 **Concept**
- 📖 **Definition:** ...
- 💡 **Example:** ... (if provided)
```

#### Comparison Template
```markdown
⚖️ **Concept A vs Concept B**
- **Concept A:** ...
- **Concept B:** ...
- 🧩 **Note:** [Key difference]
```

#### Type List Template
```markdown
📚 **Types of Concept**
- Type A: ...
- Type B: ...
```

**Usage:**
```python
from utils.structured_formatter import format_definition, format_comparison

formatted = format_definition("Database", "A structured collection of data", "MySQL, MongoDB")
```

---

### `utils/enhanced_quality_validator.py`
**Purpose:** Validate reviewer quality with detailed scoring

**Metrics (0-10 scale):**
- **Accuracy**: Are definitions correct and factual?
- **Clarity**: Are they concise and readable?
- **Separation**: Are concepts distinct, not merged?
- **Structure**: Is formatting correct and consistent?

**Usage:**
```python
from utils.enhanced_quality_validator import validate_reviewer_quality

metrics = validate_reviewer_quality(reviewer_data)
print(f"Overall: {metrics['overall']}/10")
print(f"Acceptable: {metrics['is_acceptable']}")
print(f"Issues: {metrics['issues']}")
```

**Scoring Logic:**

| Metric | Checks |
|--------|--------|
| **Accuracy** | Generic phrases, incomplete definitions, placeholders |
| **Clarity** | Average length (sweet spot: 10-30 words), OCR residue, long sentences (>50 words) |
| **Separation** | Merged concepts (e.g., "X and Y"), duplicate terms, case-insensitive uniqueness |
| **Structure** | Headings (≥2), lists (≥3 items), icons/emojis, consistent formatting |

**Threshold:** Overall score must be ≥ 7.0 and all individual metrics ≥ 6.0 for acceptance.

---

## 🔄 Workflow

### 1. Text Extraction
```
PDF → pypdf or Tesseract OCR → raw text
```

### 2. Cleaning
```
raw text → clean_text() → normalized text (OCR noise removed)
```

### 3. Concept Detection
```
normalized text → ConceptDetector → List[Concept]
- Detects: definitions, comparisons, type lists, merged concepts
- Separates: "Data and Information" → ["Data", "Information"]
```

### 4. Formatting
```
List[Concept] → StructuredFormatter → Markdown/JSON
- Applies templates based on concept type
- Adds domain-appropriate icons
```

### 5. Clustering (Optional)
```
List[Concept] → TopicClusterer → Grouped topics
- Uses sentence-transformers embeddings
- Agglomerative clustering
- Generates cluster labels
```

### 6. Quality Validation
```
Reviewer → EnhancedQualityValidator → QualityMetrics
- Scores: accuracy, clarity, separation, structure
- Flags issues and provides recommendations
```

---

## 🚀 API Usage

### Basic Reviewer Generation
```bash
GET /generate/reviewer?material_url=https://...&material_id=abc123
```

### With Semantic Clustering
```bash
GET /generate/reviewer?material_url=https://...&use_semantic_clustering=true
```

**Response:**
```json
{
  "materialId": "abc123",
  "topics": [
    {
      "title": "Definitions",
      "icon": "📖",
      "keypoints": [
        "🧩 **Data**\n- 📖 Raw facts without meaning",
        "🧩 **Information**\n- 📖 Processed data with context"
      ]
    },
    {
      "title": "Comparisons",
      "icon": "⚖️",
      "keypoints": [
        "⚖️ **Data vs Information**\n- **Data:** Raw facts\n- **Information:** Processed facts"
      ]
    }
  ],
  "cleaned_word_count": 1523,
  "pages": 4,
  "extraction_method": "enhanced-concept-detection",
  "warnings": [],
  "generatedAt": "2025-11-08T12:34:56Z"
}
```

---

## 🧪 Testing

### Test Domain-Agnostic Detection
```python
# Medicine
text = "Hypertension and Hypotension: High blood pressure vs low blood pressure"
concepts = detector.detect_concepts(text)
# Returns: [Concept("Hypertension", ...), Concept("Hypotension", ...)]

# Law
text = "Types of Torts: Negligence, Intentional Torts, Strict Liability"
concepts = detector.detect_concepts(text)
# Returns: [Concept("Torts", subtypes=[...]), Concept("Negligence", ...), ...]

# Computer Science
text = "Array vs Linked List: Contiguous memory vs dynamic allocation"
concepts = detector.detect_concepts(text)
# Returns: Comparison concepts with A vs B structure
```

### Test Quality Validation
```python
reviewer = {
    "topics": [...],
    "documentMarkdown": "..."
}
metrics = validate_reviewer_quality(reviewer)
assert metrics['overall'] >= 7.0
assert metrics['separation'] >= 7.0  # No merged concepts
```

---

## 📊 Quality Thresholds

| Score Range | Quality Level | Action |
|-------------|---------------|--------|
| 9.0 - 10.0 | Excellent | Ship as-is |
| 7.0 - 8.9 | Good | Minor improvements recommended |
| 5.0 - 6.9 | Acceptable | Significant improvements needed |
| 0.0 - 4.9 | Poor | Regenerate or manual review required |

---

## 🔧 Configuration

### Environment Variables
```bash
# Model cache
MODEL_CACHE_DIR=/path/to/cache
HF_HOME=/path/to/huggingface
TORCH_HOME=/path/to/torch

# Clustering
USE_SEMANTIC_CLUSTERING=true  # Enable sentence-transformers
MIN_CLUSTERS=2
MAX_CLUSTERS=8

# Quality thresholds
MIN_QUALITY_SCORE=7.0
MIN_ACCURACY_SCORE=6.0
```

### Code Configuration
```python
# In config.py
CONCEPT_DETECTION_ENABLED = True
STRUCTURED_FORMATTING_ENABLED = True
QUALITY_VALIDATION_ENABLED = True

# Clustering settings
CLUSTERING_METHOD = "agglomerative"  # or "hdbscan"
SIMILARITY_THRESHOLD = 0.7
```

---

## 🧠 Models Used

| Purpose | Model | Size | Notes |
|---------|-------|------|-------|
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 | 80MB | For clustering and dedup |
| Summarization | facebook/bart-large-cnn | 1.6GB | For keypoint extraction |
| QG/Flashcards | t5-base | 850MB | For question generation |
| OCR | pytesseract + Tesseract | - | For scanned PDFs |

**Installation:**
```bash
pip install sentence-transformers transformers torch pytesseract
```

---

## 🎓 Examples by Domain

### Medicine (Anatomy)
**Input:** "The cerebral cortex and brainstem: The cortex handles higher functions while the brainstem controls vital reflexes"

**Output:**
```markdown
🧩 **Cerebral Cortex**
- 📖 Handles higher cognitive functions

🧩 **Brainstem**
- 📖 Controls vital reflexes and autonomic functions

⚖️ **Cerebral Cortex vs Brainstem**
- **Cerebral Cortex:** Higher functions
- **Brainstem:** Vital reflexes
```

### Law
**Input:** "Types of Legal Remedies: Compensatory damages, Punitive damages, Equitable relief"

**Output:**
```markdown
📚 **Types of Legal Remedies**
- Compensatory damages
- Punitive damages
- Equitable relief

🧩 **Compensatory Damages**
- 📖 A type of Legal Remedies

🧩 **Punitive Damages**
- 📖 A type of Legal Remedies
```

### Computer Science
**Input:** "Sorting algorithms: Bubble Sort, Merge Sort, Quick Sort. Quick Sort is generally faster than Bubble Sort."

**Output:**
```markdown
📚 **Types of Sorting Algorithms**
- Bubble Sort
- Merge Sort
- Quick Sort

⚖️ **Quick Sort vs Bubble Sort**
- **Quick Sort:** Generally faster
- **Bubble Sort:** Simpler but slower
```

---

## 📝 TODOs for Future Enhancement

- [ ] Add LLM-assisted concept splitting for complex merged terms
- [ ] Implement semantic similarity scoring for duplicate detection
- [ ] Add multi-language support (currently English-optimized)
- [ ] Integrate visual diagram extraction using CLIP
- [ ] Add support for mathematical formula detection (LaTeX)
- [ ] Implement adaptive icon selection based on content domain
- [ ] Add A/B testing framework for formatting templates

---

## 🐛 Troubleshooting

### Issue: Concepts not being split
**Solution:** Check for coordinating conjunctions in term. If "and"/"&" is part of a proper name, add to exclusion list.

### Issue: Low separation score
**Solution:** Run concept detector on full text, not just summaries. Ensure cleaning step preserves term boundaries.

### Issue: Semantic clustering fails
**Solution:** Fallback to heuristic grouping is automatic. Check sentence-transformers installation and model cache.

### Issue: Poor clarity scores
**Solution:** Increase cleaning passes. Adjust `max_chars` parameter in `clean_definition()`.

---

## 📚 References

- [Concept Detection Paper](https://example.com/concept-detection)
- [Sentence-Transformers Docs](https://www.sbert.net/)
- [BART Model Card](https://huggingface.co/facebook/bart-large-cnn)
- [T5 Model Card](https://huggingface.co/t5-base)

---

**Last Updated:** November 8, 2025  
**Version:** 2.0  
**Contributors:** AI Service Team
