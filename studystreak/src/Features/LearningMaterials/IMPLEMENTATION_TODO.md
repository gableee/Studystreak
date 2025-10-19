# Learning Materials — Implementation & TODO

This file tracks the implementation steps, testing guidance, and follow-ups for the Learning Materials feature.

Status: Architecture confirmed; outstanding tasks below.

## Goals

- Provide a UI for uploading learning materials (PDF, PPT, video, markdown/text).
- Store uploaded files on the server and metadata in the database.
- Display lists of materials with filtering, searching, and download/open actions.
- Prepare for AI features (content extraction, quiz generation).

## Architecture Snapshot

- Frontend (`studystreak`, React + TypeScript + Tailwind on Vercel) handles upload UI, filters, and Supabase auth tokens.
- PHP API (`php-backend`, Render) accepts uploads, persists metadata to `learning_materials`, and issues signed storage URLs when needed.
- Supabase Storage hosts binary files; Supabase REST handles metadata reads/writes behind the PHP API.
- Python AI microservice (`ai-service`, Render) pulls files from Supabase, extracts text, calls Hugging Face models, and writes quiz data back.

## Recommended Folder Layout

```
project-root/
├── studystreak/                     # React frontend
│   └── src/Features/LearningMaterials/
│       ├── components/
│       │   ├── FileUpload.tsx
│       │   └── MaterialsList.tsx
│       ├── index.tsx
│       └── LearningMaterials.tsx
├── php-backend/                     # PHP API (Render)
│   └── src/Controllers/LearningMaterialsController.php
└── ai-service/                      # Python AI microservice (Render)
    ├── main.py                      # FastAPI/Flask entrypoint
    ├── requirements.txt             # fastapi, requests, pypdf, python-pptx, etc.
    └── utils/
        ├── extract_text.py
        └── generate_quiz.py
```

## Current TODO Board

**Frontend**
- [x] Add `FileUpload.tsx` component (modal, validation, POST to API)
- [x] Add `MaterialsList.tsx` component (listing, filters, categories)
- [x] Add `index.tsx` wiring into the feature page
- [ ] Run `npm run lint` and `npm run build` to clear remaining TS/type issues
- [ ] Integrate Supabase session refresh to keep auth token valid during uploads

**PHP Backend**
- [x] Add `LearningMaterialsController.php` with upload + list handlers
- [x] Register new routes in the public router
- [x] Link existing Supabase `learning_materials` table to upload flow
- [x] Trigger AI microservice webhook after successful upload
- [ ] Add storage cleanup + virus scanning hook for replace/delete actions
- [ ] Enforce role-based access (public/community flags, teacher-only actions)
- [ ] Implement pagination, search, and rate limiting on GET endpoint

**Database & Supabase**
- [x] `learning_materials`, `quiz_questions`, `quizzes`, and `quiz_attempts` tables already exist in Supabase
- [ ] Configure Supabase Storage bucket policies (allow public read, restrict write to service role)
- [ ] Add Row-Level Security (RLS) policies for `learning_materials` (users see own/public materials)
- [ ] Test Supabase REST insert/select from PHP backend

**Python AI Microservice**
- [x] Scaffold `ai-service/` FastAPI project with `/process-material` endpoint
- [ ] Implement `extract_text.py` covering PDF (pypdf) and PPTX (python-pptx)
- [ ] Implement `generate_quiz.py` to call Hugging Face Inference API
- [ ] Persist AI output back to Supabase (`ai_status`, `ai_summary`, `quiz` fields)
- [ ] Add worker authentication (Supabase service role key stored in Render env vars)
- [ ] Write pytest coverage for extraction + quiz generators

**DevOps & QA**
- [ ] Add Dockerfile/render.yaml for Python AI microservice (PHP Docker already done)
- [ ] Document Supabase/AI env vars for all services (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `AI_SERVICE_URL`, `AI_SERVICE_API_KEY`)
- [ ] Create end-to-end smoke script hitting upload → AI processing → fetch list
- [ ] Add unit/integration tests around PHP upload/list endpoints

## File Locations

- Frontend: `studystreak/src/Features/LearningMaterials/`
- Backend: `php-backend/src/Controllers/LearningMaterialsController.php`
- Python: `ai-service/`

## Quick local test steps

1. Backend
   - Ensure PHP server is running (where other controllers already run). Example:
     php -S localhost:8000 -t php-backend/public
   - Confirm `.env` contains `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`.

2. Frontend
  - Start Vite dev server: `cd studystreak && npm install && npm run dev`
  - Open Learning Materials page and try upload modal

3. Python AI service
  - Run locally: `cd ai-service && uvicorn main:app --reload`
  - Trigger processing endpoint manually with a stored Supabase file URL to verify quiz generation

4. Verify end-to-end
  - After upload, response JSON includes the `file_url` pointing to Supabase Storage (e.g., `https://<project>.supabase.co/storage/v1/object/public/<bucket>/...`)
  - GET `http://localhost:8000/api/learning-materials` should return the uploaded entry with tags and visibility flags
  - AI service should update `ai_status` to `completed` and populate `ai_summary` / `quiz`

## Notes & Assumptions

- API endpoints assume bearer token in `Authorization` header stored in `localStorage.token`.
- Backend now talks directly to Supabase REST and Storage (no local `Database.php`). Supply a service role key for privileged inserts/storage uploads.
- Configure storage bucket policies in Supabase so that public URLs are accessible as expected.

## Next steps

- Confirm Supabase schema alignment (no migration needed).
- Add RLS + storage bucket policies.
- Flesh out PDF/text extraction (Python service with `pypdf`/`python-pptx`).
- Add Supabase Storage cleanup path for deletions / replace operations.
- Plan AI-powered features (quiz generation, summarisation) once metadata pipeline is stable.

---
Generated on: 2025-10-19
