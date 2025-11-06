# StudyStreak AI Service - Quick Start Guide

**Last Updated:** 2025-11-06  
**Status:** Environment configured, containers building

---

## ✅ What's Done

### 1. Environment Setup (COMPLETE)
- ✅ HuggingFace API token added to `ai-service/.env` (read-only scope)
- ✅ HF Inference API URL set to `https://api-inference.huggingface.co`
- ✅ AI Service API key generated and added to both services
- ✅ Docker compose configuration updated with ai-service
- ✅ API key enforcement middleware implemented

### 2. Repository Pattern (COMPLETE)
- ✅ `LearningMaterialRepository` - Material CRUD operations
- ✅ `MaterialAiVersionRepository` - AI content versioning
- ✅ `MaterialAiEmbeddingRepository` - Vector storage
- ✅ `AiService` - HTTP client for ai-service calls
- ✅ `StudyToolsController` - Endpoints for AI operations

### 3. Database Schema (COMPLETE)
- ✅ `material_ai_versions` - Stores AI-generated content with versioning
- ✅ `material_ai_embeddings` - Stores 384-dim vectors for semantic search
- ✅ RLS policies for security
- ✅ Indexes for fast queries

---

## 🔄 What's Next (Your Immediate Tasks)

### Step 1: Verify Containers (5 minutes)
Once the build completes:

```powershell
# Start containers
cd C:\Users\admin\OneDrive\Desktop\StudyStreak\docker
docker compose up -d

# Check logs
docker logs docker-ai-service-1 --tail 50

# Test health endpoint (should work WITHOUT API key)
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ai-service",
  "version": "1.0.0",
  "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
  "vector_dimensions": 384
}
```

### Step 2: Test API Key Enforcement (5 minutes)

```powershell
# Should return 401 (missing API key)
curl -X POST http://localhost:8000/embeddings/generate `
  -H "Content-Type: application/json" `
  -d '{"text":"test"}'

# Should return 200 (with valid API key from your .env)
$apiKey = "a2UI5-jO7FzZ_JzpYjEdXDBofQUERuC3NlaCLHtlX1A"  # Your actual key
curl -X POST http://localhost:8000/embeddings/generate `
  -H "Content-Type: application/json" `
  -H "x-api-key: $apiKey" `
  -d '{"text":"test embedding"}'
```

Expected response (prototype - deterministic vector):
```json
{
  "text": "test embedding",
  "vector": [0.123, -0.456, ...],  // 384 dimensions
  "model": "sentence-transformers/all-MiniLM-L6-v2",
  "dimensions": 384
}
```

### Step 3: Implement Real Embedding Endpoint (1-2 hours)

**File:** `ai-service/routes/embeddings.py`

**Current:** Returns deterministic/fake embedding  
**Goal:** Call HuggingFace Inference API or load model locally

**Option A - Use HuggingFace Inference API (Easiest):**
```python
import httpx
import os

@router.post("/embeddings/generate")
async def generate_embedding(request: EmbeddingRequest):
    HF_API_URL = os.getenv("HF_INFERENCE_API_URL")
    HF_TOKEN = os.getenv("HF_API_TOKEN")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{HF_API_URL}/models/sentence-transformers/all-MiniLM-L6-v2",
            headers={"Authorization": f"Bearer {HF_TOKEN}"},
            json={"inputs": request.text},
            timeout=30.0
        )
        response.raise_for_status()
        vector = response.json()
        
    return {
        "text": request.text,
        "vector": vector,
        "model": "sentence-transformers/all-MiniLM-L6-v2",
        "dimensions": len(vector)
    }
```

**Option B - Load Model Locally (Slower first call, faster after):**
```python
from sentence_transformers import SentenceTransformer

# Load model once at startup (add to main.py or route)
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

@router.post("/embeddings/generate")
async def generate_embedding(request: EmbeddingRequest):
    vector = model.encode(request.text).tolist()
    return {
        "text": request.text,
        "vector": vector,
        "model": "sentence-transformers/all-MiniLM-L6-v2",
        "dimensions": len(vector)
    }
