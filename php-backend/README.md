## StudyStreak PHP backend

This service acts as a lightweight middleware in front of Supabase, proxying the StudyStreak API through a PHP layer so we can satisfy course requirements while keeping Supabase as the system of record.

### Environment variables

Create `.env` based on `.env.example` and fill in the following values:

- `SUPABASE_URL` – your Supabase project URL (e.g. `https://xyzcompany.supabase.co`).
- `SUPABASE_ANON_KEY` – anon/public API key (used for REST queries).
- `SUPABASE_SERVICE_ROLE_KEY` – optional service key for privileged server-side flows.
- `API_ALLOWED_ORIGINS` – comma-separated list of frontend origins permitted to call this API (e.g. `http://localhost:5173,https://app.example.com`).

For production, be sure to include the fully-qualified Vercel URL (and any custom domains) in `API_ALLOWED_ORIGINS` or requests will be rejected with `403 Origin not allowed`.

### Running with Docker (recommended)

```powershell
# from the repo root
Copy-Item php-backend/.env.example php-backend/.env
notepad php-backend/.env  # fill in the Supabase values

Set-Location docker
docker compose up --build
```

- PHP backend is exposed on <http://localhost:8080>.
- Context7 MCP server (for contract-driven development) is exposed on <http://localhost:8090>.
- Press `Ctrl+C` or run `docker compose down` when finished.

### Running without Docker (fallback)

```powershell
Set-Location php-backend
composer install
Copy-Item .env.example .env
notepad .env  # fill Supabase values
php -S 127.0.0.1:8080 -t public
```

### Endpoints

- `GET /api/todos?user_id=123`
- `POST /api/todos` (requires `Authorization: Bearer <user_jwt>`)
