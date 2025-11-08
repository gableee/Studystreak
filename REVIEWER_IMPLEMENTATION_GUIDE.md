# AI Reviewer Generation - Implementation Guide

## Overview

This implementation adds async AI reviewer generation with full-screen PDF viewing and server-side processing. The system uses a job queue to handle long-running AI tasks without blocking user requests.

## Architecture

### Components

1. **Frontend (React/TypeScript)**
   - `PDFViewerPage.tsx` - Full-screen PDF viewer with zoom, scroll tracking, and analytics hooks
   - `FilePreviewModal.tsx` - Updated with "Full screen" button
   - Route: `/materials/:id/view` for full-screen viewing

2. **Backend (PHP)**
   - `StudyToolsController.php` - New endpoints:
     - `POST /api/materials/{id}/generate-reviewer` - Queue reviewer generation
     - `GET /api/materials/{id}/ai-status?job_type=reviewer` - Check job status
   - `AiJobsRepository.php` - Database operations for job queue
   - `ai_job_worker.php` - Background worker script

3. **AI Service (Python/FastAPI)**
   - `/generate/reviewer` endpoint (existing)
   - Uses sentence-transformers for semantic clustering
   - Returns cleaned, organized reviewer JSON

4. **Database**
   - `ai_jobs` table for job queue management
   - Job states: pending → processing → completed/failed

## Flow

### 1. User Uploads Material with AI Toggle Enabled

```
User uploads PDF → PHP backend stores in Supabase storage
→ Sets ai_toggle_enabled = true
```

### 2. Automatic Reviewer Generation (Background)

```
Backend detects ai_toggle_enabled = true
→ POST /api/materials/{id}/generate-reviewer
→ Creates job record in ai_jobs table (status: pending)
→ Returns 202 with job_id
```

### 3. Worker Processes Job

```
Worker polls ai_jobs for pending jobs
→ Fetches material from Supabase using service role key
→ Generates signed URL for PDF (1 hour expiry)
→ POSTs signed URL to ai-service /generate/reviewer
→ AI service downloads PDF, extracts text, cleans, clusters topics
→ Returns reviewer JSON
→ Worker updates job: status=completed, result=reviewer_json
```

### 4. Frontend Displays Result

```
Frontend polls GET /api/materials/{id}/ai-status?job_type=reviewer
→ When status=completed, displays reviewer in StudyTools
→ User can view PDF in full-screen via /materials/:id/view
```

## Security

### Service Role Key Protection

- ✅ Service role key stored only in backend `.env` (php-backend and ai-service)
- ✅ Never exposed to frontend/browser
- ✅ Used only for:
  - Worker fetching materials from Supabase
  - Generating short-lived signed URLs (1 hour)
- ✅ Frontend uses anon key for preview/download (auth-required endpoints)

### API Authentication

- Backend → AI Service: `X-API-Key: {AI_SERVICE_API_KEY}`
- Frontend → Backend: JWT bearer token (Supabase auth)
- Worker → Supabase: Service role key (internal only)

## Database Schema

```sql
-- ai_jobs table
CREATE TABLE ai_jobs (
    id UUID PRIMARY KEY,
    material_id UUID REFERENCES learning_materials(id),
    user_id UUID REFERENCES auth.users(id),
    job_type VARCHAR(50), -- 'reviewer', 'summary', etc.
    status ai_job_status, -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    result JSONB, -- Reviewer JSON when completed
    metadata JSONB, -- {storage_path, file_url, mime_type}
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Setup Instructions

### 1. Database Migration

Run the migration in Supabase SQL Editor:

```bash
# Copy contents of php-backend/migrations/2025_11_08_01_create_ai_jobs.sql
# Paste into Supabase SQL Editor and run
```

### 2. Install AI Service Dependencies

```bash
cd ai-service
pip install -r requirements.txt
# Downloads sentence-transformers and models (~400MB first run)
```

### 3. Configure Environment Variables

**php-backend/.env:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ Keep secret!
SUPABASE_STORAGE_BUCKET=learning-materials-v2
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your-secret-key
```

**ai-service/.env:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ Keep secret!
SUPABASE_STORAGE_BUCKET=learning-materials-v2
AI_SERVICE_API_KEY=your-secret-key
MODEL_CACHE_DIR=./model_cache
```

### 4. Start Services

```bash
# Terminal 1: Frontend
cd studystreak
npm run dev

# Terminal 2: PHP Backend
cd php-backend
php -S localhost:8080 -t public

# Terminal 3: AI Service
cd ai-service
python main.py

