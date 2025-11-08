# 🧠 StudyStreak AI Prompt & Output Design Guide

> Living document. Iteratively refined. Version: 2025-11-08.  
> Purpose: Define PERFECT target structures (Summary, Keypoints, Flashcards, Quizzes) + canonical raw JSON schema + multi-stage prompt chain for stable, high-quality reviewers.

---
## ✅ Design Principles
- Student-first: scanable, low cognitive load, **no fluff**, strong separation of concepts.
- Domain-agnostic: works equally for Medicine, Law, CS, Finance, etc.
- Deterministic stages: each pipeline stage transforms a clearly defined schema — no implicit mutation.
- Resilience to noisy OCR / mixed formatting.
- Strict schemas (JSON) early → Markdown only as final presentation layer.
- Multi-pass validation (structure → pedagogy → clarity → duplication → compression).
- Modular prompts: small single-purpose instructions composed sequentially.

---
## 🔄 High-Level Pipeline Flow
1. Raw Extraction (OCR / text / slides) → `raw_extracted_chunks[]`
2. Cleaning / Normalization → remove noise, unify spacing, fix broken sentences.
3. Concept Segmentation → atomic concept units with minimal merging.
4. Concept Typing → classify: Definition | Comparison | TypeList | Process | Example | Formula | Simple.
5. Hierarchical Grouping → cluster concepts → build sections (max 5–9 sections, 4–8 concepts each).
6. Summarization (macro) → global overview (100–180 words) + main ideas + key takeaway; no concept duplication.
7. Keypoints Enrichment → short + full definition + usage + 2–6 bullet highlights.
8. Flashcard Generation → high-yield recall units (Term → Answer) + optional distractors base.
9. Quiz Generation → MCQ (or other types) with validated correct answer + plausible distractors.
10. Quality Validation → heuristics + (optional) model re-check prompt.
11. Formatting → Markdown + JSON dual output.
12. Final Review Compression → shorten overly verbose items while retaining semantics.

---
## 📦 Canonical Raw JSON Schema (Post-Cleaning, Pre-Enrichment)
```jsonc
{
  "materialId": "string",
  "sourceMeta": {
    "filename": "string", "contentType": "pdf|pptx|docx|text|image", "pageCount": 12,
    "extractionMethod": "ocr|native|hybrid", "language": "en"
  },
  "rawChunks": [
    { "id": "c1", "text": "Original noisy paragraph", "page": 1, "span": "p1:34-198" }
  ],
  "cleanedUnits": [
    {
      "id": "u1",
      "text": "Clean atomic statement about Naïve Bayes classifier" ,
      "tokens": 18,
      "origin": { "rawChunkId": "c1" }
    }
  ],
  "concepts": [
    {
      "id": "k1",
      "term": "Naïve Bayes Classifier",
      "conceptType": "DEFINITION",
      "shortDefinition": "Probabilistic classifier applying Bayes' theorem assuming feature independence.",
      "fullDefinition": "A fast probabilistic classifier that applies Bayes' theorem and assumes each feature contributes independently to class probability, useful in spam filtering and text classification.",
      "examples": ["Spam vs Ham filtering"],
      "subtypes": [],
      "relatedIds": ["k2"],
      "importance": 0.92,
      "sourceSpan": "p2:88-154"
    }
  ],
  "sections": [
    { "id": "s1", "title": "Core Algorithms", "conceptIds": ["k1", "k2"], "icon": "⚙️" }
  ],
  "summaryDraft": {
    "overview": "...",
    "mainIdeas": ["..."],
    "keyTakeaway": "..."
  },
  "flashcardsDraft": [],
  "quizDraft": [],
  "processingMeta": { "createdAt": "ISO", "pipelineVersion": "v1.0" }
}
```