```

### Step 4: Implement Generation Endpoints (2-3 hours)

**Files to update:**
- `ai-service/routes/generation.py`

**Endpoints to implement:**
1. `/generate/summary` - BART/T5 summarization
2. `/generate/keypoints` - Key point extraction
3. `/generate/quiz` - MCQ generation
4. `/generate/flashcards` - Flashcard pairs

**Example for summary:**
```python
@router.post("/generate/summary")
async def generate_summary(request: GenerationRequest):
    HF_API_URL = os.getenv("HF_INFERENCE_API_URL")
    HF_TOKEN = os.getenv("HF_API_TOKEN")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{HF_API_URL}/models/facebook/bart-large-cnn",
            headers={"Authorization": f"Bearer {HF_TOKEN}"},
            json={
                "inputs": request.text,
                "parameters": {
                    "max_length": 150,
                    "min_length": 30,
                    "do_sample": False
                }
            },
            timeout=60.0
        )
        response.raise_for_status()
        result = response.json()
        
    return {
        "run_id": str(uuid.uuid4()),
        "type": "summary",
        "content": {"summary": result[0]["summary_text"]},
        "model_name": "facebook/bart-large-cnn",
        "model_params": {"max_length": 150},
        "confidence": 0.95,
        "language": "en"
    }
```

### Step 5: Test PHP Integration (1 hour)

**File:** `php-backend/src/Controllers/StudyToolsController.php`

**Test endpoint:**
```bash
POST /api/materials/{material_id}/study-tools/generate
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "types": ["summary", "keypoints"]
}
```

**Expected flow:**
1. PHP calls `ai-service` endpoints
2. Inserts results into `material_ai_versions`
3. Generates embeddings and inserts into `material_ai_embeddings`
4. Returns success with version IDs

---

## 📋 Priority Checklist

- [ ] **IMMEDIATE** - Verify containers start (Step 1)
- [ ] **IMMEDIATE** - Test API key enforcement (Step 2)
- [ ] **HIGH** - Implement real HF embedding endpoint (Step 3)
- [ ] **HIGH** - Implement generation endpoints (Step 4)
- [ ] **HIGH** - Test PHP → ai-service integration (Step 5)
- [ ] **MEDIUM** - Refactor LearningMaterialsController to use repositories
- [ ] **MEDIUM** - Create ANN index for semantic search
- [ ] **LOW** - Implement user edit flow & version history

---

## 🔑 Environment Variables Reference

### ai-service/.env
```env
HF_API_TOKEN=hf_xxx                              # From huggingface.co/settings/tokens
HF_INFERENCE_API_URL=https://api-inference.huggingface.co
AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_PORT=8000
MODEL_CACHE_DIR=./models
LOG_LEVEL=INFO
AI_SERVICE_API_KEY=<your-secure-random-key>     # Must match php-backend
MAX_TEXT_LENGTH=10000
VECTOR_DIMENSIONS=384
```

### php-backend/.env
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
AI_SERVICE_URL=http://ai-service:8000           # For docker-compose (use localhost:8000 for local testing)
AI_SERVICE_API_KEY=<same-secure-random-key>     # Must match ai-service
```

---

## 🐛 Troubleshooting

### Container won't start
```powershell
# Check logs
docker logs docker-ai-service-1

# Rebuild without cache
docker compose build --no-cache ai-service
docker compose up -d
```

### API key errors
- Verify same key in both `.env` files
- Check header format: `x-api-key: <key>` or `Authorization: Bearer <key>`
- Health/docs endpoints don't require API key

### HuggingFace API errors
- Verify token is valid (test at https://huggingface.co/settings/tokens)
- Check token has "read" scope
- Some models may be rate-limited (wait or use different model)

### Import errors in Python
- Ensure `python-multipart` is in requirements.txt
- Rebuild container after adding dependencies

---

## 📚 Useful Commands

```powershell
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Rebuild specific service
docker compose build ai-service

# View logs (live)
docker compose logs -f ai-service

# Restart service
docker compose restart ai-service

# Run tests (when implemented)
docker exec docker-ai-service-1 pytest

# Check container status
docker ps
```

---

## 🎯 Success Criteria

You'll know you're ready to move forward when:

1. ✅ `curl http://localhost:8000/health` returns 200
2. ✅ Embedding endpoint returns 401 without API key
3. ✅ Embedding endpoint returns 384-dim vector with valid API key
4. ✅ PHP can call ai-service and insert into database
5. ✅ Can query latest AI content using repositories

---

**Next Steps:** Follow the numbered steps above. Start with Step 1 (verify containers) and work through each one. Update the AiRoadmap.md checklist as you complete each task.
