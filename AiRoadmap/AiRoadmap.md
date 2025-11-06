📘 StudyStreak — AI Roadmap, Schema Design, and Implementation Plan

**Last Updated:** 2025-11-05  
**Status:** Database schema finalized; ready for AI service implementation

This document is a living roadmap and implementation checklist. It reflects the current state of the database schema, migrations, and actionable next steps for building the AI generation pipeline.

---

## 1. System Overview
- [x] Purpose, target users, and core principles defined
- [x] Phased development timeline established
- [x] Database schema designed and migrations created (normalized AI storage)

---

## 2. Database Schema — Current State (2025-11-05)

### Core Tables Status

#### `learning_materials` (Master Material Table)
**Status:** ✅ Stable — contains legacy AI columns that will be deprecated after migration
- **Current columns:** material_id, title, description, content_type, file_url, extracted_content, word_count, user_id, is_public, category, ai_status, storage_path, file_name, size, mime, updated_at, deleted_at, likes_count, tags_jsonb, ai_toggle_enabled, ai_limit_count, created_at
- **Legacy AI columns (to be deprecated):** ai_summary, ai_keypoints, ai_quiz, ai_flashcards, ai_generated_at, ai_quiz_generated
- **New pointer column (added):** `latest_ai_versions` (jsonb) — optional fast-read pointer mapping type → ai_version_id
- **Migration path:** Keep legacy columns for backward compatibility during development; drop after backend/frontend fully migrated to `material_ai_versions`
- **Decision:** Use `material_ai_versions` as the source of truth for AI content; optionally maintain `latest_ai_versions` jsonb pointer for fast single-row reads

#### `material_ai_versions` (Normalized AI Storage — PRIMARY)
**Status:** ✅ Ready — this is your primary AI content table
- **Purpose:** Store all AI-generated artifacts with full versioning, audit trail, and metadata
- **Columns:**
  - `ai_version_id` (uuid PK) — unique ID for each AI artifact version
  - `material_id` (uuid FK → learning_materials) — links to parent material
  - `type` (text NOT NULL, CHECK constraint) — 'summary' | 'keypoints' | 'quiz' | 'flashcards'
  - `content` (jsonb NOT NULL) — actual AI output (structured JSON)
  - `model_name` (text) — which model generated this (e.g., 'gpt-4', 't5-base')
  - `model_params` (jsonb) — generation parameters (temperature, max_tokens, etc.)
  - `generated_by` (text) — 'model' | 'user_edit' | 'revert' | 'migration'
  - `created_at` (timestamptz) — when this version was created
  - `created_by` (uuid) — user who triggered generation or edit
  - `run_id` (uuid) — groups multiple artifacts from same generation run
  - `content_preview` (text) — small text preview for fast listing without parsing JSON
  - `language` (text) — language code (e.g., 'en')
  - `confidence` (numeric) — model confidence score (0-1 or 0-100)
  - `content_hash` (text) — MD5/SHA for deduplication and change detection
- **Indexes:**
  - `idx_material_ai_versions_material_type_created_at` (material_id, type, created_at DESC)
  - `idx_mav_material_id` (material_id)
  - `idx_mav_content_gin` (GIN on content jsonb)
- **RLS:** Enabled; policies allow SELECT for owner/public materials; INSERT for owner or service-role
- **Migration:** `2025_11_04_01_create_material_ai_versions.sql`
- **Why this design:** Enables versioning, user edits, revert/restore, audit trail, A/B testing, and model comparison

#### `material_ai_embeddings` (Vector Storage for Semantic Search)
**Status:** ✅ Ready — table created, indexes pending real data
- **Purpose:** Store embedding vectors for AI-generated content to enable semantic search and recommendations
- **Columns:**
  - `embedding_id` (uuid PK)
  - `ai_version_id` (uuid FK → material_ai_versions.ai_version_id, CASCADE delete)
  - `vector` (vector(384)) — pgvector type; dimension must match your embedding model (all-MiniLM-L6-v2)
  - `created_at` (timestamptz)
