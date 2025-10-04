StudyStreak — PHP backend migration plan

Overview

We are adding a PHP backend that proxies selected Supabase operations and acts as a server-side API for the React frontend. This document summarizes the audit and provides a step-by-step roadmap to move from direct Supabase usage in the browser to a secure PHP middleware.

Quick status

- Backend skeleton exists in `php-backend/` with Composer dependencies:
  - `guzzlehttp/guzzle`, `vlucas/phpdotenv`, `firebase/php-jwt`
- Current public entry: `php-backend/public/index.php` with a basic `/api/todos` route
- Frontend (React + Vite) still talks directly to Supabase via `@supabase/supabase-js`

Goals

1. Securely proxy Supabase reads/writes through PHP where appropriate.
2. Reduce exposure of privileged operations from client-side code.
3. Keep client responsibility for authentication flows (login/sign-up) using Supabase auth, but use the JWT to call PHP endpoints.
4. Provide a minimal, well-documented API for the frontend (todos, pomodoro sessions, profile).

Prioritized roadmap (concrete steps)

1) Shared setup / safety
- Rotate keys / keep only placeholders in repo; store real keys in `.env` (local) and secrets store in CI
- Confirm deployment target for PHP (Docker-based suggested)

2) Backend foundation
- Add config class to read/validate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, allowed CORS origins
- Add small middleware layer for auth and JSON responses
- Wrap common Guzzle logic in a `SupabaseService` so controllers don't duplicate headers/keys logic
- Replace hard-coded CORS origin in `public/index.php` with env-driven list

3) Endpoints to implement
- Todos: `GET /api/todos?user_id=...` (user-scoped), `POST /api/todos` (authenticated)
- Pomodoro sessions: `POST /api/pomodoro/sessions`, `GET /api/pomodoro/sessions`
- Profile: `GET /api/profile`, `PATCH /api/profile`
- Optionally: `GET /api/session` to bootstrap user info to the frontend

4) Frontend changes (small, incremental)
- Add `VITE_API_BASE_URL` and create `src/lib/apiClient.ts` that attaches the user's JWT to requests
- Replace direct `supabase.from(...).insert()` calls with `apiClient.post('/api/pomodoro/sessions')` etc.
- Keep auth flows in the client (sign-in/sign-up) but call backend for data protections and server-role operations

5) Policies & data
- Review Supabase RLS: ensure authenticated user tokens can insert/select rows as intended; use service-role key server-side for privileged tasks only
- Add minimal migrations/seeds for testing

6) Tests & docs
- Add PHPUnit tests for the PHP controllers (mock Supabase responses)
- Update `docs/openapi.yaml` with new endpoints
- Update README with developer instructions (how to run backend, dev env variables)

Verification

- Local smoke test: `docker compose up --build` then confirm `http://localhost:8080/api/todos` responds and React can call `http://localhost:8080` as `VITE_API_BASE_URL`
- Run `composer install` and `npm run dev` for quick verification

Notes / helpful links

- Frontend files that currently interact with Supabase directly and will need refactors:
  - `studystreak/src/lib/supabaseClient.ts`
  - `studystreak/src/Features/Pomodoro/Pomodoro.tsx` (inserts session data)
  - `studystreak/src/Auth/services/profileService.ts`

Next actions (pick one to start)

- Implement a small `SupabaseService` and move `/api/todos` into a controller that uses it (fast win)
- Or: Add `apiClient.ts` to the frontend and wire `Pomodoro` session POST to the PHP `POST /api/pomodoro/sessions` (if you prefer front-first)

If you want, I can start by implementing the server-side plumbing for `SupabaseService`, auth middleware, and a cleaner `TodoController` — and then update the OpenAPI and frontend `apiClient`. Tell me which starter you prefer and I will implement it next (and run tests).
