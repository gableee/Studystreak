# 📚 Documentation Index

## Start Here

👉 **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** - Your first stop! Follow these steps to get the system running.

## Implementation Overview

### What Was Built
📊 **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Complete overview of all components created, architecture, and what each file does.

### Technical Deep Dive
📚 **[REVIEWER_IMPLEMENTATION_GUIDE.md](REVIEWER_IMPLEMENTATION_GUIDE.md)** - Comprehensive technical documentation covering:
- Architecture and flow diagrams
- Security model and best practices
- API reference with examples
- Performance considerations
- Troubleshooting guide

## Quick References

### Commands & Tips
🎯 **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference card with:
- Service startup commands
- Common commands and queries
- Environment variables
- Troubleshooting table
- Performance tips

### Testing
🧪 **[test-reviewer-implementation.ps1](test-reviewer-implementation.ps1)** - PowerShell script to:
- Check if all services are running
- Validate worker script
- Provide manual testing steps

## Feature Documentation

### Main Features
📖 **[README.md](README.md)** - Project overview with:
- Platform overview
- Core features (including new reviewer generation)
- Tech stack
- Roadmap

## Component Documentation

### AI Service
Located in `ai-service/`:
- **[PIPELINE.md](ai-service/PIPELINE.md)** - AI pipeline documentation
- **[MODELS.md](ai-service/MODELS.md)** - Model specifications
- **[QUICK_START.md](ai-service/QUICK_START.md)** - AI service quick start

## Implementation Details by Area

### Frontend
- **PDFViewerPage.tsx** - `studystreak/src/Features/LearningMaterials/components/PDFViewerPage.tsx`
- **FilePreviewModal.tsx** - `studystreak/src/Features/LearningMaterials/components/FilePreviewModal.tsx`
- **App.tsx** - `studystreak/src/Application/App.tsx`

### Backend
- **StudyToolsController.php** - `php-backend/src/Controllers/StudyToolsController.php`
- **AiJobsRepository.php** - `php-backend/src/Repositories/AiJobsRepository.php`
- **ai_job_worker.php** - `php-backend/scripts/ai_job_worker.php`
- **AiService.php** - `php-backend/src/Services/AiService.php`
- **index.php** - `php-backend/public/index.php`

### Database
- **Migration** - `php-backend/migrations/2025_11_08_01_create_ai_jobs.sql`

## Recommended Reading Order

### For Quick Setup (30 minutes)
1. **SETUP_CHECKLIST.md** - Follow steps 1-5
2. **QUICK_REFERENCE.md** - Keep this open for commands
3. **test-reviewer-implementation.ps1** - Run to verify

### For Understanding the System (1 hour)
1. **IMPLEMENTATION_SUMMARY.md** - Overview of what was built
2. **REVIEWER_IMPLEMENTATION_GUIDE.md** - Deep technical dive
3. **QUICK_REFERENCE.md** - Commands and troubleshooting

### For Development (ongoing)
1. **REVIEWER_IMPLEMENTATION_GUIDE.md** - Architecture and API reference
2. **QUICK_REFERENCE.md** - Daily commands
3. **Component files** - Direct source code inspection

## Getting Help

### Setup Issues
- Check **SETUP_CHECKLIST.md** → Troubleshooting section
- Review **QUICK_REFERENCE.md** → Quick Troubleshooting table

### Technical Questions
- See **REVIEWER_IMPLEMENTATION_GUIDE.md** → Troubleshooting section
- Check **IMPLEMENTATION_SUMMARY.md** → Architecture diagrams

### Common Problems
- Services not starting → **QUICK_REFERENCE.md** → Check Service Health
- Worker not processing → **SETUP_CHECKLIST.md** → Worker Not Processing Jobs
- PDF not loading → **SETUP_CHECKLIST.md** → PDF Not Loading in Full-Screen

## Additional Resources

### Project Planning
- **AiRoadmap/** - Feature roadmaps and database schemas
- **docs/SETUP.md** - General setup documentation

### Testing Scripts
- **test-reviewer-implementation.ps1** - Reviewer implementation test
- **test-full-stack.ps1** - Full stack test suite
- **test-integration.ps1** - Integration tests

## Quick Links

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) | Get system running | 10 min |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Commands & tips | 5 min |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | What was built | 15 min |
| [REVIEWER_IMPLEMENTATION_GUIDE.md](REVIEWER_IMPLEMENTATION_GUIDE.md) | Technical deep dive | 30 min |
| [README.md](README.md) | Project overview | 10 min |

---

## TL;DR - Get Started Now

```bash
# 1. Read this first
cat SETUP_CHECKLIST.md

# 2. Run database migration (copy SQL from file to Supabase)
# File: php-backend/migrations/2025_11_08_01_create_ai_jobs.sql

# 3. Install dependencies
cd ai-service
pip install -r requirements.txt

# 4. Start services (4 terminals - see QUICK_REFERENCE.md)
# Terminal 1: cd studystreak; npm run dev
# Terminal 2: cd php-backend; php -S localhost:8080 -t public
# Terminal 3: cd ai-service; python main.py
# Terminal 4: cd php-backend; while ($true) { php scripts\ai_job_worker.php; Start-Sleep 5 }

# 5. Test
.\test-reviewer-implementation.ps1
```

**Ready to go!** Start with `SETUP_CHECKLIST.md` and you'll be up and running in ~10 minutes.
