StudyStreak — Project Status (Updated Oct 5, 2025)
=================================================

*StudyStreak: A Progressive Web Application Designed to Support Focus, Motivation, and Progress Monitoring in Self-Directed Learning*

Snapshot
--------
- Study planner PWA combining dashboard, pomodoro tracker, course tracking, and todo management for self-directed learners.
- Frontend (React + Vite) now signs up and authenticates users by calling the PHP backend API, which in turn orchestrates Supabase access.
- Supabase (PostgreSQL) remains the source of truth for data and auth; the PHP middleware validates tokens, performs data operations, and returns structured responses to the frontend.
- Active initiative: complete the migration of todos, pomodoro sessions, and profile features so every read/write follows the frontend → backend → Supabase → backend → frontend contract.

Architecture Flow
-----------------
1. **Frontend** gathers user input and issues requests through the shared `apiClient`, attaching Supabase JWTs.
2. **PHP Backend** authenticates the request, maps it onto Supabase REST/RPC calls, and applies business logic.
3. **Supabase** stores data and enforces Row Level Security; responses travel back to the backend.
4. **Backend** normalizes responses (or errors) and returns them to the frontend.
5. **Frontend** updates UI state based on the backend response, keeping Supabase credentials confined to the middleware layer.

Objectives
----------
StudyStreak aims to motivate students and self-learners to build consistent study habits through gamification and progress monitoring. The system will:

a. Empower administrators to curate, publish, and maintain structured learning materials and course roadmaps through the maintenance workspace.

b. Deliver learning content and practice quizzes to learners via an intuitive instructional module.

c. Track study routines and engagement signals through a dedicated tracking module that reflects streaks and activity trends.

d. Spark motivation with milestones, badges, and achievements surfaced by the rewards module.

e. Prompt users with timely nudges from the notification module to reduce procrastination and sustain focus.

f. Produce detailed progress reports and actionable feedback through the reporting module.

g. Support focused study sessions using a built-in Pomodoro timer and gamified focus tools within the engagement module.

Tech Stack
----------
**Frontend**
- React 19 with React Router 7
- TypeScript, Tailwind CSS, Framer Motion
- Vite tooling with PWA support via `vite-plugin-pwa`
- Supabase JS client retained for session management; all server mutations (signup, forthcoming data CRUD) are routed through the shared `apiClient` to the PHP API

**Backend API (PHP middleware)**
- PHP 8.2, autoloaded via Composer (`App\` namespace)
- Guzzle HTTP client for outbound Supabase requests
- `vlucas/phpdotenv` for environment management
- In place: auth controller handling signup/signin, Supabase validator, JSON responder; next up are shared router/utilities, error logging, and feature-specific controllers
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
- Frontend env template: `studystreak/.env.example`; copy to `studystreak/.env.local` and populate `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL`
- Backend env file: `php-backend/.env` with Supabase URL, anon key, and service-role key (keep out of version control)
- CORS currently allows `http://localhost:5173`; needs env-driven list for prod
- Deployment target TBD; Docker image ready (`php-backend/Dockerfile`)

Local Run Reference
-------------------
1. Copy env templates and fill secrets:
	- `Copy-Item php-backend/.env.example php-backend/.env`
	- `Copy-Item studystreak/.env.example studystreak/.env.local`
2. Preferred: `Set-Location docker` then `docker compose up --build`
	- Backend available at `http://localhost:8080`
	- Frontend runs separately via `npm run dev` (port 5173)
3. Non-Docker backend: `Set-Location php-backend`, `composer install`, `php -S 127.0.0.1:8080 -t public`

Current Focus & Next Steps
--------------------------
- Build shared PHP infrastructure (config, router, auth middleware) and refactor `/api/todos` to use it.
- Expand backend endpoints for pomodoro sessions and profiles; document in OpenAPI.
- Finish migrating frontend features to use `apiClient` calls into the PHP API instead of direct Supabase writes.
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
- Primary branch in use: `main`
- For help, refer to project roadmap (`todo/todo.md`) or ping AI assistant with latest status.
