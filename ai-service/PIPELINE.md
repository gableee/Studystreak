# AI Service — Flow & Pipeline

This document describes the end-to-end data flow used by the `ai-service` component: how inputs are processed, which models are invoked at each stage, and where to look in the code.

## High-level pipeline (summary)

1. Ingest input
   - Supported types: plain text, PDF, DOCX, PPTX, images
   - Entry points: upload endpoints, or direct API calls to endpoints in `routes/`

2. Extraction & OCR
   - Files are preprocessed in `utils/extract_text.py` and `routes/extraction.py`.
   - For PDFs: `pdf2image` is used to rasterize pages; `pytesseract` (Tesseract) extracts text from images when `enable_ocr` is requested.
   - Optional CLIP-based visual term extraction is implemented in `models/clip_extractor.py` (only when CLIP and pdf2image are installed).

3. Text cleaning & chunking
   - Long documents are split into chunks (summarizer handles chunking, roughly ~600–700 words per chunk) to respect model context windows.
   - Helpers: `utils/truncate_helpers.py` and other utilities.

4. Summarization & Keypoint extraction
   - Model: BART (`facebook/bart-large-cnn`) via `models/summarizer.py`.
   - Route: `POST /generate/summary` in `routes/generation.py`.
   - Keypoints: derived from summarizer outputs and additional prompt engineering.

5. Question / Quiz generation
   - Model: T5 (`t5-base`) via `models/qa_generator.py`.
   - Use: generate questions of differing difficulty and produce MCQ items with distractors.
   - Distractors: semantic distractors are generated via sentence-transformers embeddings and similarity ranking.
   - Route: `POST /generate/quiz` in `routes/generation.py`.

6. Embeddings & semantic search
   - Model: `sentence-transformers/all-MiniLM-L6-v2` via `models/embedder.py` and `routes/embeddings.py`.
   - Use: generate embeddings for snippets/terms to support semantic search, similarity-based distractor generation, and downstream retrieval.

7. Flashcard generation
   - `models/flashcard_generator.py` orchestrates term extraction (TF-IDF + heuristics), optional T5 assistance for front/backs, and uses embeddings to deduplicate/rescue terms.
   - Route: `POST /generate/flashcards` in `routes/generation.py`.

8. Caching & metadata
   - Responses are cached under `model_cache/responses` using `utils/cache.py` to avoid repeated heavy model calls for identical inputs.
   - `config.MODEL_CACHE_DIR` controls model and response cache locations.

9. Response formatting
   - Utilities in `utils/markdown_formatter.py` format results into markdown and structured JSON used by the frontend.

## Where code connects (call graph)

- `routes/generation.py` — top-level orchestration: creates `Summarizer`, `QAGenerator`, and lazy-loads `FlashcardGenerator`. This file is the main HTTP glue.
- `models/summarizer.py` — loads BART/T5 via `transformers.pipeline` and handles chunking + inference.
- `models/qa_generator.py` — builds prompts for T5 and post-processes answers, distractors and explanation text.
- `models/embedder.py` — wraps `SentenceTransformer` and exposes a cached embedding interface.
- `models/flashcard_generator.py` — applies heuristics, TF-IDF ranking and optional T5 calls to produce flashcards.
- `utils/extract_text.py` — OCR, PDF rasterization, CLIP hookup.
- `utils/cache.py` — response cache implementation.

## Typical request examples (payloads)

- Generate summary

POST /generate/summary

```json
{
  "text": "<long text or extracted PDF text>",
  "max_words": 200,
  "min_words": 50
}
```

- Generate quiz

POST /generate/quiz

```json
{
  "text": "<text to generate quiz from>",
  "num_questions": 10,
  "difficulty": "mixed"
}
```

## Notes & best practices

- Chunking: keep chunk sizes aligned with model context windows to avoid truncation.
- Caching: use `MODEL_CACHE_DIR` to speed up development and reduce repeated HF downloads.
- GPU: for production inference on larger models (BART, T5), use a machine with CUDA and install a matching PyTorch wheel.
- External inference: if you prefer not to host models locally, configure the HuggingFace Inference API and set `HF_API_TOKEN` in environment variables; change call sites to use the Inference API instead of local pipeline (see `ai-service/README.md`).

## Troubleshooting

- If models fail to load or are very slow on first call, confirm `TORCH_HOME` and `HF_HOME` are writable and have enough disk space.
- If Tesseract OCR fails, ensure the Tesseract executable is installed and `TESSERACT_CMD` env var points to it.
- If you see GPU memory errors, lower batch sizes or run models on CPU for testing.

