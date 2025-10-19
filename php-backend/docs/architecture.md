# StudyStreak PHP Backend — Architecture and Request Flow

This document explains how requests move through the PHP backend, how authentication is handled, and how the backend interacts with Supabase (REST + Storage). It also includes example curl commands and troubleshooting tips.

## Components

- `public/index.php` — single entrypoint/router. Receives HTTP requests and dispatches to controllers.
- `App\Http\Request` — lightweight request wrapper that normalizes headers, query and body and provides `getBearerToken()` and attribute storage for middleware to set data (e.g. authenticated user).
- `App\Middleware\AuthMiddleware` — validates the incoming bearer token using `SupabaseAuth` and, on success, sets `user` and `access_token` attributes on the `Request` object before calling the controller.
- Controllers (e.g. `LearningMaterialsController`) — perform business logic, call Supabase REST/Storage via Guzzle.
- `SupabaseConfig` — centralised env configuration (SUPABASE_URL, keys, bucket names, public base URL).

---

## End-to-end flow (example: listing materials)

1. Browser (frontend) issues a request (example):

```http
GET /api/learning-materials?filter=all HTTP/1.1
Host: localhost:8000
Authorization: Bearer <USER_JWT>
Accept: application/json
```

2. `public/index.php` constructs a `Request` object and matches the route `/api/learning-materials`. It uses `AuthMiddleware` to enforce authentication for that route.

3. `AuthMiddleware::handle($request, $next)`:
   - Extracts the bearer token with `$request->getBearerToken()` (reads `Authorization` header).
   - Calls `SupabaseAuth->validateToken($token)` which performs a request to Supabase Auth endpoint `/auth/v1/user` to validate the token and return user info.
   - On success, it sets `$request->setAttribute('user', $user)` and `$request->setAttribute('access_token', $token)` then calls the controller.

4. Controller (`LearningMaterialsController->index($authedRequest)`):
   - Reads query params with `$request->getQueryParams()`.
   - Builds a REST query and calls Supabase via Guzzle, for example:
     - `$this->client->request('GET', '/rest/v1/learning_materials', [ RequestOptions::HEADERS => $this->restHeaders($token), RequestOptions::QUERY => $query ])`
   - `Guzzle` will combine the path with the `base_uri` configured from `SupabaseConfig::getUrl()` to form the full URL: `${SUPABASE_URL}/rest/v1/learning_materials?...`.

5. Supabase returns JSON; controller transforms and returns the response to the browser.

---

## Upload flow (multipart)

1. Browser POSTs multipart/form-data to `/api/learning-materials/upload` with fields: `title`, `description`, `tags`, `is_public`, and file `file`.

2. Same auth middleware flow runs; controller receives the uploaded file in `$_FILES`.

3. Controller uploads raw file bytes to Supabase Storage via Guzzle to `${SUPABASE_URL}/storage/v1/object/<bucket>/<encoded-path>` with an `Authorization: Bearer <service-role-or-token>` header.

4. On successful upload, controller inserts metadata into `${SUPABASE_URL}/rest/v1/learning_materials` (POST) with the file URL and other metadata (title, tags, user_id).

5. Controller responds to frontend with created metadata (201 Created).

---

## How Auth works (tokens & headers)

- Frontend must send `Authorization: Bearer <user_jwt>` header for protected endpoints.
- `AuthMiddleware` extracts token with `$request->getBearerToken()` and calls `SupabaseAuth->validateToken()`.
- `SupabaseAuth` calls Supabase Auth endpoint (`${SUPABASE_URL}/auth/v1/user`) using Guzzle and returns an `AuthenticatedUser` instance if the token is valid.

Headers are simple key-value pairs sent with the HTTP request. Example header keys used by our backend when calling Supabase:

- `Authorization: Bearer <token>` — valid user JWT or service role key for server operations.
- `apikey: <anon-key>` — the public anon key often included for Supabase REST calls.
- `Accept: application/json` — request JSON responses.

---

## What is Guzzle?

Guzzle is a PHP HTTP client library that makes it convenient to issue HTTP requests (GET/POST/etc) and handle responses. We use it to call Supabase endpoints from the backend. The `Client` is typically configured with `base_uri` set to `SUPABASE_URL`, and controllers call relative paths like `/rest/v1/...` or `/storage/v1/...`.

---

## Examples (PowerShell)

Start PHP dev server:

```powershell
cd php-backend
Copy-Item .env.example .env
# edit .env to include SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
php -S localhost:8000 -t public
```

List materials (GET):

```powershell
curl -i -H "Authorization: Bearer <USER_JWT>" "http://localhost:8000/api/learning-materials?filter=all"
```

Upload a small file (POST multipart):

```powershell
curl -i -X POST "http://localhost:8000/api/learning-materials/upload" \
  -H "Authorization: Bearer <USER_JWT>" \
  -F "title=Smoke test" \
  -F "description=Upload test" \
  -F "file=@C:\path\to\file.txt;type=text/plain"
```

---

## Troubleshooting

- If requests return 401, verify the `Authorization` header contains a valid user JWT.
- If storage uploads fail, check `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET` are set and the service role key is being used for upload.
- Use the smoke test `php-backend/tests/learning_materials_smoke.php` to exercise the endpoints programmatically.

---

## Where to read more
- Supabase REST (PostgREST): https://supabase.com/docs/reference/postgrest
- Supabase Auth API: https://supabase.com/docs/reference/auth-api
- Supabase Storage API: https://supabase.com/docs/reference/storage
- Guzzle: https://docs.guzzlephp.org/