- **Indexes:**
  - `idx_material_ai_embeddings_ai_version_id` (basic FK index)
  - ANN index (IVFFLAT/HNSW) — **COMMENTED OUT** in migration; create after loading real vectors
- **RLS:** Enabled; SELECT allowed for owner/public; INSERT for service-role or authenticated users
- **Migration:** `2025_11_05_04_create_material_ai_embeddings.sql`
- **Why this design:** Keeps vectors separate from main content table; enables fast nearest-neighbor search; supports recommendations and "similar materials" features

#### `quizzes` (Quiz Metadata)
**Status:** ✅ Stable with new pointer column
- **Current columns:** quiz_id, title, description, material_id, passing_score, created_at, max_attempts
- **New column (added):** `generated_from_ai_version_id` (uuid FK → material_ai_versions.ai_version_id, SET NULL on delete)
- **Purpose of new column:** Track which AI artifact was used to generate this quiz for audit and regeneration
- **Migration:** Pointer column added via `2025_11_05_04_create_material_ai_embeddings.sql`

#### `quiz_questions`, `quiz_attempts`, `quiz_attempt_responses`
**Status:** ✅ Stable — no changes needed
- **Purpose:** Store quiz questions, user attempts, and per-question responses for analytics
- **Tables work together:** quiz_questions defines questions; quiz_attempts tracks user sessions; quiz_attempt_responses stores individual answers
- **Migration:** `2025_11_04_02_create_quiz_attempt_responses.sql` added response tracking

---

## 3. Architecture Decision — AI Content Storage Strategy

### ✅ FINAL DECISION: Use `material_ai_versions` as Source of Truth

**What this means:**
- All AI-generated content (summary, keypoints, quiz, flashcards) is stored in `material_ai_versions` table
- Each generation creates one or more rows (one per artifact type) with the same `run_id`
- User edits create new versions with `generated_by='user_edit'`
- Enables full version history, audit trail, A/B testing, and rollback/revert

**Legacy columns in `learning_materials` (ai_summary, ai_keypoints, ai_quiz, ai_flashcards):**
- **Current status:** Still present in schema for backward compatibility
- **Deprecation plan:** Drop these columns AFTER backend and frontend are fully migrated to read from `material_ai_versions`
- **Migration file:** `2025_11_05_03_add_indexes_and_drop_ai_columns.sql` has DROP statements commented out
- **When to drop:** After you verify backend/frontend work correctly with normalized reads (DISTINCT ON / LATERAL joins)

**Pointer column (`learning_materials.latest_ai_versions` jsonb):**
- **Purpose:** Optional denormalized pointer for ultra-fast single-row reads
- **Structure:** `{"summary":"<ai_version_id>", "keypoints":"<ai_version_id>", ...}`
- **Trade-off:** Faster reads vs additional write complexity (must update pointer on each generation)
- **Recommendation:** Start WITHOUT using pointers; rely on `SELECT DISTINCT ON (type) ... ORDER BY created_at DESC` for fetching latest. Add pointers later if performance profiling shows need.

### Read Patterns (How to Fetch AI Content)

**Option A: Dynamic latest fetch (recommended for MVP)**
```sql
-- Fetch latest summary for a material
SELECT ai_version_id, content, model_name, created_at
FROM material_ai_versions
WHERE material_id = $1 AND type = 'summary'
ORDER BY created_at DESC
LIMIT 1;

-- Fetch latest of ALL types in one query
SELECT DISTINCT ON (type) ai_version_id, type, content, model_name, created_at
FROM material_ai_versions
WHERE material_id = $1 AND type IN ('summary','keypoints','quiz','flashcards')
ORDER BY type, created_at DESC;
```

