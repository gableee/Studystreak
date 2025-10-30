# Production Roadmap & Long-term Playbook

This document is a single source of truth for long-term production plans, release practices, and the feature-first → optimize-later philosophy for StudyStreak. Keep this file updated as we add features, change infra, or introduce new operational practices.

> Goal: ship features fast with predictable safety nets (tests, migrations, backups). Optimize after features are live and validated.

---

## Principles

- Feature-first, optimization-later: prioritize delivering functionality and user value. Only optimize where performance or cost proves to be a bottleneck.
- Incremental and reversible: every change should be deployable and revertable with minimal risk (feature flags, small migrations, short TTLs for caches).
- Observability and automation: production must have metrics, logs, and alerts so we can iterate safely.
- Ownership and documentation: every production change must include a short runbook and an owner.

---

## High-level roadmap (priority order)

1. Core features (MVP scope)
   - Learning materials CRUD (upload, list, preview, delete) — already implemented in prototype form
   - Authentication/authorization (Supabase auth integration + role handling)
   - File downloads & signed URLs
   - Likes and basic social features (like/unlike, counts)
   - Searching + filters
2. Quality of life and reliability
   - Robust server-side validation and error handling
   - Tests: unit tests, integration tests for API endpoints
   - CI: build, lint, test on PRs
   - Database migrations and repeatable migration scripts
3. UX improvements (post-feature)
   - Client-side hybrid provider (already added) for smoother filtering and prefetching
   - Upload progress, resumable uploads (if needed)
4. Performance & scaling (only after usage surfaces issues)
   - Short server-side caching for list endpoints (10–30s TTL)
   - Redis or Memcached for shared cache across instances
   - CDN for static assets and signed URLs where appropriate
   - Move from PHP dev server to php-fpm + nginx for production
5. Production hardening
   - Centralized logging (e.g., Logflare / Papertrail / ELK)
   - Metrics + dashboards (Prometheus + Grafana or SaaS monitoring)
   - Alerts & runbooks for critical failures (5xx, Postgres errors, storage failures)

---

## Release & deployment workflow (recommended)

- Branching: feature branches off `main`/`develop`; PRs required for merge.
- CI: on PRs run: lint (TS + PHP), unit tests, type checks, build step for frontend.
- Staging: merge to `staging` branch and deploy to staging environment for QA.
- Production: create a release PR from staging -> production. Deploy during a maintenance window if migration needed.
- Rollout: use sanity checks and canary if deploying to many instances.

Commands (local, Docker)

- Restart services (dev):

```powershell
Set-Location 'C:\Users\admin\Desktop\StudyStreak'
# Stop and start docker stack
docker-compose -f docker/docker-compose.yml down --remove-orphans
docker-compose -f docker/docker-compose.yml up -d --build
# Tail logs (php-backend)
docker-compose -f docker/docker-compose.yml logs -f --tail=200 php-backend
```

- Frontend dev:

```powershell
Set-Location 'C:\Users\admin\Desktop\StudyStreak\studystreak'
npm ci
npm run dev
```

---

## Database changes & migrations

- Always write reversible migrations (up/down) and a short data-migration plan if you're transforming or dropping columns.
- For destructive operations (dropping columns), do:
  1. Add new canonical column and write code to populate it.
  2. Deploy code that reads/writes the canonical column only (backwards-compatible reads if necessary).
  3. Run data migration to copy values from legacy columns to canonical column.
  4. Verify for a few days with logs/metrics.
  5. Drop legacy columns in a later migration.

- Example we followed: canonicalizing `user_id` / `likes_count` and removing `created_by` / `like_count`.

Backup before any destructive migration

```powershell
# Example: create a dump (Postgres)
pg_dump -U <user> -h <host> -Fc -f learning_materials_backup_$(Get-Date -Format yyyyMMdd_HHmmss).dump <dbname>
```

---

## Composer & vendor management

