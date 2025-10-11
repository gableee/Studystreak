# StudyStreak Frontend

This Vite + React application talks to the PHP middleware via a configurable base URL so the compiled bundle can target different environments without rebuilds.

## Environment variables

Create a `.env.local` (or copy from `.env.example`) and set the following values:

- `VITE_SUPABASE_URL` – Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` – Supabase anon key used by the client SDK.
- `VITE_API_BASE_URL` – **Required in production.** Set this to `https://studystreak-backend.onrender.com` (or your custom domain once you add one). Use `http://localhost:8080` only when running the PHP backend locally.

During local development the frontend falls back to `http://localhost:8080` if `VITE_API_BASE_URL` is omitted, but production builds will now throw on startup when the value is missing.

## Deploying to Vercel

1. Open your Vercel project → **Settings → Environment Variables**.
2. Add the three variables above for each environment (`Production`, `Preview`, `Development`).
3. For `VITE_API_BASE_URL`, paste `https://studystreak-backend.onrender.com` (or your future custom domain pointing to the Render service).
4. Trigger a redeploy so the build picks up the new values.

## Coordinating with the PHP backend

1. On the backend host, set `API_ALLOWED_ORIGINS` (comma-separated) to include:
   - `http://localhost:5173` for local Vite dev.
   - Each deployed frontend origin, such as `https://studystreak.vercel.app` and any custom domains.
2. Restart the backend service or reload its environment so the updated allowlist is applied.
3. Once deployed, verify the integration by signing in and observing network requests to the backend returning `200` rather than `403` or attempts to call `http://localhost:8080`.

Keeping the frontend variable and backend allowlist synchronized prevents the blank screen seen when production builds try to reach a localhost API or when CORS blocks the request.