---
## 🧬 Enriched Output Schema (Final Reviewer Artifact)
```jsonc
{
  "materialId": "string",
  "documentMarkdown": "# 📘 Title...",
  "summary": {
    "overview": "150-word high-level context",
    "mainIdeas": ["Bullet 1", "Bullet 2", "Bullet 3"],
    "keyTakeaway": "One concise retention statement",
    "wordCount": 160
  },
  "sections": [
    {
      "id": "s1",
      "title": "Core Algorithms",
      "icon": "⚙️",
      "concepts": [
        {
          "id": "k1",
          "term": "Naïve Bayes Classifier",
          "definition": "Short definition (<= 28 words).",
          "fullDefinition": "Expanded context (<= 70 words).",
          "bulletedHighlights": ["Used in spam filtering", "Assumes feature independence"],
          "usage": "Email classification; text categorization.",
          "importance": 0.92,
          "conceptType": "DEFINITION",
          "icon": "📖"
        }
      ]
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "front": "What assumption defines Naïve Bayes?",
      "back": "Features contribute independently to class probability (conditional independence).",
      "term": "Naïve Bayes independence assumption",
      "difficulty": 0.35,
      "importance": 0.9,
      "hint": "Think: each feature alone",
      "tags": ["ML", "Classification"],
      "type": "basic",
      "alternates": ["Conditional independence assumption"],
      "relatedConceptIds": ["k1"]
    }
  ],
  "quiz": {
    "questionCount": 6,
    "questions": [
      {
        "id": "q1",
        "type": "MCQ",
        "stem": "Which algorithm assumes feature independence?",
        "choices": [
          {"id": "a", "text": "Naïve Bayes", "isCorrect": true},
          {"id": "b", "text": "K-Means"},
          {"id": "c", "text": "SVM"},
          {"id": "d", "text": "Apriori"}
        ],
        "explanation": "Naïve Bayes applies Bayes' theorem with conditional independence assumption.",
        "difficulty": 0.3,
        "conceptIds": ["k1"],
        "distractorStrategy": "semantically_near_confusion",
        "validation": {"confidence": 0.87, "flags": []}
      }
    ]
  },
  "quality": {
    "structureScore": 0.92,
    "clarityScore": 0.9,
    "redundancyScore": 0.96,
    "readability": {"avgSentenceLength": 18.4}
  },
  "metadata": {"generatedAt": "ISO", "pipelineVersion": "v1.3", "modelStack": ["bart", "t5", "miniLM"]}
}
```

---
## 🏗️ Why Early Canonical Structure?
| Aspect | Early Structuring Benefit | If Deferred (Late Markdown Parsing) |
|--------|---------------------------|-------------------------------------|
| Determinism | Minimizes hallucinated merging | Harder to reverse-engineer sections |
| Validation | Easy JSON schema validation | Diffuse heuristics on text blobs |
| Reusability | Multi-output (Markdown / JSON / API) | One-off formatting risk |
| Granularity | Enables per-concept quality scoring | Concepts may be entangled |
| Debugging | Pinpoint failure stage | Expensive text diffing |

Conclusion: **Normalize early**. Markdown should be a rendering, never the primary source of truth.

---
## 🔐 Guardrails & Heuristics
- `shortDefinition` ≤ 28 words; `fullDefinition` ≤ 70 words.
- Remove filler: "In conclusion", "Basically", "It should be noted that".
- No concept duplicates (term fuzzy match Levenshtein ≤ 2 → merge or disambiguate).
- If `conceptType=COMPARISON` ensure at least 2 contrasting attributes.
- Each quiz question must map to ≥1 `conceptId`.
- Flashcards prefer high-importance concepts (`importance >= 0.6`).

---
## 🧪 Prompt Chain Overview
1. CLEANING_PROMPT → sanitize raw OCR / formatting.
2. SEGMENT_PROMPT → atomic concept splitting.
3. TYPING_PROMPT → assign concept type.
4. ENRICH_PROMPT → create short/full defs + examples + usage.
5. CLUSTER_PROMPT → group into coherent sections (avoid overlapping semantics).
6. SUMMARY_PROMPT → macro overview + 3–6 main ideas + key takeaway.
7. FLASHCARD_PROMPT → high-yield retrieval items.
8. QUIZ_GENERATION_PROMPT → stems + correct answer + distractors.
9. VALIDATION_PROMPT → detect redundancy, overlength, vagueness.
10. COMPRESSION_PROMPT → tighten verbose definitions.

Each prompt feeds structured JSON forward; **never** feed pure Markdown to intermediate stages.

---
## 🧼 1. Cleaning Prompt Template
```
You are a text normalization engine. Input: noisy educational text. Output: JSON array of cleaned atomic units.
Rules:
- Remove slide numbers, page numbers, watermark lines (FPPT, template credits).
- Split joined sentences; fix broken hyphenations (e.g., "classi- fication" → "classification").
- Preserve technical terms exactly (e.g., "Support Vector Machine").
- No summarization.
Return JSON:
[
  {"id": "u1", "text": "Clean atomic statement", "tokens": 17},
  ...
]
```

## ✂️ 2. Segmentation Prompt
```
You receive cleaned units. Merge only if they form a single inseparable concept definition.
Output: JSON concepts skeleton:
[{"id": "k1", "term": "", "raw": "original text"}]
```

