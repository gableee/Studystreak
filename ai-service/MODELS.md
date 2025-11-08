# AI Service — Models & Dependencies

This document lists the machine learning models, libraries, and runtimes used by the `ai-service` component of StudyStreak. It also points to the files where each model is loaded or referenced.

## Primary models in use

- Embeddings
  - Model: `sentence-transformers/all-MiniLM-L6-v2` (384-dim)
  - Used in: `models/embedder.py`, `routes/embeddings.py`, `models/flashcard_generator.py`, `models/qa_generator.py`
  - Notes: fast, small embedding model suitable for semantic search and semantic distractor generation.

- Summarization / Keypoints
  - Model: `facebook/bart-large-cnn` (BART)
  - Used in: `models/summarizer.py`, configured in `config.py` as `SUMMARY_MODEL` / `KEYPOINTS_MODEL`
  - Notes: used via HuggingFace `transformers` pipeline; chunking is applied to long inputs to stay inside context windows.

- Question / Quiz generation
  - Model: `t5-base` (default in code)
  - Used in: `models/qa_generator.py`, `models/flashcard_generator.py`
  - Notes: T5 is used with prompt engineering to generate questions of different difficulty. The code includes comments recommending QG-specialized models such as `valhalla/t5-small-qg-hl`.

- Flashcard generation
  - Model: `t5-base` (same T5 pipeline) + heuristics and TF-IDF for term ranking
  - Used in: `models/flashcard_generator.py`

## Optional / Vision models

- CLIP
  - Model: `ViT-B/32` (via OpenAI CLIP repo) — optional
  - Used in: `models/clip_extractor.py` (visual term extraction scaffold)
  - Notes: flagged optional; enabled only if CLIP and pdf2image are installed.

- Tesseract OCR
  - Library: `pytesseract` (wraps local Tesseract executable)
  - Used in: `utils/extract_text.py`, `routes/extraction.py`
  - Notes: requires the Tesseract binary on the host (set `TESSERACT_CMD` env var or ensure `tesseract` is on PATH).

## Core libraries & runtime

- `transformers` — HuggingFace Transformers pipeline is used to load BART/T5 models.
- `sentence-transformers` — for the embedding model and similarity utilities.
- `torch` — PyTorch back-end for transformers and CLIP.
- `pytesseract` / `pdf2image` — for OCR and PDF page rasterization.

See `ai-service/requirements.txt` for current pinned versions (examples include `transformers>=4.30`, `sentence-transformers>=2.2.0`, `torch>=2.0.0`, `pytesseract>=0.3.10`, and an optional CLIP dependency via `git+https://github.com/openai/CLIP.git`).

## Configuration & caches

- `config.py` contains values used across the service:
  - `EMBEDDING_MODEL`, `SUMMARY_MODEL`, `QUIZ_MODEL`, `FLASHCARD_MODEL`
  - `TORCH_HOME`, `HF_HOME`, `MODEL_CACHE_DIR` — locations used to cache model files and weights.

## GPU / CUDA notes

- PyTorch is configured dynamically: `config.get_torch_device()` detects CUDA availability.
- Installing GPU-enabled PyTorch requires matching the correct CUDA toolkit version. Example (adjust CUDA version):

```powershell
# Example for CUDA 12.1 (pick the version that matches your drivers)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

- If you rely on HuggingFace Inference API instead of local models, you do not need local CUDA for inference (but local GPU can speed up heavy workloads).

## LLMs / External APIs

- The repository currently uses local HF models (T5/BART) and sentence-transformers. There are references and optional support for calling HuggingFace Inference API (see `ai-service/README.md`) if you prefer hosted inference.
- There is no enforced dependency on OpenAI GPT models in the codebase (no `openai` imports detected). You can add an external LLM later and annotate the call sites in `routes/generation.py`.

## Reviewer generation (student-friendly reviewers)

- Purpose: produce compact, student-friendly "reviewers" from uploaded materials (PDFs, DOCX, PPTX). Reviewers are organized into thematic topics, contain prioritized keypoints and short definition-style cards (definitions compressed to <= 300 characters), and preserve original terminology.
- Components and models used:
  - Embeddings: `sentence-transformers/all-MiniLM-L6-v2` (used for semantic grouping, deduplication, and distractor generation).
  - Summarization / Keypoints: `facebook/bart-large-cnn` (BART) — used to compress longer snippets into concise keypoints and to create short definition text when needed.
  - Clustering: semantic clustering is performed over sentence / snippet embeddings (embeddings from `sentence-transformers`) using lightweight clustering such as agglomerative clustering or HDBSCAN (implementation in `utils` / `models` modules).
  - QG / flashcard helpers: `t5-base` is reused for optional question/flashcard generation and small rewrites.
  - Optional vision/ocr helpers: `pytesseract`, `pdf2image`, and CLIP (if visual extraction needed for image-heavy materials).

- Where this is wired in the codebase:
  - Orchestration: `routes/generation.py` exposes endpoints such as `POST /generate/reviewer` which run the reviewer pipeline.
  - Cleaning & utilities: `ai-service/scripts/cleanup_extracted_json.py` contains the post-extraction cleaning and JSON formatting helpers used in offline/CI cleaning runs.
  - Embedding wrapper: `models/embedder.py` (SentenceTransformer wrapper) — used by clustering and dedup logic.

- Operational notes:
  - `sentence-transformers` must be installed and models downloaded (see `requirements.txt` and `MODELS.md` cache/config entries). The first run will download model weights into the `HF_HOME` / `TORCH_HOME` cache directories.
  - For production workloads the service can be configured to use the HuggingFace Inference API instead of local models to avoid heavy local model management.
  - Reviewer outputs are produced as structured JSON (topics, cards, metadata) and are cached under `model_cache/responses` when identical inputs are reprocessed.

---
Update this section when you add alternative embedding models (e.g., larger SBERT models), change clustering strategies, or introduce an external LLM for stylistic rewriting.

## Where to look in the code

- `ai-service/models/` — summarizer.py, qa_generator.py, flashcard_generator.py, embedder.py, clip_extractor.py
- `ai-service/routes/generation.py` — entrypoints that wire models to HTTP endpoints
- `ai-service/routes/embeddings.py` — embedding endpoint
- `ai-service/routes/extraction.py` — text/ocr extraction and preprocessing
- `ai-service/config.py` — centralized model names and device config

---
Notes: Keep this file updated whenever you change `config.py` or replace a model in code. If you add external LLMs (OpenAI/HF Inference), add connection details and cost/storage notes here.
