StudyStreak — Project Status (Updated Oct 4, 2025)
=================================================

Snapshot
--------
- Study planner web app combining dashboard, pomodoro tracker, course tracking, and todo management.
- Frontend currently built in React + Vite, previously talking directly to Supabase; we are introducing a PHP middleware to broker data access.
- Supabase (PostgreSQL) remains the system of record for data and authentication; PHP will forward-select requests to Supabase and expose a REST contract to the frontend.
- Active initiative: migrate feature data flows (todos, pomodoro sessions, profile) to communicate through the PHP backend instead of direct Supabase calls.

Tech Stack
----------
**Frontend**
- React 19 with React Router 7
- TypeScript, Tailwind CSS, Framer Motion
- Vite tooling with PWA support via `vite-plugin-pwa`
- Supabase JS client used today for auth/session management; data access will transition to PHP API

**Backend API (new PHP middleware)**
- PHP 8.2, autoloaded via Composer (`App\` namespace)
- Guzzle HTTP client for outbound Supabase requests
- `vlucas/phpdotenv` for environment management
- Planned additions: lightweight router, auth middleware, central `SupabaseService`, Monolog
- Served through PHP built-in server in dev (`php -S`) or Docker (preferred)

**Database & Auth**
- Supabase project (`puhxawljwuszjflusxve.supabase.co`) leveraging PostgreSQL with Row Level Security
- Auth handled via Supabase Auth JWTs; frontend obtains tokens, backend validates via `/auth/v1/user`
- Tables in play: `profiles`, `todos`, `studysession` (naming TBD)

Tooling & DevOps
----------------
- Docker Compose (in `docker/`) defines the PHP backend and a Context7 MCP helper service
- Node scripts: `npm run dev`, `npm run build`, `npm run lint`
- Composer for PHP dependencies; PHPUnit/PHPCS planned but not yet set up
- OpenAPI contract for backend lives in `php-backend/docs/openapi.yaml`

Repository Layout
-----------------
- `studystreak/`: React frontend (source under `src/`)
- `php-backend/`: PHP middleware, `.env` config, public entrypoint, controllers
- `docker/`: shared Docker Compose configuration
- `todo/`: working notes (`todo.md` roadmap, `status.md` this file)

Configuration & Environments
----------------------------
- Frontend env file: `studystreak/.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and (soon) `VITE_API_BASE_URL`
- Backend env file: `php-backend/.env` with Supabase URL, anon key, and service-role key (keep out of version control)
- CORS currently allows `http://localhost:5173`; needs env-driven list for prod
- Deployment target TBD; Docker image ready (`php-backend/Dockerfile`)

Local Run Reference
-------------------
1. Copy env templates and fill secrets:
	- `Copy-Item php-backend/.env.example php-backend/.env`
	- `Copy-Item studystreak/.env.local studystreak/.env.local` (already populated for dev)
2. Preferred: `Set-Location docker` then `docker compose up --build`
	- Backend available at `http://localhost:8080`
	- Frontend runs separately via `npm run dev` (port 5173)
3. Non-Docker backend: `Set-Location php-backend`, `composer install`, `php -S 127.0.0.1:8080 -t public`

Current Focus & Next Steps
--------------------------
- Build shared PHP infrastructure (config, router, auth middleware) and refactor `/api/todos` to use it.
- Expand backend endpoints for pomodoro sessions and profiles; document in OpenAPI.
- Introduce `apiClient` in the frontend to hit the PHP API with Supabase JWTs; migrate features off direct Supabase writes.
- Harden security (remove real keys from repo, enforce env-based CORS, add logging & tests).
- Detailed migration checklist lives in `todo/todo.md`.

Risks & Notes
-------------
- Real Supabase anon/service-role keys are currently committed in `.env`; rotate and keep secrets local only.
- PHP backend lacks automated tests; add PHPUnit once controllers are refactored.
- Ensure Supabase Row Level Security policies align with backend-issued tokens before going live.

Contact / Ownership
-------------------
- Primary workspace: `c:\Users\admin\Desktop\StudyStreak`
- Branch in use: `Start-PHP`
- For help, refer to project roadmap (`todo/todo.md`) or ping AI assistant with latest status.