**Option B: Using pointer (optional optimization)**
```sql
-- Update pointer when generating new artifact
UPDATE learning_materials
SET latest_ai_versions = jsonb_set(
  coalesce(latest_ai_versions, '{}'), 
  '{summary}', 
  to_jsonb($ai_version_id::text)
)
WHERE material_id = $1;

-- Read using pointer (single lookup)
SELECT v.* FROM learning_materials lm
JOIN material_ai_versions v ON v.ai_version_id = (lm.latest_ai_versions->>'summary')::uuid
WHERE lm.material_id = $1;
```

**Decision:** Use Option A (dynamic) for development; switch to Option B if profiling shows latency issues.

---

## 4. Key Features (current status)
- [x] File upload (PDF, PPT, DOCX) with 100MB client + server checks
- [x] File validation (type + size) on client and server
- [ ] Chunked processing for very large files (NOT IMPLEMENTED)
- [ ] OCR integration for images in documents (NOT IMPLEMENTED)
- [ ] Vision / image captioning model (e.g., CLIP / BLIP) (NOT IMPLEMENTED)
- [x] Database schema for AI-generated content (IMPLEMENTED — `material_ai_versions`, `material_ai_embeddings`)
- [ ] AI generation pipeline (calls to models) — **NEXT PRIORITY**
- [x] UI toggles for AI generation and visibility
- [x] Editable AI outputs schema ready (new versions created on edit)
- [x] Quiz attempt tracking with per-question responses (IMPLEMENTED)

---

## 5. AI Service Implementation Plan

### Phase 1: Core AI Generation Pipeline (IMMEDIATE PRIORITY — 2-3 days)

**Goal:** Implement basic AI generation endpoints and wire backend to call them

#### Step 1.1: Choose Models & APIs
**Recommended approach:** Start with Hugging Face Inference API (or hosted endpoints) for rapid prototyping
- **Summarization:** `facebook/bart-large-cnn` or `t5-base` (via HF Inference or local)
- **Keypoint extraction:** Use summarization model + prompt engineering, or fine-tuned T5
- **Question generation:** `valhalla/t5-small-qg-hl` or similar QG-specific T5 models
- **Flashcard generation:** Prompt-based using summarization model or GPT-style API
- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (384-dim) or `text-embedding-ada-002` (OpenAI, 1536-dim)

**Decision needed:** Choose embedding model dimension NOW so we can update migration
- If using `sentence-transformers/all-MiniLM-L6-v2`: vector(384)
- If using OpenAI `text-embedding-ada-002`: vector(1536)
- If using `text-embedding-3-large`: vector(3072)

#### Step 1.2: Implement AI Service Endpoints (`ai-service/`)
Create Python Flask/FastAPI microservice with endpoints:
1. `POST /extract-text` — PDF/DOCX/PPT parsing + chunking (using PyPDF2, python-pptx, python-docx)
2. `POST /generate-summary` — calls summarization model
3. `POST /generate-keypoints` — extracts key points (structured JSON output)
4. `POST /generate-quiz` — generates multiple-choice questions
5. `POST /generate-flashcards` — creates flashcard pairs
6. `POST /generate-embedding` — returns vector for text input

**Response format (all endpoints):**
```json
{
  "run_id": "<uuid>",
  "type": "summary|keypoints|quiz|flashcards",
  "content": { /* structured JSON */ },
  "model_name": "facebook/bart-large-cnn",
  "model_params": {"max_length": 150, "temperature": 0.7},
  "confidence": 0.95,
  "language": "en"
}
```

#### Step 1.3: Update PHP Backend (`StudyToolsController`)
Wire `StudyToolsController::callAiService()` to actual AI service:
```php
private function callAiService(string $endpoint, array $payload): array
{
    $client = new \GuzzleHttp\Client(['timeout' => 60]);
    $response = $client->post($this->aiServiceUrl . $endpoint, [
        'json' => $payload,
        'headers' => ['Authorization' => 'Bearer ' . getenv('AI_SERVICE_KEY')]
    ]);
    return json_decode($response->getBody(), true);
}
```

