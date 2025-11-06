# AI Service - StudyStreak

FastAPI microservice for AI-powered study tools.

## Quick Start (Docker)

### 1. Set up environment variables

**Option A: Use HuggingFace Inference API (recommended for dev)**
```bash
# In ai-service/.env
HF_API_TOKEN=your_token_here  # Get from https://huggingface.co/settings/tokens
```

**Option B: Run models locally (no API key needed, slower)**
```bash
# Leave HF_API_TOKEN empty or unset
```

### 2. Build and run with Docker Compose

From the `docker/` directory:

```bash
# Build and start all services
docker compose up --build -d

# Check logs
docker compose logs -f ai-service

# Stop services
docker compose down
```

### 3. Test the service

Health check:
```bash
curl http://localhost:8000/health
```

Generate embedding (prototype mode):
```bash
curl -X POST http://localhost:8000/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test sentence for embedding generation"}'
```

View API docs:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Current Implementation Status

### ✅ Working (Prototype Mode)
- `/health` - Health check endpoint
- `/embeddings/generate` - Returns deterministic 384-dim vectors (prototype)
- `/` - Service info and endpoint list

### 🚧 TODO (Phase 2 - Real ML)
- `/generate/summary` - Summarization (501 Not Implemented)
- `/generate/keypoints` - Key points extraction (501)
- `/generate/quiz` - Quiz generation (501)
- `/generate/flashcards` - Flashcard generation (501)
- `/extract/text` - PDF/DOCX/PPT text extraction (501)

## Prototype vs Production

**Current (Prototype):**
- Embedding endpoint returns deterministic pseudo-vectors from text hash
- No heavy ML dependencies loaded
- Fast startup (~5 seconds)
- Good for testing integration, DB insertion, and API contracts

**Phase 2 (Production):**
- Replace prototype with real sentence-transformers model
- Implement generation endpoints with T5/BART models
- Add model caching, batching, and GPU support

## Development

### Run locally (without Docker)

```bash
cd ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your settings

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Project Structure

```
ai-service/
├── main.py                 # FastAPI app entry point
├── config.py               # Configuration (models, API keys, etc.)
├── routes/
│   ├── embeddings.py       # Embedding generation routes
│   ├── generation.py       # Summary/quiz/flashcard routes
│   └── extraction.py       # Text extraction routes
├── models/                 # ML model wrappers (TODO)
│   ├── embedder.py         # sentence-transformers wrapper
│   ├── summarizer.py       # BART/T5 summarization
│   └── qa_generator.py     # T5 question generation
├── tests/                  # Unit tests
├── Dockerfile              # Container build
├── requirements.txt        # Python dependencies
└── .env.example            # Environment template
```

## Configuration

See `.env.example` for all available settings.

Key settings:
- `HF_API_TOKEN` - HuggingFace token (optional for local, required for Inference API)
- `AI_SERVICE_HOST` - Bind address (default: 0.0.0.0)
- `AI_SERVICE_PORT` - Port (default: 8000)
- `MODEL_CACHE_DIR` - Model cache directory (speeds up model loading)
- `LOG_LEVEL` - Logging level (INFO, DEBUG, etc.)

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

## Troubleshooting

**Service won't start:**
- Check logs: `docker compose logs ai-service`
- Verify port 8000 is not in use: `netstat -an | findstr 8000` (Windows)
- Check .env file exists and has correct values

**Import errors:**
- Rebuild container: `docker compose build ai-service`
- Check requirements.txt includes all dependencies

**Slow startup (Phase 2 only):**
- First model download can take time (~500MB for all-MiniLM-L6-v2)
- Models are cached in `ai-models-cache` volume (persists across restarts)
- Consider using HuggingFace Inference API instead for faster prototyping

## Next Steps

1. Test prototype embedding endpoint (current)
2. Wire PHP backend to call ai-service
3. Test end-to-end: create material → generate embedding → insert to DB
4. Implement real embedder with sentence-transformers (Phase 2)
5. Implement generation endpoints (summary, quiz, etc.)
6. Add unit tests and integration tests
7. Deploy to staging/production

## Resources

- FastAPI docs: https://fastapi.tiangolo.com
- Sentence Transformers: https://www.sbert.net
- HuggingFace Inference API: https://huggingface.co/inference-api