## Reviewer generation — extraction, cleaning and formatting (how extractedtext.cleaned.json is created)

This project produces cleaned, structured JSON reviewer artifacts (like `.github/extractedtext.cleaned.json`) using a small chain of extraction + cleaning + clustering + summarization steps. Below is how that file is produced end-to-end and what each stage does.

1. Raw extraction
   - Source input: a PDF / DOCX / PPTX or a rasterized image. The raw text extraction step is implemented in `utils/extract_text.py` and `routes/extraction.py`.
   - PDF handling: `pdf2image` rasterizes pages and `pytesseract` (Tesseract) is used when OCR is required. When OCR is not needed, `pdfplumber`-style text extraction is used (plain text extraction from PDF streams).
   - Output of this stage is a raw text dump (e.g. `.github/extractedtext.txt` in local/CI runs) that contains page-break markers and OCR noise.

2. Post-extraction cleaning (offline script + runtime helpers)
   - Script: `ai-service/scripts/cleanup_extracted_json.py` is used to canonicalize and clean extracted text. The metadata field in the cleaned JSON (`"generatedFrom": "cleanup_extracted_json.py"`) records this.
   - Cleaning steps performed:
      - Normalize whitespace and fix broken line joins (reconnect hyphenated line-breaks created by OCR).
      - Remove common OCR/artifact noise (garbled punctuation, long repeated sequences, obvious headers/footers and page numbers) using regex-based filters and heuristics.
      - Merge fragments into coherent sentences when safe (using punctuation and capitalization heuristics).
      - Deduplicate near-duplicate sentences using simple fuzzy deduplication (embedding or token-based similarity) so repeated captions/headers are removed.
      - Extract candidate "term / definition" pairs and short cards using heuristics and light parsing (list detection, colon/separator heuristics, and sentence position).
      - Truncate or compress long definitions to a maximum length (<= 300 characters) using summarization helpers (local BART pipeline) where appropriate.
      - Score importance using TF-IDF-style heuristics and positional cues (title/headings, bold/upper-case detection) and assign an importance float (0.0–1.0) for downstream sorting.
      - Assign simple emoji icons via a keyword-to-emoji map to help rapid scanning in the UI (this is cosmetic and heuristic-based).

3. Topic grouping / clustering
   - After cleaning and candidate extraction, semantic embeddings are computed using `sentence-transformers/all-MiniLM-L6-v2` via `models/embedder.py`.
   - The pipeline groups similar cards/snippets into topics using clustering (agglomerative clustering or HDBSCAN depending on runtime config). The resulting `topics` array contains a `title`, `icon`, and `keypoints` for each found topic.

4. Final formatting and metadata
   - The cleaned output combines `topics`, `cards`, and `metadata` fields and writes out `extractedtext.cleaned.json` (example path: `.github/extractedtext.cleaned.json`).
   - Example metadata fields written: `generatedFrom` (script name), `removedNoise` (count of removed noisy fragments), `original_count` and `cleaned_count` (cards counts before/after cleaning).

5. Usage in reviewer pipeline
   - The reviewer generation endpoint (`POST /generate/reviewer`) uses the same core functions: extraction -> cleaning -> clustering -> summarization to produce the reviewer JSON returned to the caller.
   - In the StudyStreak flow the PHP backend enqueues an `ai_jobs` record and a worker downloads the material via Supabase service role, posts the file/URL to the `ai-service` `generate/reviewer` endpoint, and saves the JSON response into `material_ai_versions` or the appropriate storage location.

Notes / operational considerations:
   - The cleaning script is intentionally conservative: when in doubt it preserves original terminology and only compresses or rewrites with explicit summarizer passes — this keeps important domain terms unchanged.
   - The embedding + clustering step assumes `sentence-transformers` is installed and models are available locally; if not, the service can fall back to a cheaper heuristic grouping.
   - Because model downloads can be large, use the `MODEL_CACHE_DIR` and proper environment variables (`HF_HOME`, `TORCH_HOME`) to avoid repeated downloads on ephemeral hosts.

Example: the attached `.github/extractedtext.cleaned.json` shows `original_count: 40` and `cleaned_count: 31` — nine noisy fragments were removed and remaining content was grouped into 5 high-level topics plus 31 important cards.

---
If you want, I can also add a small CLI that runs `cleanup_extracted_json.py` against a supplied `.txt` and prints a short summary (counts, top topics). Would you like that added to the repository under `ai-service/tools/`?

---
Keep this file updated alongside `MODELS.md` and `ai-service/README.md` when you change endpoints, models, or caching policies.
