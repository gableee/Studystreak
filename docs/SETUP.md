# StudyStreak Local Development Setup

## Prerequisites

- **Docker & Docker Compose** (recommended) OR:
  - PHP 8.1+ with Composer
  - Python 3.10+ with pip
  - Node.js 18+ with npm
  - PostgreSQL 15+ with pgvector extension

## Quick Start with Docker

1. **Clone and navigate to project:**
   ```bash
   cd c:\Users\admin\OneDrive\Desktop\StudyStreak
   ```

2. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** (edit `.env`):
   ```env
   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_STORAGE_BUCKET=learning-materials-v2

   # AI Service
   AI_SERVICE_URL=http://ai-service:8000
   AI_SERVICE_API_KEY=your_api_key_here  # Optional

   # CORS
   API_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

4. **Start services:**
   ```bash
   docker-compose up -d
   ```

5. **Run migrations:**
   ```bash
   # Access php-backend container
   docker exec -it studystreak-php-backend bash

   # Inside container, run migrations
   cd migrations
   for f in *.sql; do psql $DATABASE_URL -f "$f"; done
   ```

6. **Access services:**
   - Frontend: http://localhost:5173
   - PHP API: http://localhost:8080
   - AI Service: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Manual Setup (Without Docker)

### 1. PHP Backend

```bash
cd php-backend
composer install
php -S localhost:8080 -t public
```

### 2. AI Service

```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 3. Frontend

```bash
cd studystreak
npm install
npm run dev
```

## Database Migrations

Migrations are in `php-backend/migrations/` and should be run in order:

```sql
-- 1. Core AI tables
2025_11_04_01_create_material_ai_versions.sql
2025_11_04_02_create_quiz_attempt_responses.sql
2025_11_04_04_rls_learning_materials_policies.sql

-- 2. Embeddings (vector column is vector(384) for all-MiniLM-L6-v2)
2025_11_05_04_create_material_ai_embeddings.sql

-- 3. Future: ANN index (after data loaded)
-- CREATE INDEX ON material_ai_embeddings USING ivfflat (vector vector_cosine_ops);
```

## Testing

### PHP Backend Tests

```bash
cd php-backend
./vendor/bin/phpunit tests/Unit
./vendor/bin/phpunit tests/Integration
```

### AI Service Tests

```bash
cd ai-service
pytest tests/
```

## Troubleshooting

### "AI_SERVICE_URL not configured"
- Ensure `.env` has `AI_SERVICE_URL=http://localhost:8000` (or `http://ai-service:8000` in Docker)

### "Failed to connect to AI service"
- Check AI service is running: `curl http://localhost:8000/health`
- Check firewall/network settings

### "Missing vector extension"
- Install pgvector in PostgreSQL: `CREATE EXTENSION vector;`

### RLS Errors (403/404 on storage)
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
- Check bucket policies in Supabase dashboard

## Next Steps

1. **Generate AI content:**
   ```bash
   POST /api/learning-materials/{id}/generate
   Body: {"type": "summary", "regenerate": false}
   ```

2. **Fetch AI content:**
   ```bash
   GET /api/learning-materials/{id}/ai/summary
   ```

3. **List all versions:**
   ```bash
   GET /api/learning-materials/{id}/ai/versions
   ```

## Architecture Notes

- **Repositories** handle all DB access (RLS-safe with service role key)
- **Controllers** are thin HTTP handlers
- **AI Service** is a separate Python microservice (FastAPI)
- **Embeddings** use all-MiniLM-L6-v2 (384-dim vectors)

For more details, see `SYSTEM_STRUCTURE_RECOMMENDED.md`.
