# Quick Reference Card

## 🚀 Start Services (4 Terminals)

```bash
# Terminal 1
cd studystreak; npm run dev

# Terminal 2
cd php-backend; php -S localhost:8080 -t public

# Terminal 3
cd ai-service; python main.py

# Terminal 4 (Worker - continuous)
cd php-backend; while ($true) { php scripts\ai_job_worker.php; Start-Sleep 5 }
```

## 🔗 Service URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- AI Service: `http://localhost:8000`
- Health checks: Add `/health` to backend/ai-service URLs

## 📁 Key Files

### Frontend
- `studystreak/src/Features/LearningMaterials/components/PDFViewerPage.tsx`
- `studystreak/src/Features/LearningMaterials/components/FilePreviewModal.tsx`
- `studystreak/src/Application/App.tsx`

### Backend
- `php-backend/src/Controllers/StudyToolsController.php`
- `php-backend/src/Repositories/AiJobsRepository.php`
- `php-backend/scripts/ai_job_worker.php`
- `php-backend/public/index.php`

### Database
- `php-backend/migrations/2025_11_08_01_create_ai_jobs.sql`

### Documentation
- `SETUP_CHECKLIST.md` ← **Start here!**
- `REVIEWER_IMPLEMENTATION_GUIDE.md`
- `IMPLEMENTATION_SUMMARY.md`

## 🛠️ Common Commands

### Check Service Health
```bash
# Backend
curl http://localhost:8080/health

# AI Service
curl http://localhost:8000/health

# Check all at once
.\test-reviewer-implementation.ps1
```

### Database Queries
```sql
-- Check job queue
SELECT * FROM ai_jobs ORDER BY created_at DESC LIMIT 10;

-- Job stats
SELECT status, count(*) FROM ai_jobs GROUP BY status;

-- Reset stuck job
UPDATE ai_jobs SET status='pending', attempts=0 WHERE id='{job_id}';
```

### Worker Control
```bash
# Run once
php php-backend\scripts\ai_job_worker.php

# Continuous (PowerShell)
while ($true) { php php-backend\scripts\ai_job_worker.php; Start-Sleep 5 }

# Continuous (Bash)
while true; do php php-backend/scripts/ai_job_worker.php; sleep 5; done
```

### Install Dependencies
```bash
# AI Service (Python)
cd ai-service
pip install -r requirements.txt

# Frontend (Node)
cd studystreak
npm install

# Backend (PHP)
cd php-backend
composer install
```

## 🧪 Testing Flow

1. **Upload PDF:** Frontend → Learning Materials → Add Material (enable AI toggle)
2. **Queue Job:** Backend auto-creates job in `ai_jobs` table
3. **Process:** Worker fetches PDF, calls AI service, updates result
4. **Check Status:** `GET /api/materials/{id}/ai-status?job_type=reviewer`
5. **View PDF:** Click "Full screen" button in preview modal
6. **View Reviewer:** Study Tools page → Reviewer tab

## 📊 Monitoring

### Worker Logs (Terminal 4)
```
[Worker] Starting AI job worker...
[Worker] Found 1 pending job(s)
[Worker] Processing job {id}...
[Worker] Job {id} completed successfully
```

### Job Status API
```bash
curl http://localhost:8080/api/materials/{ID}/ai-status?job_type=reviewer \
  -H "Authorization: Bearer {TOKEN}"
```

**Response:**
- `status: pending` → Job queued
- `status: processing` → Worker is processing
- `status: completed` → Done, check `result` field
- `status: failed` → Error, check `error_message`

## 🔒 Environment Variables

### Backend (.env)
```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ Keep secret!
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your-secret-key
```

### AI Service (.env)
```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ Keep secret!
AI_SERVICE_API_KEY=your-secret-key
MODEL_CACHE_DIR=./model_cache
```

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Worker not processing | Check service role key in backend `.env` |
| AI service connection failed | Verify `AI_SERVICE_URL` and API key match |
| PDF not loading | Check signed URL generation and CORS |
| Job stuck in processing | Restart worker, check AI service logs |
| Models not found | Run `pip install -r requirements.txt` |

## 📈 Performance

- **First Run:** ~5 min (downloads 400MB models)
- **Subsequent Runs:** ~10-30 sec per PDF
- **Memory:** ~500MB-1GB during processing
- **Concurrency:** Run multiple workers for parallel jobs

## ✅ Success Indicators

- Worker logs show "completed successfully"
- Job status API returns `status: completed`
- Full-screen PDF loads with zoom controls
- Reviewer tab shows cleaned, organized content
- No OCR noise (➢, …, —) in output
- Definitions compressed to ≤300 chars

## 🎯 Optimization Tips

1. **GPU:** Add GPU support for faster AI inference
2. **Caching:** Models cached after first run
3. **Scaling:** Run multiple worker instances
4. **Monitoring:** Add alerts for failed jobs
5. **Batch:** Process multiple materials together

---

**Need Help?** Check `SETUP_CHECKLIST.md` for detailed troubleshooting.
