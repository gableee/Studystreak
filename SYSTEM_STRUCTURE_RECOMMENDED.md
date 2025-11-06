# StudyStreak — Recommended System Structure

**Last updated:** 2025-11-05  
**Status:** Proposed structure for review before scaffolding

This document presents the **recommended production-ready structure** with analysis, rationale, and priorities for implementation.

---

## Key Improvements Over Original Proposal

### 1. **ai-service/ Reorganization** ✅ RECOMMENDED

**Original issue:** Mixing `utils/` (existing helpers) with nested `app/routes/` creates confusion.

**Recommended structure:**
```
ai-service/
├── routes/           # Top-level (not app/routes/) — follows FastAPI conventions
├── models/           # ML model loaders (separate from API logic)
├── utils/            # Shared helpers (existing + new)
└── tests/            # Unit tests
```

**Why:**
- **Clarity:** `routes/` at top level (standard FastAPI pattern) vs nested `app/routes/`.
- **Separation:** ML inference (`models/`) separate from HTTP handlers (`routes/`).
- **Reusability:** Existing `utils/extract_text.py` stays; new chunking/OCR helpers added cleanly.

---

### 2. **php-backend/src/ — Add Repository Pattern** ✅ RECOMMENDED

**Original:** Direct DB queries in Controllers + Models.

**Recommended addition:**
```
php-backend/src/
├── Controllers/      # Thin HTTP handlers
├── Services/         # Business logic
├── Repositories/     # NEW: Data access layer (RLS-safe)
│   ├── MaterialAiVersionRepository.php
│   ├── MaterialAiEmbeddingRepository.php
│   └── LearningMaterialRepository.php
├── Models/           # DTOs or domain objects
└── Utils/            # Helpers
```

**Why:**
- **Testability:** Mock repositories in tests; keep controllers thin.
- **RLS Safety:** Centralize service-role key usage (avoid scattered auth logic).
- **Reusability:** `MaterialAiVersionRepository::getLatestByType()` called from multiple controllers.

**When to skip:** If you want MVP speed, start without repositories and refactor later. For production with RLS complexity, **strongly recommended**.

---

### 3. **Testing Structure: Unit vs Integration** ✅ RECOMMENDED

**Original:** Flat `tests/` folder.

**Recommended:**
```
php-backend/tests/
├── Unit/             # Fast (mocked dependencies)
└── Integration/      # Slower (real DB/services)
```

**Why:** Developers run fast unit tests in TDD loop; integration tests run pre-commit or in CI.

---

### 4. **Add Documentation Folder** ✅ RECOMMENDED

**Suggested:**
```
STUDYSTREAK/
├── .env.example      # Template for SUPABASE_URL, AI_SERVICE_URL, etc.
└── docs/
    ├── SETUP.md      # How to run locally (Docker, migrations)
    ├── API.md        # Quick API reference (or link to OpenAPI)
    └── ARCHITECTURE.md  # High-level design
```

**Why:** New contributors need env vars and setup steps before touching code.

---

### 5. **Shared Types/Constants (Optional)** 🤔 EVALUATE

**Suggested:**
```
STUDYSTREAK/
├── shared/           # Cross-service code
│   ├── types/
│   │   └── ai-response.types.ts
│   └── constants/
│       └── ai-limits.ts  # AI_MONTHLY_LIMIT = 5
```

**Why:** Avoid duplicating constants; ensure type safety across services.

**When to skip:** If you want strict service boundaries, keep them separate and use OpenAPI codegen instead.

**Recommendation:** Skip for MVP; add if you see duplication pain.

---

## Final Recommended Structure (with priorities)

**Legend:**
- `[MVP]` — Create now for Phase 1 (AI generation pipeline)
- `[Phase2]` — Create after embeddings/search working
- `[Optional]` — Nice-to-have; add if time permits