**Insert flow (transactional):**
1. Call AI service endpoint
2. Insert row(s) into `material_ai_versions` with service-role key:
   ```php
   $aiVersionId = $this->insertAiVersion(
       $materialId,
       'summary',
       $aiResponse['content'],
       $aiResponse['model_name'],
       $aiResponse['run_id']
   );
   ```
3. Generate embedding and insert into `material_ai_embeddings`:
   ```php
   $embedding = $this->callAiService('/generate-embedding', ['text' => $summary]);
   $this->insertEmbedding($aiVersionId, $embedding['vector']);
   ```
4. Optionally update pointer: `learning_materials.latest_ai_versions`

#### Step 1.4: Test End-to-End
- Upload a test PDF in staging
- Trigger AI generation via StudyTools endpoint
- Verify rows inserted into `material_ai_versions` and `material_ai_embeddings`
- Query latest artifacts using DISTINCT ON pattern
- Test RLS: owner can read, non-owner cannot (for private materials)

---

### Phase 2: Embeddings & Semantic Search (after Phase 1)

**Goal:** Enable "similar materials" and semantic search

#### Step 2.1: Create ANN Index
After loading 100+ real vectors in staging:
```sql
-- Analyze the table
ANALYZE material_ai_embeddings;

-- Create ivfflat index (tune 'lists' based on dataset size)
CREATE INDEX idx_material_ai_embeddings_vector_ivfflat
  ON material_ai_embeddings USING ivfflat (vector vector_l2_ops)
  WITH (lists = 100);

-- Or create hnsw (if supported)
CREATE INDEX idx_material_ai_embeddings_vector_hnsw
  ON material_ai_embeddings USING hnsw (vector);
```

#### Step 2.2: Implement Search Endpoint
Add endpoint: `GET /api/materials/search?q=<query>`
- Generate query embedding
- Run nearest-neighbor SQL
- Return top N materials with similarity scores

```sql
SELECT e.ai_version_id, v.material_id, v.content, lm.title,
       1 - (e.vector <=> $query_vector) AS similarity
FROM material_ai_embeddings e
JOIN material_ai_versions v ON v.ai_version_id = e.ai_version_id
JOIN learning_materials lm ON lm.material_id = v.material_id
WHERE lm.is_public = true OR lm.user_id = $user_id
ORDER BY e.vector <=> $query_vector
LIMIT 10;
```

#### Step 2.3: Implement Recommendations
**Option A: Dynamic (on-demand)**
- When user views a material, compute nearest neighbors and show "Similar Materials"

**Option B: Materialized (background job)**
- Create `material_recommendations` table:
```sql
CREATE TABLE material_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES learning_materials(material_id) ON DELETE CASCADE,
  recommended_material_id uuid REFERENCES learning_materials(material_id) ON DELETE CASCADE,
  score double precision,
  method text DEFAULT 'embedding_nn',
  created_at timestamptz DEFAULT now()
);
```
- Background job runs nightly, computes top 10 similar materials per material, stores results
- Fast reads from precomputed table

**Recommendation:** Start with Option A (dynamic); add Option B if load increases

---

### Phase 3: User Edits & Version Management

**Goal:** Allow users to edit AI outputs and track versions

#### Step 3.1: Create Edit Endpoint
`PUT /api/materials/{id}/ai-content/{type}/edit`
- Accept edited content from user
- Insert new row into `material_ai_versions`:
  - `generated_by='user_edit'`
  - `created_by=auth.uid()`
  - `content=<edited_content>`
- Optionally update pointer

#### Step 3.2: Version History UI
- Show list of versions for each artifact type
- Allow user to "Restore" previous version (creates new version copying old content)

