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

Generate enhanced flashcards:
```bash
curl -X POST http://localhost:8000/generate/flashcards \
  -H "Content-Type: application/json" \
  -d '{
    "text": "# Machine Learning\nMachine learning is a subset of AI...",
    "num_cards": 5
  }'
```

View API docs:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Current Implementation Status

### ✅ Working
- `/health` - Health check endpoint
- `/embeddings/generate` - Embedding generation using sentence-transformers
- `/generate/summary` - AI-powered text summarization (BART model)
- `/generate/keypoints` - Extract key points from text
- `/generate/quiz` - Generate quiz questions with difficulty levels
- `/generate/flashcards` - **Enhanced flashcard generation** (NEW!)
- `/extract/text` - PDF/DOCX/PPT text extraction
- `/` - Service info and endpoint list

### 🎯 Recently Enhanced
- **Flashcard Generation**: Now includes:
  - Document structure analysis (headings, definitions, lists)
  - TF-IDF importance ranking
  - Semantic deduplication
  - Quality filtering with confidence scores
  - Multiple question generation strategies
  - See `FLASHCARD_GENERATOR_DOCS.md` for details

### 🚧 Future Enhancements
- Multi-language support
- Spaced repetition metadata
- Image-based flashcards
- Advanced difficulty levels

## Prototype vs Production

**Current (Production Ready):**
- Full AI-powered text generation and analysis
- Real ML models: sentence-transformers, T5, BART
- Enhanced flashcard generation with quality filtering
- Model caching for fast subsequent loads
- GPU support (optional, CPU works well)

**Key Features:**
- **Summarization**: BART-based intelligent summaries
- **Quiz Generation**: T5-powered questions with difficulty levels
- **Flashcards**: Advanced generation with structure analysis and TF-IDF ranking
- **Embeddings**: sentence-transformers for semantic search
- **Text Extraction**: PDF, DOCX, PPTX support

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
├── models/                 # ML model wrappers
│   ├── embedder.py         # sentence-transformers wrapper
│   ├── summarizer.py       # BART/T5 summarization
│   ├── qa_generator.py     # T5 question generation
│   └── flashcard_generator.py  # Enhanced flashcard generation (NEW!)
├── tests/                  # Unit tests
│   ├── test_routes.py
│   └── test_flashcard_generator.py  # Flashcard tests (NEW!)
├── demo_flashcards.py      # Demo script for flashcards (NEW!)
├── Dockerfile              # Container build
├── requirements.txt        # Python dependencies
├── FLASHCARD_GENERATOR_DOCS.md     # Detailed docs (NEW!)
├── FLASHCARD_MIGRATION_GUIDE.md    # Migration guide (NEW!)
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
# Run all tests
pytest

# Run specific test file
pytest tests/test_flashcard_generator.py -v

# Run with coverage
pytest --cov=. --cov-report=html

# Run flashcard demo
python demo_flashcards.py
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

1. ✅ Enhanced flashcard generation (COMPLETED)
2. Test flashcard quality with real educational content
3. Integrate with frontend UI for flashcard display
4. Add spaced repetition scheduling (SRS)
5. Implement multi-language support
6. Add image-based flashcard support
7. Performance optimization (GPU utilization)
8. Deploy to production environment

## Documentation

- **API Reference**: http://localhost:8000/docs (Swagger UI)
- **Flashcard Generator**: See `FLASHCARD_GENERATOR_DOCS.md`
- **Migration Guide**: See `FLASHCARD_MIGRATION_GUIDE.md`

## Resources

- FastAPI docs: https://fastapi.tiangolo.com
- Sentence Transformers: https://www.sbert.net
- HuggingFace Transformers: https://huggingface.co/docs/transformers
- TF-IDF: https://scikit-learn.org/stable/modules/feature_extraction.html#tfidf-term-weighting