- Do not edit generated files in `vendor/` or `vendor/composer` manually.
- To remove packages: edit `php-backend/composer.json`, remove the package from `require`, then run `composer install` (or `composer update <pkg>` where appropriate).
- If you see polyfill classes in `vendor/composer/autoload_classmap.php`, they are usually transitively required (e.g., `vlucas/phpdotenv` → `symfony/polyfill-*`). Use `composer why <package>` to trace.

---

## Frontend build & deployment

- Build production assets with `npm run build` inside `studystreak/` and deploy `dist/` to your static host (or serve via your backend).
- Use stable Node LTS and lockfiles; keep `package.json` and `package-lock.json` (or pnpm/yarn) in the repo.
- For faster dev UX, we use a hybrid provider pattern (see `MaterialsProvider.tsx`) that prefetches pages in background and falls back to server-side pagination.

---

## Observability & monitoring (must-have before scaling)

- Logs: Collect PHP backend logs and frontend server logs. Include correlation IDs in requests where possible.
- Metrics to track:
  - Request latency (p50/p95/p99) for `/api/learning-materials`
  - Error rate (4xx/5xx)
  - Storage errors and signed-url failures
  - Background prefetch success/failures
- Dashboards and alerts: set simple alerts for sustained 5xx > 1% or p95 latency > 1s.

---

## Runbooks & incident response

- Provide a short runbook for these events:
  - Backend returns 500 for /api/*: Check php-backend logs, then check PostgREST / Supabase health.
  - PostgREST 42703 (missing column): verify deployed code and database schema; check migrations and restart backend.
  - Storage errors: check Supabase storage status and signed-url generation.

Make sure each runbook has:
- Steps to diagnose
- Steps to mitigate (rollback/deploy hotfix)
- Owner contact (Slack / Pager)

---

## Performance optimization playbook (do this after features are validated)

1. Measure: add benchmarks and gather p50/p95 latency, DB explain plans for slow queries.
2. Cache: add short-lived server-side caches for list endpoints (10–30s), then iterate.
3. Indexes and query tuning: add DB indexes for filterable/sortable columns (e.g., created_at, likes_count).
4. Move to robust serving: php-fpm + nginx or container horizontally scaled with a load balancer.
5. CDN and edge caching for static assets and signed URLs.

---

## Security & secrets

- Keep secrets out of repo. Use environment files per environment and a secrets manager in production.
- Ensure `.env` is not committed. Use `php-backend/.env` locally and inject secrets via your orchestration in production.
- Rotate service keys if leaked and have a plan to reissue signed URLs.

---

## Release checklist (pre-deploy)

- [ ] Migrations checked and reversible
- [ ] Backups created for destructive ops
- [ ] Tests passing on CI
- [ ] Monitoring and alerting enabled for the release
- [ ] Runbook and owner assigned

---

## Rollback checklist

- [ ] Revert the PR/merge
- [ ] Redeploy previous tag
- [ ] If migration was destructive, restore from backup and follow data-restore runbook

---

## Notes & useful references

- Where to find key files:
  - Backend controller for learning materials: `php-backend/src/Controllers/LearningMaterialsController.php`
  - Frontend API helpers: `studystreak/src/Features/LearningMaterials/api.ts`
  - Hook & normalizer: `studystreak/src/Features/LearningMaterials/useLearningMaterialsQuery.ts`
  - Hybrid provider: `studystreak/src/Features/LearningMaterials/MaterialsProvider.tsx`
  - Docker compose: `docker/docker-compose.yml`


---

## Appendix — Practical decisions for the near future

- Implement a short server-side cache (10–30s) for `/api/learning-materials` (low risk, high impact).
- Keep the hybrid provider with a sensible cap (e.g., 500–1000 items). Tune after we observe real traffic.
- Do not optimize DB or infra until we have real metrics showing the bottleneck.


---

Maintainers: please update this file as processes or infra evolve.