#### Step 3.3: SECURITY DEFINER Function (optional)
Create SQL function for atomic edit+pointer update:
```sql
CREATE FUNCTION save_ai_edit_and_update_pointer(
  p_material_id uuid,
  p_type text,
  p_content jsonb,
  p_user_id uuid
) RETURNS uuid SECURITY DEFINER AS $$
DECLARE
  v_ai_version_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO material_ai_versions (ai_version_id, material_id, type, content, generated_by, created_by)
  VALUES (v_ai_version_id, p_material_id, p_type, p_content, 'user_edit', p_user_id);
  
  UPDATE learning_materials
  SET latest_ai_versions = jsonb_set(coalesce(latest_ai_versions,'{}'), ARRAY[p_type], to_jsonb(v_ai_version_id::text))
  WHERE material_id = p_material_id;
  
  RETURN v_ai_version_id;
END;
$$ LANGUAGE plpgsql;
```

---

### Phase 4: Cleanup & Optimization

**Goal:** Remove legacy columns and optimize queries

#### Step 4.1: Drop Legacy AI Columns
After backend/frontend fully migrated:
```sql
ALTER TABLE learning_materials
  DROP COLUMN ai_summary,
  DROP COLUMN ai_keypoints,
  DROP COLUMN ai_quiz,
  DROP COLUMN ai_flashcards,
  DROP COLUMN ai_generated_at,
  DROP COLUMN ai_quiz_generated,
  DROP COLUMN ai_limit_count;
```
**Migration:** Uncomment DROP statements in `2025_11_05_03_add_indexes_and_drop_ai_columns.sql`

#### Step 4.2: Add Retention Policy
Background job to prune old versions:
```sql
-- Keep only latest 10 versions per (material_id, type)
DELETE FROM material_ai_versions
WHERE ai_version_id IN (
  SELECT ai_version_id FROM (
    SELECT ai_version_id, ROW_NUMBER() OVER (PARTITION BY material_id, type ORDER BY created_at DESC) AS rn
    FROM material_ai_versions
  ) sub
  WHERE rn > 10
);
```

#### Step 4.3: Performance Monitoring
- Monitor query latency for latest-artifact fetches
- If slow, add pointer columns and update on each generation
- Monitor vector index recall/latency and tune ivfflat `lists` parameter

---

## 6. Technical Stack (status)
- [x] Frontend: Vite + React + TypeScript + Tailwind
- [x] Backend: PHP (controllers + Supabase integrations)
- [ ] **AI service: Python microservice** — **IN PROGRESS** (scaffold exists, endpoints need implementation)
- [x] Database: Supabase (Postgres) with RLS
- [x] Storage: Supabase Storage (signed URLs)
- [ ] AI Models: **PENDING** (need to choose and integrate HF Inference or local models)

---

## 7. Deployment & Scalability
- [x] Docker + docker-compose for local development
- [ ] Production deployment (Vercel for frontend, Render/Railway for backend + AI service)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring & cost tracking (Sentry, CloudWatch, or similar)
- [ ] Horizontal scaling plan for AI service (queue-based processing for heavy loads)

---

## 8. Risks & Mitigations
- **AI Quality:** Start with human review; allow edits; collect feedback for fine-tuning
- **Token/API Costs:** Use small models for prototyping; cache results; implement rate limits
- **Privacy:** RLS enforced; service-role key server-side only; no PII in AI payloads
- **Performance:** Monitor query latency; add indexes/pointers as needed; use ANN index for embeddings
- **Data Loss:** Versioning prevents accidental overwrites; soft delete (deleted_at) for materials

---

## 9. Testing & Documentation
- [ ] API documentation for StudyTools endpoints (OpenAPI spec)
- [ ] Unit tests for AI service endpoints
- [ ] Integration tests for backend → AI service flow
- [ ] RLS policy tests (owner/non-owner/service-role scenarios)
- [ ] Load testing for embeddings + ANN search

---

## 10. Prioritized Action Items (Step-by-Step Checklist)

