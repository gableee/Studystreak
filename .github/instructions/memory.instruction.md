---
applyTo: '**'
---

# User Memory

## User Preferences
- Programming languages: TypeScript, JavaScript, PHP
- Code style preferences: follow existing project conventions
- Development environment: VS Code on Windows, PowerShell
- Communication style: concise, actionable

## Project Context
- Current project: StudyStreak (web app + PHP backend)
- Tech stack: React + Vite (frontend), PHP backend (php-backend), Docker-based dev
- Key files: studystreak/src (frontend), php-backend/src (backend), docker/*

## Coding Patterns
- Uses React hooks, custom pub/sub for gamification profile updates
- Env var for backend: VITE_API_BASE_URL

## Context7 Research History
- 2025-10-14: Tailwind CSS docs (/tailwindlabs/tailwindcss.com) — design tokens, container queries, responsive design best practices, dark-mode handling, theme definition with @theme.
- 2025-10-15: Tailwind CSS docs (/tailwindlabs/tailwindcss.com) — component layering patterns for reusable cards, badges, and gradients to maintain consistent glass surfaces.
- 2025-10-16: Tailwind CSS docs (/tailwindlabs/tailwindcss.com) — confirmed component-layer overrides and dark-mode glass treatments for card layouts; Lucide docs (/lucide-icons/lucide) — React usage patterns, accessibility guidance, and dynamic icon loading cautions.
- 2025-10-17: Tailwind CSS docs (/tailwindlabs/tailwindcss.com) — backdrop filter utilities (blur, opacity, contrast, hue rotation) for glass panels used in analytics and profile redesigns.
- 2025-10-23: Supabase docs (/supabase/supabase) — `createSignedUrl` yields `data.signedUrl` which may already be absolute; temporary URLs govern private asset access durations.
- 2025-10-24: Supabase docs (/supabase/supabase) — reviewed storage signed URL creation patterns and expiry considerations for embedding private PDFs.

## Conversation History
- Renamed Pomodoro -> FocusSession and related routes
- Restored floating modal behavior to recognize both old and new routes
- Fixed gamification activation to fetch profile if activation response lacks profile
- Investigating why gamification shows on Vercel but not on localhost
- Renamed Progress & Achievements feature to Progress & Analytics and added Achievements & Rewards feature/route/sidebar entry

## Recent Findings
- The frontend reads the backend base URL from VITE_API_BASE_URL (studystreak/.env.local).
- `studystreak/.env.local` currently sets VITE_API_BASE_URL=http://localhost:8181 which is used by the running dev server (Vite) as the API base.
- `studystreak/src/lib/apiClient.ts` will fall back to http://localhost:8181 when VITE_API_BASE_URL is not present or empty in development mode.
- The likely causes for gamification data appearing on Vercel but not locally are:
	- Local backend is not running at the URL configured in `VITE_API_BASE_URL` (http://localhost:8181), so requests fail.
	- CORS or authentication differences between the deployed backend and local environment.
	- Environment variables in the dev server not matching production configuration.

## Next Steps Performed
- Verified Vite dev server is running and picked up changes; Vite reported .env.local change and restarted.
- Located gamification endpoints in `src/Features/Gamification/services/gamificationService.ts` (`/api/gamification/profile` and `/api/gamification/streak/activate`).
- Confirmed `apiClient.baseUrl` resolves to VITE_API_BASE_URL (or falls back to http://localhost:8181 in dev).

## Local Backend Check
- Performed an HTTP request to http://localhost:8181/api/gamification/profile and received a 403 Forbidden response in PowerShell.
- This indicates the endpoint requires authentication and that unauthenticated requests from the browser or PowerShell are not allowed.
- Possible explanations for discrepancy between Vercel and localhost:
	- On Vercel the frontend points to a public/proxy backend endpoint with additional headers or a different auth flow (e.g. session token present via cookie), while locally the Supabase session may not be present or the local backend expects different auth configuration.
	- The deployed backend may have a different CORS policy or allowlist compared to the local dev backend.

## Suggested Local Checks (what I will recommend to run locally)
1. Ensure your local backend is running (php-backend) at the URL configured in `VITE_API_BASE_URL` (http://localhost:8181). Use `docker-compose up` if you run the backend in Docker, or start the PHP built-in server according to `php-backend/README.md`.
2. In the frontend dev site, open the browser DevTools Network tab and observe the request to `/api/gamification/profile` when the app loads; check the Authorization header and response status/body.
3. Confirm your Supabase auth session exists in the browser (open console and check `window.supabase` if running in dev). The frontend relies on Supabase to provide an access token for API requests.
4. If you see 403 responses, verify that the backend recognizes the Supabase token being sent by the frontend. There may be differences in env or local backend setup that cause token validation to fail.

## Notes
- Local env file: studystreak/.env.local should contain VITE_API_BASE_URL
- Typical causes for prod vs local differences: env var mismatch, backend not running, CORS, auth tokens
- 2025-10-14 Research Notes:
	- NN/g “Inclusive Design” stresses legible typography, high contrast, flexible inputs for names/demographics, and optional dark mode for older users.
	- Microsoft Inclusive Design principles: recognize exclusion, learn from diversity, solve for one extend to many; provide resources for cognition-focused tooling.

## Current Task Progress
- Objective: Redesign key StudyStreak feature pages with a universal, iOS-inspired UI/UX informed by up-to-date research.
- Status: Glass/tile utilities live (src/Application/index.css); Dashboard redesigned with inclusive stats and quick actions; My Study Plan refactored with inclusive task matrix, schedule radar, and reminders; Learning Materials rebuilt with ASCII-only metadata and passing lint; Achievements & Rewards, Progress Analytics, and Profile pages now redesigned with glass panels, deterministic demo data, and inclusive copy.

## Learning Materials Prefetch Implementation

- Implemented a centralized materials cache/provider to fetch all learning materials once at startup and prefetch signed URLs in the background.
- Key files added/changed:
	- src/Features/LearningMaterials/types.ts — shared types (LearningMaterial, CachedLearningMaterial, SignedUrlResponse, SectionKey)
	- src/Features/LearningMaterials/contexts/MaterialsContext.tsx — MaterialsProvider with fetchAllMaterials(), prefetchSignedUrls(), applyMaterialUpdate(), refreshMaterials().
	- src/Features/LearningMaterials/components/MaterialsList.tsx — now consumes useMaterials(), prefers cached resolved_url, persists newly-resolved signed URLs, client-side filtering, updated responsive grid.
	- src/Features/LearningMaterials/components/MaterialPreviewModal.tsx — accepts CachedLearningMaterial, resolves signed URLs when needed and calls back via onResolvedUrl to persist them; modal constrained for responsiveness and inner content is scrollable.
	- src/Application/index.css — added .size-full helper (Tailwind @apply) to help embedded media behave responsively.

- Behavior summary:
	- The provider fetches all records once and triggers background signed URL resolution for items missing file_url.
	- Components read resolved_url from the shared cache and update counts (likes/downloads) through applyMaterialUpdate so UI updates come from the cache.
	- Refresh behavior: explicit user action (Refresh button) calls refreshMaterials() to re-fetch all data and re-trigger prefetching.

- Status: Implementation complete and wired into the Learning Materials route; responsive grid and modal sizing fixes applied; production build succeeded locally. Manual cross-device QA remains as a next step.