## 🏷️ 3. Typing Prompt
```
Classify each concept into one of: DEFINITION | COMPARISON | TYPE_LIST | PROCESS | EXAMPLE | FORMULA | SIMPLE.
Rules:
- COMPARISON requires explicit contrasted entities.
- TYPE_LIST needs ≥2 subtypes enumerated.
Output augment:
{"conceptType": "DEFINITION"}
```

## 🧪 4. Enrichment Prompt
```
For each concept provide:
- shortDefinition (≤28 words)
- fullDefinition (≤70 words, may include context)
- usage (optional; when application is explicit)
- examples (array, ≤3)
Reject hallucination: only use provided text. If uncertain, add TODO flag.
Output merged concept JSON.
```

## 🗂️ 5. Clustering Prompt
```
Group concepts into 5–9 sections minimizing semantic overlap. Provide section title (noun phrase), icon suggestion.
Output sections array:
[{"id": "s1", "title": "", "icon": "", "conceptIds": ["k1", "k2"]}]
```

## 🧾 6. Summary Prompt
```
Generate structured summary:
{
  "overview": "150 words max, context first, no lists.",
  "mainIdeas": ["3–6 distilled high-level points"],
  "keyTakeaway": "One retention statement"
}
No repetition of concept definitions verbatim.
```

## 🃏 7. Flashcard Prompt
```
Create flashcards for high-importance concepts (importance ≥0.6).
Types: basic | definition | application.
Schema per card:
{"id":"f1","front":"Question form","back":"Precise answer","term":"Canonical term","hint":"Optional","difficulty":0.0-1.0}
Keep back ≤32 tokens.
```

## ❓ 8. Quiz Generation Prompt
```
Generate MCQ items. Each links to ≥1 conceptId.
Rules for distractors:
- Semantically related but clearly incorrect.
- Similar length/style to correct answer.
- Avoid "All of the above" or duplicate semantics.
Schema:
{"id":"q1","stem":"","choices":[{"id":"a","text":"...","isCorrect":true},...],"explanation":"","conceptIds":["k1"],"difficulty":0.2}
Difficulty heuristic: recall (0.2), application (0.5), nuance (0.7+).
```

## 🛡️ 9. Validation Prompt
```
Input: full concept list + summary + quiz + flashcards.
Tasks:
- Flag duplicates (term similarity > 0.85 cosine).
- Flag vague definitions (missing key noun).
- Flag overlength.
- Suggest compression targets.
Output: {"issues": [...], "recommendations": [...], "needsCompression": ["k5","k9"]}
```

## 🧯 10. Compression Prompt
```
Shorten fullDefinition for listed concept IDs while preserving critical meaning.
Do NOT remove examples if they are the only clarifying element.
Return patched concepts.
```

---
## 🎯 Flashcard Quality Heuristics
| Attribute | Good | Bad |
|-----------|------|-----|
| Front Style | Direct recall question | Ambiguous fragment |
| Back Specificity | One clear fact | Rambling multi-clause answer |
| Difficulty Spread | 0.2–0.7 majority | All 0.1 easy |
| Cognitive Form | Mix of definition & application | Only rote definitions |

Distractor candidate sources (for future multi-answer cards):
- Other concept terms from same section (semantic near-miss)
- Hypernyms / hyponyms (e.g., "Classification" vs "Regression")
- Procedure steps out of context

---
## 🧠 Quiz Distractor Strategy (Detailed)
1. Pull candidate pool: all `concept.term` values excluding the target.
2. Rank by embedding cosine similarity to correct answer term (MiniLM) — ideal window 0.55–0.75 (too high = confusion; too low = irrelevant).
3. Filter out terms that share identical root lemma.
4. Ensure lexical variety: no two distractors starting with same 3-char prefix.
5. Surface form matching: token length difference ≤ 4 from correct answer.
6. Balance concept types: avoid more than one distractor of same subtype in COMPARISON questions.
7. Final pass: replace any distractor containing the correct term substring.

MCQ integrity checks:
- Exactly one `isCorrect=true`.
- Explanation mentions the discriminating feature.
- If numerical question: distractors within plausible numeric neighborhood (±10–25%).