### ✅ COMPLETED
1. [x] Create `material_ai_versions` table and RLS policies
2. [x] Create `quiz_attempt_responses` table for analytics
3. [x] Create `material_ai_embeddings` table with pgvector
4. [x] Add pointer columns (`latest_ai_versions`, `generated_from_ai_version_id`)
5. [x] Add indexes for fast queries on `material_ai_versions`
6. [x] Document schema and migration files

### 🔄 IN PROGRESS
7. [x] **Choose embedding model and update vector dimension** (COMPLETED)
  - Action: Chosen `sentence-transformers/all-MiniLM-L6-v2` (384-dim) — applied in staging
  - Migration file `2025_11_05_04_create_material_ai_embeddings.sql` updated to use `vector(384)`
  - Note: No re-run required for this environment (ALTER applied). For fresh environments, the migration now creates `vector(384)`.

8. [x] **Create Repository Pattern for Clean DB Access** (COMPLETED — 2025-11-05)
  - Created `LearningMaterialRepository`, `MaterialAiVersionRepository`, `MaterialAiEmbeddingRepository`
  - Implemented full CRUD operations with RLS-safe service role key usage
  - Created `AiConfig` for AI service settings, `AiService` for HTTP client wrapper
  - Created `AiResponseParser` for parsing AI JSON responses into DB-ready format
  - Implemented `StudyToolsController` using repository pattern (generate, getLatest, listVersions)
  - Created AI service route scaffolds (extraction, generation, embeddings) with Pydantic models
  - **Status:** Structure complete, ready for ML model integration

9. [x] **Environment Configuration Complete** (COMPLETED — 2025-11-06)
  - Added HF_API_TOKEN (read-only scope) to `ai-service/.env`
  - Added AI_SERVICE_API_KEY (secure random token) to both `ai-service/.env` and `php-backend/.env`
  - Set HF_INFERENCE_API_URL to `https://api-inference.huggingface.co`
  - Set AI_SERVICE_URL to `http://ai-service:8000` in `php-backend/.env` for docker-compose networking
  - Added API key enforcement middleware to `ai-service/main.py` (returns 401 if missing/invalid)
  - Added `python-multipart` dependency for file upload endpoints
  - **Status:** Environment ready; containers building

### 📋 TODO (Priority Order)
10. [ ] **Test Docker Containers and Endpoints** (IMMEDIATE — next 30 minutes)
   - Verify ai-service container starts without errors
   - Test health endpoint: `curl http://localhost:8000/health`
   - Test embedding endpoint with API key: `curl -X POST http://localhost:8000/embeddings/generate -H "x-api-key: YOUR_KEY" -H "Content-Type: application/json" -d '{"text":"test"}'`
   - Verify API key enforcement (401 without key)
   - Run `ai-service/test_service.py` to validate all endpoints

11. [ ] **Implement Real HuggingFace Embedding Endpoint** (HIGH PRIORITY — 1-2 hours)
   - Replace prototype deterministic embedding in `ai-service/routes/embeddings.py`
   - Option A: Call HuggingFace Inference API (https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2)
   - Option B: Load sentence-transformers model locally (slower first call, faster subsequent)
   - Add retry logic and error handling
   - Test with real text and verify 384-dimensional output

12. [ ] **Implement AI Generation Endpoints** (HIGH PRIORITY — 2-3 hours)
   - `/generate/summary` — Call BART/T5 for summarization
   - `/generate/keypoints` — Extract key points (T5 + prompt or structured output)
   - `/generate/quiz` — Generate MCQ questions (T5-QG or custom prompt)
   - `/generate/flashcards` — Create flashcard pairs (prompt-based)
   - All should return consistent JSON structure with `run_id`, `content`, `model_name`, `model_params`