```
STUDYSTREAK/
├── .env.example                          # [MVP] Template for env vars
├── .gitignore                            # Existing
├── README.md                             # Existing: Update with links to docs/
├── SYSTEM_STRUCTURE.md                   # Existing (your original proposal)
├── SYSTEM_STRUCTURE_RECOMMENDED.md       # This file
├── GAMIFICATION_REDESIGN.md              # Existing
├── STUDY_TOOLS_IMPLEMENTATION.md         # Existing
│
├── docs/                                 # [MVP] Documentation folder
│   ├── SETUP.md                          # [MVP] Local dev setup (Docker, migrations, env vars)
│   ├── API.md                            # [Phase2] API quick reference (or link to OpenAPI)
│   └── ARCHITECTURE.md                   # [Optional] High-level design doc
│
├── AiRoadmap/                            # Existing: Schema docs
│   ├── AiRoadmap.md
│   ├── learning_materialsSchema.md
│   ├── material_ai_versionsSchema.md
│   ├── material_ai_embeddingsSchema.md
│   ├── quizzesSchema.md
│   ├── quiz_attemptsSchema.md
│   └── quiz_attempt_responsesSchema.md
│
├── docker/                               # Existing: Add ai-service container
│   ├── docker-compose.yml                # Update: Add ai-service
│   ├── docker-compose.override.yml       # Existing
│   └── Dockerfile                        # Existing
│
├── php-backend/                          # PHP API Backend
│   ├── composer.json                     # Existing: Add guzzlehttp/guzzle
│   ├── context7.json                     # Existing
│   ├── Dockerfile                        # Existing
│   │
│   ├── migrations/                       # Existing: SQL migrations
│   │   ├── 2025_11_04_01_create_material_ai_versions.sql
│   │   ├── 2025_11_04_02_create_quiz_attempt_responses.sql
│   │   ├── 2025_11_04_04_rls_learning_materials_policies.sql
│   │   ├── 2025_11_05_04_create_material_ai_embeddings.sql
│   │   └── 2025_11_06_01_add_ai_edit_function.sql  # [Phase2] SECURITY DEFINER function
│   │
│   ├── public/                           # API entry
│   │   ├── index.php                     # Existing
│   │   └── docs/                         # [Phase2] OpenAPI spec
│   │       └── study-tools-api.yaml
│   │
│   ├── scripts/                          # Existing: Utilities
│   │   ├── test-ai-service.php           # [MVP] Test AI service HTTP calls
│   │   ├── populate-embeddings.php       # [Phase2] Batch embed existing materials
│   │   └── retention-cleanup.php         # [Phase2] Cron: prune old AI versions
│   │
│   ├── src/                              # Core app logic
│   │   ├── Auth/                         # Existing
│   │   │   ├── AuthenticatedUser.php
│   │   │   ├── SupabaseAuth.php
│   │   │   └── SupabaseAuthException.php
│   │   │
│   │   ├── Config/                       # Existing + new AI config
│   │   │   ├── SupabaseConfig.php        # Existing
│   │   │   └── AiConfig.php              # [MVP] AI_SERVICE_URL, timeouts, model names
│   │   │
│   │   ├── Controllers/                  # HTTP handlers (keep thin)
│   │   │   ├── AuthController.php        # Existing
│   │   │   ├── LearningMaterialsController.php  # Existing: Update for ai_toggle
│   │   │   ├── StudyToolsController.php  # [MVP] NEW: AI generation endpoints
│   │   │   ├── GamificationController.php # Existing
│   │   │   └── TodoController.php        # Existing
│   │   │
│   │   ├── Http/                         # Request/Response
│   │   │   ├── Request.php               # Existing
│   │   │   ├── Response.php              # Existing
│   │   │   └── JsonResponder.php         # Existing
│   │   │
│   │   ├── Middleware/                   # Existing + new
│   │   │   ├── AuthMiddleware.php        # Existing
│   │   │   └── AiRateLimitMiddleware.php # [Phase2] Enforce 5 AI gens/month
│   │   │
│   │   ├── Models/                       # [MVP] NEW: Domain models (DTOs or Eloquent)
│   │   │   ├── MaterialAiVersion.php     # Model for material_ai_versions
│   │   │   ├── MaterialAiEmbedding.php   # Model for material_ai_embeddings
│   │   │   ├── LearningMaterial.php      # Existing logic moved here
│   │   │   └── QuizAttemptResponse.php   # Model for quiz_attempt_responses
│   │   │
│   │   ├── Repositories/                 # [MVP] NEW: Data access layer (RLS-safe)
│   │   │   ├── MaterialAiVersionRepository.php   # CRUD + getLatestByType()
│   │   │   ├── MaterialAiEmbeddingRepository.php # Insert vectors
│   │   │   └── LearningMaterialRepository.php    # Existing queries
│   │   │
│   │   ├── Services/                     # Business logic
│   │   │   ├── AiService.php             # [MVP] NEW: HTTP client for ai-service
│   │   │   ├── EmbeddingService.php      # [Phase2] Semantic search/recommendations
│   │   │   ├── StorageException.php      # Existing
│   │   │   └── SupabaseService.php       # Existing (or create as RLS helper)
│   │   │
│   │   └── Utils/                        # Helpers
│   │       ├── FileValidator.php         # Existing: 100MB checks
│   │       └── AiResponseParser.php      # [MVP] NEW: Parse AI JSON → DB format
│   │
│   ├── tests/                            # [MVP] NEW: Testing
│   │   ├── Unit/                         # Fast tests (mocked dependencies)
│   │   │   ├── AiServiceTest.php
│   │   │   └── AiResponseParserTest.php
│   │   └── Integration/                  # Slower tests (real DB/services)
│   │       ├── StudyToolsControllerTest.php
│   │       └── RlsPolicyTest.php
│   │
│   ├── dev_tools/                        # Existing: Test scripts
│   ├── tmp/                              # Existing
│   └── vendor/                           # Existing: Composer deps
│
├── ai-service/                           # Python AI Microservice
│   ├── main.py                           # FastAPI app entry (routes registration)
│   ├── requirements.txt                  # Update: Add transformers, sentence-transformers
│   ├── Dockerfile                        # Existing: Ensure GPU support
│   ├── config.py                         # [MVP] NEW: Model paths, vector dim (384), API keys
│   │
│   ├── routes/                           # [MVP] NEW: API endpoints (top-level, not nested)
│   │   ├── __init__.py
│   │   ├── extraction.py                 # POST /extract-text (PDF/DOCX/PPT)
│   │   ├── generation.py                 # POST /generate-{summary,keypoints,quiz,flashcards}
│   │   └── embeddings.py                 # POST /generate-embedding
│   │
│   ├── models/                           # [MVP] NEW: ML model loaders & inference
│   │   ├── __init__.py
│   │   ├── summarizer.py                 # BART/T5 loader + inference
│   │   ├── qa_generator.py               # T5-QG for quiz/flashcards
│   │   └── embedder.py                   # all-MiniLM-L6-v2 (384-dim)
│   │
│   ├── utils/                            # Existing + new helpers
│   │   ├── __init__.py
│   │   ├── extract_text.py               # Existing: PDF/DOCX/PPT parsing
│   │   ├── file_parser.py                # [MVP] NEW: Chunking logic for large files
│   │   ├── ocr.py                        # [Phase2] Tesseract for images
│   │   └── generate_quiz.py              # Existing: refactor into models/qa_generator.py
│   │
│   ├── tests/                            # [MVP] NEW: Unit tests
│   │   ├── test_routes.py
│   │   ├── test_models.py
│   │   └── test_embeddings.py
│   │
│   └── logs/                             # [MVP] NEW: For debugging
│       └── ai_service.log
│
├── studystreak/                          # Frontend (Vite + React + TS)
│   ├── components.json                   # Existing
│   ├── eslint.config.js                  # Existing
│   ├── index.html                        # Existing
│   ├── package.json                      # Existing
│   ├── postcss.config.js                 # Existing
│   ├── tailwind.config.js                # Existing
│   ├── tsconfig.json                     # Existing
│   ├── vite.config.ts                    # Existing
│   │
│   ├── docs/                             # Existing
│   │   └── ui-ux-guidelines.md
│   │
│   ├── public/                           # Static assets
│   │   ├── manifest.webmanifest
│   │   ├── offline.html
│   │   ├── icons/
│   │   └── screenshots/
│   │
│   ├── src/                              # Frontend source
│   │   ├── Application/                  # Existing
│   │   ├── assets/                       # Existing
│   │   ├── Auth/                         # Existing
│   │   ├── components/                   # Existing: UI components
│   │   ├── Features/                     # Existing
│   │   │   └── StudyTools/               # [MVP] Update: Add AI generation UI
│   │   ├── lib/                          # Existing: Utils
│   │   └── PWA/                          # Existing
│   │
│   └── scripts/                          # Existing
│
└── tmp/                                  # Existing: Temp files
```

