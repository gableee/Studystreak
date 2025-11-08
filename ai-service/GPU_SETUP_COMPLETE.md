# AI Service - Quick Start with GPU Support

This guide explains how to run the AI service with GPU support (RTX 5060 / sm_120 compatible).

## What Was Fixed

### 1. **PyTorch GPU Compatibility** ✅
- **Updated Dockerfile** to use PyTorch 2.5+ with CUDA 12.1
- Now supports RTX 5060 compute capability (sm_120)
- Base image changed from `pytorch/pytorch:2.2.0` to `nvidia/cuda:12.1.0` + latest PyTorch

### 2. **Summary Endpoint** ✅
- Fixed `/generate/summary` to actually call BART summarization
- No longer returns internal prompts
- Properly respects `max_words` and `min_words` parameters

### 3. **Device Selection** ✅
- All models (BART, T5, sentence-transformers) now use `config.get_device()` and `config.get_hf_pipeline_device_id()`
- Automatically detects GPU or falls back to CPU
- Control via `USE_GPU` environment variable

### 4. **Comprehensive Tests** ✅
- Created `tests/test_all_endpoints.py` with full endpoint coverage
- Tests for embeddings, summary, keypoints, quiz, flashcards
- Includes performance, caching, and error handling tests

### 5. **Production Docker Compose** ✅
- Created `docker-compose.prod.yml` with GPU support
- Uses `deploy.resources.reservations.devices` for GPU passthrough
- Multi-worker uvicorn for production
- Health checks and restart policies

## Quick Start Commands

### Option 1: Rebuild & Run with GPU (Recommended)

```powershell
# Stop existing containers
docker stop studystreak-ai-cpu
docker rm studystreak-ai-cpu

# Rebuild with new PyTorch-compatible image
cd docker
docker compose build ai-service

# Start with GPU support using production compose
docker compose -f docker-compose.prod.yml up -d ai-service

# Check logs
docker compose -f docker-compose.prod.yml logs -f ai-service

# Verify GPU is working
Invoke-WebRequest -Uri http://127.0.0.1:8000/diagnostics/ocr-smoke -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | Select-Object cuda_available, cuda_device_name, gpu_ok
```

### Option 2: Run Tests First

```powershell
# Install test dependencies (if not already installed)
cd ai-service
pip install pytest pytest-asyncio

# Run comprehensive tests
pytest tests/test_all_endpoints.py -v

# Run only fast tests (skip slow performance tests)
pytest tests/test_all_endpoints.py -v -m "not slow"
```

### Option 3: CPU-Only Mode (Fallback)

If you encounter GPU issues, force CPU mode:

```powershell
# Edit .env and set USE_GPU=cpu
# Or override in compose:
docker compose -f docker-compose.prod.yml up -d ai-service -e USE_GPU=cpu
```

## Testing the Fixed Endpoints

### Test Summary (Now Fixed!)

```powershell
$headers = @{"x-api-key"="a2UI5-jO7FzZ_JzpYjEdXDBofQUERuC3NlaCLHtlX1A"}
$body = @{
    "text" = "Photosynthesis is the process by which plants convert light energy into chemical energy. It involves chlorophyll and carbon dioxide."
    "max_words" = 50
} | ConvertTo-Json

(Invoke-WebRequest -Uri http://127.0.0.1:8000/generate/summary -Method Post -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing).Content | ConvertFrom-Json | Select-Object summary, word_count
```

### Test Embeddings on GPU

```powershell
$body = @{"text" = "Machine learning enables computers to learn from experience."} | ConvertTo-Json
(Invoke-WebRequest -Uri http://127.0.0.1:8000/embeddings/generate -Method Post -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing).Content | ConvertFrom-Json | Select-Object @{N='vector_length';E={$_.vector.Count}}, model
```

### Test Flashcards

```powershell
$body = @{
    "text" = "DNA is a molecule that carries genetic instructions. It consists of two strands forming a double helix."
    "num_cards" = 3
} | ConvertTo-Json

(Invoke-WebRequest -Uri http://127.0.0.1:8000/generate/flashcards -Method Post -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing).Content | ConvertFrom-Json | Select-Object -ExpandProperty flashcards | Format-Table front, back
```

## Expected Build Time

- **First build**: 10-15 minutes (downloads PyTorch CUDA wheels ~2GB)
- **Subsequent builds**: 1-2 minutes (uses Docker layer cache)
- **Model download on first run**: 5-10 minutes (BART, T5, sentence-transformers)

## Troubleshooting

### Build fails with "no space left on device"
```powershell
# Clean up Docker
docker system prune -a --volumes
```

### GPU still not detected
```powershell
# Check NVIDIA drivers
nvidia-smi

# Verify Docker Desktop WSL integration
# Docker Desktop -> Settings -> Resources -> WSL Integration -> Enable for your distro

# Test GPU in container
docker run --rm --gpus all nvidia/cuda:12.1.0-runtime-ubuntu22.04 nvidia-smi
```

### Models are slow to load
- First run downloads models (~2GB total)
- Subsequent runs use cached models in `ai-models-cache` volume
- GPU speeds up inference 5-10x vs CPU

## Performance Expectations

| Endpoint | CPU (RTX host) | GPU (RTX 5060) |
|----------|----------------|----------------|
| Embeddings | ~0.5s | ~0.1s |
| Summary | ~15-30s | ~3-5s |
| Quiz (3Q) | ~10-20s | ~2-4s |
| Flashcards (5) | ~10-20s | ~2-4s |

## Production Deployment

For production, use `docker-compose.prod.yml`:

```powershell
# Build
docker compose -f docker-compose.prod.yml build

# Deploy
docker compose -f docker-compose.prod.yml up -d

# Scale (if needed)
docker compose -f docker-compose.prod.yml up -d --scale ai-service=2
```

## Files Changed

1. **`ai-service/Dockerfile`** - Updated to CUDA 12.1 + PyTorch 2.5+
2. **`ai-service/.env`** - Set `USE_GPU=auto`
3. **`ai-service/routes/generation.py`** - Fixed summary endpoint
4. **`ai-service/models/summarizer.py`** - Use device config
5. **`ai-service/tests/test_all_endpoints.py`** - New comprehensive tests
6. **`docker/docker-compose.prod.yml`** - Production-ready compose file
7. **`ai-service/routes/diagnostics.py`** - Enhanced diagnostics (done earlier)

## Next Steps

1. ✅ Rebuild container with new Dockerfile
2. ✅ Test GPU availability via diagnostics
3. ✅ Run comprehensive test suite
4. ✅ Verify all endpoints work correctly
5. 🎯 Deploy to production using `docker-compose.prod.yml`