13. [ ] **Wire PHP Backend to AI Service** (HIGH PRIORITY — 1-2 hours)
   - Update `StudyToolsController::callAiService()` with real HTTP calls using Guzzle
   - Implement transactional flow:
     1. Call AI service endpoint
     2. Insert into `material_ai_versions` using `MaterialAiVersionRepository`
     3. Generate embedding and insert into `material_ai_embeddings` using `MaterialAiEmbeddingRepository`
   - Add proper error handling and rollback on failure
   - Test with sample PDF upload

14. [ ] **End-to-End Integration Test** (MEDIUM — 1 hour)
   - Upload test PDF in staging
   - Trigger AI generation via StudyTools endpoint
   - Verify rows inserted into `material_ai_versions` and `material_ai_embeddings`
   - Query latest artifacts using DISTINCT ON pattern
   - Test RLS: owner can read, non-owner cannot (for private materials)

15. [ ] **Refactor LearningMaterialsController to use Repository** (MEDIUM — 1-2 hours)
   - Remove duplicate DB access methods (`fetchMaterial`, `send` for material queries)
   - Replace with repository method calls (`findById`, `list`, `create`, `update`, `softDelete`)
   - Keep controller-specific logic (authentication, file uploads, storage operations, business rules)
   - **Why:** Centralize all DB logic in repositories for consistency, testability, and RLS safety
   - `/extract-text` (PDF/DOCX/PPT parsing)
   - `/generate-summary` (T5/BART)
   - `/generate-keypoints` (T5 + prompt)
   - `/generate-quiz` (T5-QG)
   - `/generate-flashcards` (prompt-based)
   - `/generate-embedding` (sentence-transformers)

16. [ ] **Create ANN index on embeddings** (after loading sample vectors)
    - Run ANALYZE on `material_ai_embeddings`
    - Create ivfflat or hnsw index
    - Measure recall and latency

17. [ ] **Implement semantic search endpoint**
    - Accept query text
    - Generate query embedding
    - Run nearest-neighbor SQL
    - Return top N materials

18. [ ] **Implement user edit flow**
    - Edit endpoint: insert new version with `generated_by='user_edit'`
    - Version history UI
    - Restore/revert functionality

19. [ ] **Add retention/cleanup job**
    - Prune old versions (keep latest N per material+type)
    - Prune orphaned embeddings
    - Schedule as cron job

20. [ ] **Drop legacy AI columns from `learning_materials`**
    - Verify backend/frontend work with new schema
    - Uncomment DROP statements in migration
    - Run in production with DB snapshot

21. [ ] **Implement recommendations** (dynamic or materialized)
22. [ ] **Add OCR for image-heavy PDFs** (Tesseract or cloud API)
23. [ ] **Add vision/captioning for images** (CLIP/BLIP)
24. [ ] **Production deployment & monitoring**
25. [ ] **Documentation & API specs**

---

---

Update (2025-11-05): Embeddings table & pointers created
- The `material_ai_embeddings` table and pointer columns (`learning_materials.latest_ai_versions` and `quizzes.generated_from_ai_version_id`) have been added via migration `php-backend/migrations/2025_11_05_04_create_material_ai_embeddings.sql` and RLS policies were created. The DB is ready to accept embeddings. The ANN index (ivfflat / hnsw) is intentionally left commented in the migration and should be created/tuned after we have real vectors in staging.

Given you are still developing (no production data or users yet), the recommended next step is to implement the AI service and ingestion pipeline. The DB schema is sufficiently prepared; only small, non-breaking changes may be needed later (e.g., vector dimension, pointer behaviors, retention rules).

Recommended immediate tasks (developer checklist)
- Chosen embedding model and vector dimension: all-MiniLM-L6-v2 (384-dim). Migration updated accordingly.
- Implement AI service endpoints in `ai-service/` for: summarization, keypoint extraction, quiz & flashcard generation, and embeddings generation.
- Wire PHP backend (`StudyToolsController`) to call the AI service for generation. Pattern:
   1) Create `material_ai_versions` rows for generated artifacts.
   2) Call embedding model for the artifact text and insert into `material_ai_embeddings` using the returned `ai_version_id`.
   3) Optionally update `learning_materials.latest_ai_versions` JSON pointer (in same transaction if using SECURITY DEFINER function).
