Got it—here’s how I’d tackle PHP authentication so the frontend can keep handling Supabase sign-in while the backend safely gates data access.

🧭 What already works
The React app (Auth) uses @supabase/supabase-js for sign-in/sign-out, session storage, and exposes the current user via context. Keep all user flows there; Supabase handles email/password, OAuth, resets, etc.

SupabaseAuth.php hits /auth/v1/user with the bearer token to validate it, but it’s isolated. There’s no middleware yet to enforce auth before controllers run.

🔧 What needs attention on the PHP side
Environment setup

Ensure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY live in .env (not committed).
Add these to a config object instead of reading $_ENV everywhere.
Token validation service

Expand SupabaseAuth so it injects the anon key header (apikey) along with the bearer token.
Optional but recommended: use firebase/php-jwt to decode/verify the JWT locally using Supabase’s JWKS, with a fallback to the /auth/v1/user call. Cache JWKS to avoid round-trips.
Return a value object (e.g., AuthenticatedUser) with id, email, roles, etc.
Auth middleware

Build an AuthMiddleware that runs before controllers:
Extract bearer token (Authorization: Bearer ...).
Use SupabaseAuth to validate it.
On success, attach the user info to a request context; on failure, return 401 with a consistent JSON error.
Allow routes to specify whether auth is required (GET todos should be user-scoped, so require it).
Request context utilities

Define a Request object that holds the parsed body, query params, and authenticatedUser.
Controllers receive this instead of raw superglobals.
Frontend ↔ backend contract

Frontend keeps the Supabase session; whenever it calls PHP endpoints, it includes the access token:
If 401 is returned, frontend triggers supabase.auth.refreshSession() or signs the user out.
Refresh considerations

You don’t need to handle refresh tokens on PHP; the frontend keeps the session fresh.
Just make sure the frontend retries once with a refreshed token before forcing re-login.
🧱 Implementation sequence
Create shared infrastructure

App\Config\SupabaseConfig (reads env, exposes URLs/keys, allowed origins).
App\Http\Request, App\Http\Response, App\Http\JsonResponder.
App\Middleware\AuthMiddleware.
Upgrade SupabaseAuth

Constructor accepts config (URL, keys, timeout).
Add methods:
validateToken(string $jwt): ?AuthenticatedUser
getUserFromToken() (calls Supabase) – keep httpErrors=false, include anon key, better error logging.
Optional: fetchJwks() to verify offline.
Wire middleware into router

Keep basic router for now but wrap /api/todos with auth middleware.
Controllers use AuthenticatedUser (e.g., user->getId()) to filter queries.
Frontend adjustments

Build apiClient.ts that automatically attaches tokens and handles 401 retry.
Replace direct Supabase reads/writes (Todos, Pomodoro, Profile) with PHP API calls.
Testing

Add PHPUnit tests mocking GuzzleHttp\Client to simulate /auth/v1/user responses.
On the frontend, add integration tests for the API client to ensure token handling works.
🤔 Do we need to move login to PHP?
No—leave all sign-in/out/password flows in the frontend. Supabase Auth is designed to be used from the browser and handles email links, OAuth redirects, etc. The PHP backend only needs to verify the provided JWT and ensure data operations are performed on behalf of that authenticated user.

✅ Summary of changes to implement
Backend

Add config + middleware infrastructure.
Enhance SupabaseAuth with apikey header, structured responses, optional JWT verification.
Insert auth middleware before data controllers.
Update controllers to rely on AuthenticatedUser.
Frontend

Continue using supabase.auth for login/session.
Send the access token in Authorization when calling PHP.
Handle 401 by refreshing or signing out.

Auth checklist — work one-by-one and mark each item when complete

Use this file to track progress on the PHP auth migration. Start with the first item. When you finish an item, check the box and notify me and I'll continue to the next patch or review the change.

- [x] 1) Add `App\Config\SupabaseConfig`
	- Purpose: Read and validate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and allowed CORS origins from `.env`.
	- Acceptance: Config object returns base_url, anon_key, service_role_key, and allowed_origins; fails fast if required values are missing in dev.

- [x] 2) Add HTTP helpers: `App\Http\Request`, `App\Http\Response`, `App\Http\JsonResponder`
	- Purpose: Normalize request parsing and JSON responses for controllers and middleware.
	- Acceptance: Controllers receive a Request object and use JsonResponder for output.

- [x] 3) Enhance `SupabaseAuth` (server-side token validation)
	- Purpose: Validate incoming Supabase access tokens reliably.
	- Tasks: include `apikey` header in calls to `/auth/v1/user`, return an `AuthenticatedUser` value object with `id/email/metadata`, optionally implement JWKS fetch & local JWT verification (cached).
	- Acceptance: `validateToken(string $jwt): ?AuthenticatedUser` present and tested.

- [x] 4) Create `App\Middleware\AuthMiddleware`
	- Purpose: Extract bearer token, call `SupabaseAuth`, attach user to request context, return 401 on failure.
	- Acceptance: Middleware can be applied to routes and controllers receive `authenticatedUser`.

- [x] 5) Wire middleware into router and refactor controllers
	- Purpose: Replace direct superglobal use in `public/index.php` and controllers; enforce auth for user-scoped endpoints.
	- Acceptance: `TodoController::index` and `create` require auth and receive user id from context to filter/insert rows.

- [ ] 6) Frontend API client (`studystreak/src/lib/apiClient.ts`)
	- Purpose: Attach Supabase access token automatically to requests and handle 401 refresh/retry logic.
	- Acceptance: Frontend calls backend endpoints using `apiClient` and includes fresh tokens.

- [ ] 7) Tests: PHPUnit for backend, frontend integration tests for apiClient
	- Purpose: Prevent regressions and validate token validation/policy flows.
	- Acceptance: Basic PHPUnit tests covering `SupabaseAuth::validateToken` and `TodoController` auth enforcement.

- [ ] 8) OpenAPI & docs update
	- Purpose: Document auth requirements and new endpoints in `php-backend/docs/openapi.yaml` and update README.
	- Acceptance: OpenAPI references `bearerAuth` and endpoints reflect required auth.

- [ ] 9) Secrets & security sweep
	- Purpose: Rotate keys if committed, remove secrets from VCS, ensure `.env` is ignored, provide guidance for deployment secret storage.
	- Acceptance: No secrets in repo; documented instructions for storing secrets.

Notes
-----
- Start with item 1; mark it done here and also tell me so I can implement or review the next change.
- I will update the global managed todo list to reflect this checklist and mark item 1 as `in-progress` until you tell me it is complete.

How to mark done
----------------
- Edit this file and change `[ ]` to `[x]` for the completed step, then commit.
- Or tell me to mark it done and I will update both this file and the managed todo list.

If you want, I can implement item 1 now and push the change; otherwise mark it as you finish it and I'll validate.