---
## 🔍 Quality Validation Metrics (Heuristic Layer)
- `structureScore`: (# sections within target range & balanced distribution) / 1.0
- `clarityScore`: percent definitions passing clarity regex (no vague pronouns at start).
- `redundancyScore`: 1 - (duplicateTermPairs / totalConcepts).
- `readability.avgSentenceLength` target: 14–22 words.

---
## 🛠️ Integration Notes
- All intermediate JSON stored in `model_cache/` for traceability.
- Add TODO flags for ambiguous enrichment to allow human review.
- Keep pipeline versioning: bump `pipelineVersion` when schema changes.

---
## 📚 References & Validation (recommended)
Use these authoritative resources to tighten schema design, validation, and CI testing.

- Official JSON Schema docs — getting started and specification (recommended draft: 2020-12): https://json-schema.org/learn/getting-started-step-by-step
- Learn JSON Schema (practical explanations, e.g., `additionalProperties` handling): https://learnjsonschema.com/
- AJV (fast Node validator) — good for runtime validation, compiled validators, and TypeScript integration: https://ajv.js.org/
- Schemathesis — schema-driven API testing (property-based / fuzzing) and CI integration: https://schemathesis.io/
- Tools and articles on schema testing and CI: example guide — "JSON Schema Tests: Best Practices" (overview + tools): https://www.devzery.com/post/json-schema-tests-best-practices-implementation-and-tools

CI / Validation recommendations:
- Validate at the API boundary (FastAPI endpoints) using a validator (Python `jsonschema` or `pydantic` model validation) so malformed payloads are rejected early.
- Add a CI job that:
  1. Lints schema files (e.g., `ajv` or `jsonschema` CLI).
 2. Runs unit tests that validate sample payloads against your schema (both valid and invalid cases).
 3. Optionally runs `schemathesis` against your OpenAPI spec to catch implementation mismatches and edge cases.

Example GitHub Actions snippet (validate canonical JSON against schema using Python jsonschema):
```yaml
name: Validate JSON Schemas
on: [push, pull_request]
jobs:
  validate-schemas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install deps
        run: pip install jsonschema
      - name: Validate sample canonical JSON
        run: |
          python - <<'PY'
          import json, sys
          from jsonschema import validate, RefResolver
          schema = json.load(open('ai-service/schemas/raw_schema.json'))
          data = json.load(open('ai-service/test_fixtures/sample_canonical.json'))
          validate(instance=data, schema=schema)
          print('OK')
          PY
```

Notes:
- Prefer compiled validators (AJV) in production for performance. Use `jsonschema` or `pydantic` in Python service unit tests and quick validation.
- Use `$id` and explicit `$schema` (draft version) in each schema file to ensure consistent interpretation across tools.
- Consider `additionalProperties: false` for strict surface APIs; allow controlled flexible fields behind `draft` or extension sub-schemas.


---
## 📓 Example Mini Prompt Chain (Pseudo)
```text
STEP 1 CLEAN >> STEP 2 SEGMENT >> STEP 3 TYPE >> STEP 4 ENRICH >> STEP 5 CLUSTER >> STEP 6 SUMMARY >> STEP 7 FLASHCARDS >> STEP 8 QUIZ >> STEP 9 VALIDATE >> STEP 10 COMPRESS >> FORMAT
```

---
## 🔄 Future Enhancements (TODO)
- TODO: Add FORMULA extraction using LaTeX detection.
- TODO: Add multi-answer quiz type schema.
- TODO: Implement adaptive difficulty scoring using retrieval success metrics.
- TODO: Add cross-concept relational flashcards ("X vs Y").
- TODO: Add short mnemonic generation prompt.

---
## 🧪 Minimal Implementation Targets
| Stage | MVP | Next | Advanced |
|-------|-----|------|---------|
| Cleaning | Regex+heuristics | Statistical noise model | Lightweight NER cleanup |
| Typing | Rule patterns | Few-shot T5 classification | Ensemble + confidence fusion |
| Clustering | Embedding KMeans | Spectral + label smoothing | Hierarchical + section theme LLM |
| Quiz | Term-based MCQ | Application stems | Mixed formats (ordering, matching) |

---
## 🏁 Usage Summary
Use this file as the authoritative schema + prompt library. Update sections atomically; each change should note version bump in `metadata.pipelineVersion` when deployed.

---
## 🗂️ Changelog
- v1.0 Initial structure and prompt chain.

---
## 🧩 Quick Copy Blocks
### Copy: Concept Enrichment Prompt (short)
```
Enrich concepts with fields: shortDefinition (≤28 words), fullDefinition (≤70 words), usage (optional), examples (≤3). No hallucinations. Return patched JSON array.
```

### Copy: Quiz Generation MCQ Prompt (short)
```
Generate MCQs mapping to conceptIds. Each has one correct answer, 3 distractors (similar style), explanation referencing discriminating idea. JSON schema enforced.
```

---
Happy building — refine ruthlessly. 🚀