- Test end-to-end in staging with a small set of documents. Do not create IVFFLAT/HNSW index yet — ingest sample vectors first and then tune index parameters.

Longer-term (after initial tests)
- Create and tune ANN index (ivfflat/hnsw) in staging once you have representative vectors. Build/ANALYZE and measure recall/latency.
- Implement recommendation materialization (background job writing `material_recommendations` or `learning_materials.latest_recommendations`).
- Add retention/pruning job to keep N latest versions or archive older vectors as needed.

If you want, I can:
- Update the migration to the exact vector dimension you choose now.
- Add a small PHP helper/snippet to safely insert vectors (parameterized) and a sample endpoint to trigger ingestion in staging.
- Create a simple prototype endpoint in `ai-service/` that returns a test embedding vector so you can test the full pipeline without external model access.

When you're ready, tell me which of the above tasks to do next (update migration vector dim, add PHP helper, add ai-service prototype, or generate PostgREST curl tests). I'll implement it and update the checklist.

---

## Database recommendations (concrete)

Current approach stores `ai_summary`, `ai_keypoints`, `ai_quiz`, `ai_flashcards` on `learning_materials` which is fine for MVP. For versioning, audit trails, and multiple variants, add two tables:

1) `material_ai_versions` — stores each generation run (versioning + who/when)

Sample DDL (Postgres / Supabase style):

```sql
create table if not exists material_ai_versions (
   id uuid default gen_random_uuid() primary key,
   material_id uuid not null references learning_materials(material_id) on delete cascade,
   type text not null, -- 'summary' | 'keypoints' | 'quiz' | 'flashcards'
   content jsonb not null,
   generated_by text null,
   created_at timestamptz default now()
);
```

2) `quiz_attempt_responses` — track per-question responses for analytics and history

```sql
create table if not exists quiz_attempt_responses (
   id uuid default gen_random_uuid() primary key,
   attempt_id uuid not null references quiz_attempts(attempt_id) on delete cascade,
   question_id uuid null references quiz_questions(question_id),
   answer jsonb not null,
   is_correct boolean null,
   response_time_ms integer null,
   created_at timestamptz default now()
);
```

Recommendation for `quizzes.max_attempts`: keep the column but allow NULL to indicate unlimited attempts. Enforce limits in application logic and expose a clear UX message.

### Where to store summaries / keypoints / flashcards?
- Short-term (MVP): keep `ai_summary` (text) and `ai_keypoints`/`ai_flashcards` as jsonb on `learning_materials` (already implemented).
- Mid-term: move to `material_ai_versions` to track multiple generations, user edits, and metadata (model name, prompt, generation parameters).

---

## Model evaluation quick-start (what to test first)
1. Summarization quality: try `facebook/bart-large-cnn`, `t5-base`, `google/pegasus-*` on 10 PDFs and compare ROUGE / human judgment.
2. Question generation: test `valhalla/t5-small-qg-hl` and community QG models; compare coverage and difficulty.
3. Embeddings: test `sentence-transformers/all-MiniLM-L6-v2` for semantic search/retrieval.
4. Vision captioning: test CLIP for embeddings; test BLIP for human-readable captions.

Cost note: start with smaller models for prototyping; move to hosted HF Inference or a GPU-backed endpoint for production if throughput/cost warrant.

---

If you want, I can:
- produce the exact SQL migration files for Supabase (two DDL migrations above),
- create a small AI prototype in `ai-service` that calls HF Inference for summarization (T5) and question generation (T5-QG), and
- wire `/api/materials/{id}/study-tools/*` endpoints to the prototype.

Next: I will update the todo list to mark this roadmap update as complete and add the next implementation tasks.