---

## Comparison: Original vs Recommended

| Aspect | Your Original | Recommended | Rationale |
|--------|--------------|-------------|-----------|
| **ai-service structure** | `app/routes/`, `app/models/`, `app/utils/` (nested) | `routes/`, `models/`, `utils/` (top-level) | FastAPI convention; less nesting |
| **PHP Repositories** | Not present | Added (`Repositories/`) | RLS safety, testability, reusability |
| **Testing structure** | Flat `tests/` | `tests/Unit/`, `tests/Integration/` | TDD workflow: fast units, slow integration |
| **Documentation** | Inline comments | `docs/SETUP.md`, `docs/API.md` | Onboarding clarity |
| **Shared code** | Duplicated constants | `shared/` folder (optional) | DRY principle, but can skip for MVP |

---

## Decision Matrix for MVP

| Feature | Recommended for MVP? | Reason |
|---------|---------------------|--------|
| **Repositories pattern** | ✅ Yes (if using RLS heavily) | Centralize service-role auth; easier to test |
| **Unit/Integration split** | ✅ Yes | Fast feedback loop; CI can run integration separately |
| **docs/ folder** | ✅ Yes | `.env.example` + `SETUP.md` critical for onboarding |
| **ai-service routes/ top-level** | ✅ Yes | Standard FastAPI; easier to navigate |
| **shared/ folder** | ❌ No (skip for MVP) | Add later if you see duplication pain |
| **OpenAPI spec** | ⏸️ Phase 2 | Generate after endpoints stable |
| **Rate limiting middleware** | ⏸️ Phase 2 | Add after basic AI works |