# Terminal 4: Worker (run continuously)
cd php-backend
while true; do php scripts/ai_job_worker.php; sleep 5; done
```

## Testing

### Manual Test Flow

1. **Upload Material:**
   ```bash
   POST /api/materials
   Body: {
     "title": "Test PDF",
     "ai_toggle_enabled": true,
     "file": <pdf-file>
   }
   ```

2. **Queue Reviewer:**
   ```bash
   POST /api/materials/{id}/generate-reviewer
   # Returns: {job_id: "...", status: "pending"}
   ```

3. **Check Status:**
   ```bash
   GET /api/materials/{id}/ai-status?job_type=reviewer
   # Poll until status: "completed"
   ```

4. **View Full-Screen:**
   - Navigate to `/materials/{id}/view` in browser
   - Test zoom controls, scroll tracking
   - Verify PDF renders correctly

### Unit Tests

```bash
# AI Service
cd ai-service
pytest tests/test_routes.py -v

# PHP Backend
cd php-backend
./vendor/bin/phpunit tests/
```

## Performance Considerations

### Large PDFs

For PDFs >10MB:
- Worker timeout: Increase `max_execution_time` in worker script
- Signed URL: Short-lived (1 hour) to minimize exposure
- Memory: Worker uses streaming where possible
- Retry: Failed jobs retry up to 3 times with exponential backoff

### Model Loading

- First run downloads ~400MB models (sentence-transformers)
- Models cached in `MODEL_CACHE_DIR` for subsequent runs
- GPU optional but recommended for faster inference

### Scaling

- Horizontal: Run multiple worker instances (different machines)
- Vertical: Increase worker batch size (default: 5 jobs/poll)
- Queue: Jobs processed FIFO with optional priority field

## Monitoring

### Worker Logs

```bash
tail -f php-backend/scripts/worker.log
# Shows job processing, errors, completion times
```

### Job Status Dashboard (Future)

Add admin endpoint to view:
- Pending jobs count
- Average processing time
- Failed jobs with errors
- Worker health status

## Troubleshooting

### Worker Not Processing Jobs

1. Check service role key is set in backend `.env`
2. Verify Supabase storage bucket exists and has files
3. Check worker logs for errors
4. Test signed URL generation manually

### AI Service Connection Failed

1. Verify `AI_SERVICE_URL` in php-backend `.env`
2. Check ai-service is running (`http://localhost:8000/health`)
3. Verify `AI_SERVICE_API_KEY` matches in both services

### PDF Not Loading in Full-Screen

1. Check signed URL generation in FilePreviewModal
2. Verify CORS headers allow frontend origin
3. Test URL directly in browser
4. Check browser console for errors

## Future Enhancements

1. **PDF.js Integration**: Replace iframe with PDF.js for better control
2. **Websocket Updates**: Real-time job status updates (no polling)
3. **Progress Tracking**: Show extraction progress % to user
4. **Batch Processing**: Queue multiple materials at once
5. **Analytics Dashboard**: Track time spent, scroll patterns, engagement metrics

## API Reference

### POST /api/materials/{id}/generate-reviewer

**Request:**
```json
{}  // Empty body, material ID in URL
```

**Response (202 Accepted):**
```json
{
  "message": "Reviewer generation queued successfully",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending"
}
```

### GET /api/materials/{id}/ai-status

**Query Params:**
- `job_type`: reviewer (default) | summary | quiz | flashcards

**Response (200 OK - Completed):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_type": "reviewer",
  "status": "completed",
  "created_at": "2025-11-08T10:00:00Z",
  "started_at": "2025-11-08T10:00:05Z",
  "completed_at": "2025-11-08T10:01:30Z",
  "result": {
    "topics": [...],
    "metadata": {...}
  }
}
```

**Response (200 OK - Pending):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_type": "reviewer",
  "status": "pending",
  "created_at": "2025-11-08T10:00:00Z"
}
```

**Response (200 OK - Failed):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_type": "reviewer",
  "status": "failed",
  "error_message": "Material not found",
  "created_at": "2025-11-08T10:00:00Z",
  "completed_at": "2025-11-08T10:00:10Z"
}
```

## Summary

This implementation provides:
- ✅ Full-screen PDF viewing with analytics hooks
- ✅ Async reviewer generation (no request blocking)
- ✅ Secure service-role access (backend-only)
- ✅ Job queue with retry logic
- ✅ Clean, organized reviewer output
- ✅ Scalable worker architecture

All secrets remain server-side, and the frontend tracks user engagement for future analytics improvements.