---

## Next Steps (Choose Your Path)

### Option A: Use Recommended Structure (My Suggestion)
1. I'll scaffold the **[MVP]** folders/files now (empty placeholders with TODO comments).
2. You review the structure, and we iterate bit by bit (implement StudyToolsController → AiService → routes, etc.).
3. **Benefit:** Clean architecture from day 1; easier to maintain long-term.

### Option B: Use Your Original Structure
1. I'll scaffold based on your `SYSTEM_STRUCTURE.md` as-is.
2. We can refactor later if needed (e.g., move `app/routes/` → `routes/`).
3. **Benefit:** Faster start; fewer files initially.

### Option C: Hybrid Approach
1. Use recommended structure for **php-backend/** (Repositories + tests split).
2. Use your original structure for **ai-service/** (keep `app/` nesting).
3. **Benefit:** Balance between best practices and simplicity.

---

## Recommendation

**I recommend Option A** (use recommended structure) because:
- **Repository pattern** is critical for RLS safety (avoid scattered service-role key usage).
- **Testing split** (Unit/Integration) pays dividends in TDD workflow.
- **FastAPI conventions** (`routes/` top-level) make ai-service easier for Python devs to navigate.

If you want MVP speed over architecture purity, go with **Option C** (hybrid: repositories + your ai-service structure).

---

## Your Decision

Which option do you prefer?
- **A:** Recommended structure (scaffold [MVP] files now)
- **B:** Your original structure (scaffold as-is)
- **C:** Hybrid (Repositories + your ai-service layout)

Tell me A/B/C and I'll create the full folder structure with placeholder files (empty classes with TODO comments) so you can develop bit by bit.
