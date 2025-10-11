# Deployment Guide

This document walks through everything needed to ship the StudyStreak PHP backend to Render and hook it up to the Vercel frontend. Follow it in order the first time, then keep it around as a checklist for future releases.

---

## 0. Prerequisites

- A GitHub repo with the latest backend code pushed to `main`.
- A Render account with GitHub access enabled (<https://render.com/>).
- Supabase project credentials:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- Known frontend origins (Vercel preview + production domains, any custom domains, and local dev `http://localhost:5173`).

---

## 1. Pre-deploy checklist (do this locally first)

1. **Update `.env` (local reference file)** – verify `API_ALLOWED_ORIGINS` contains every frontend origin you plan to support, for example:
   ```bash
   API_ALLOWED_ORIGINS=http://localhost:5173,https://study-streak.vercel.app,https://app.yourdomain.com
   ```
2. **Run backend tests/build locally** (optional but recommended):
   ```powershell
   cd php-backend
   composer install
   php -S 127.0.0.1:8080 -t public
   ```
   Hit <http://127.0.0.1:8080/health> to confirm the health endpoint responds with `{ "status": "ok" }`.
3. **Commit & push** any code/config changes so Render can pull from GitHub.

---

## 2. Deploy the backend to Render (Docker-based Web Service)

1. Sign in to Render and click **New → Web Service**.
2. Choose **Build & deploy from a Git repository** → authorize access if prompted → pick the `Studystreak` repo.
3. Configure the service:
   - **Name:** `studystreak-backend` (or any unique name).
   - **Region:** pick the closest to your users (e.g., `Oregon` or `Frankfurt`).
   - **Branch:** `main`.
   - **Root Directory:** `php-backend` (important so Render finds the backend code).
   - **Runtime:** Render auto-detects the Dockerfile located in `php-backend/Dockerfile`; leave it on **Docker**.
   - **Instance Type:** start with the free tier or `Starter` plan depending on traffic requirements.
4. Click **Advanced → Add Environment Variables** and enter the values from the next section before first deploy.
5. Press **Create Web Service**. Render will build the image using the Dockerfile and start the container listening on port `8080` (already exposed in the Dockerfile).

---

## 3. Environment variables on Render

In the **Environment** panel for the service, add the following key/value pairs:

| Key | Value | Notes |
| --- | ----- | ----- |
| `SUPABASE_URL` | `https://<your-project>.supabase.co` | Same as local |
| `SUPABASE_ANON_KEY` | `<anon key>` | Safe to expose to the backend |
| `SUPABASE_SERVICE_ROLE_KEY` | `<service role key>` | **Never** put this in the frontend |
| `API_ALLOWED_ORIGINS` | `http://localhost:5173,https://study-streak.vercel.app,https://app.yourdomain.com` | Include every frontend origin |

Tips:
- You can add/update env vars at any time; Render will prompt you to redeploy for changes to take effect.
- Keep the service-role key secret—only the backend needs it.

---

## 4. First deploy & verification

1. Wait for Render to finish the initial build. Watch the **Events** tab; you should see `Deploy succeeded`.
2. Note the generated HTTPS URL (e.g., `https://studystreak-backend.onrender.com`).
3. Hit the health endpoint from your terminal to confirm the service is up:
   ```powershell
   Invoke-RestMethod https://studystreak-backend.onrender.com/health
   ```
   Expected output: `{ status = ok, routes = [/api/todos] }`.
4. If you receive a `403 Origin not allowed`, double-check `API_ALLOWED_ORIGINS` and redeploy.

---

## 5. Connect the frontend (Vercel)

1. In Vercel, open the corresponding project → **Settings → Environment Variables**.
2. Add or update the following variables in all environments (Production, Preview, Development):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` = the Render URL from step 4 (or your custom domain once added).
3. Trigger a redeploy (e.g., by clicking **Deploy** in Vercel or pushing a trivial commit) so the build picks up the new values.
4. After the deploy finishes, open the Production site and verify in DevTools → Network tab that API calls target the Render URL and return `200`.

---

## 6. Post-deploy housekeeping

- **Auto-deploys:** By default, Render will redeploy on every push to the watched branch. Disable auto-deploys if you want manual control.
- **Logs:** Use the Render **Logs** tab for debugging—filter by `stdout`/`stderr`.
- **Custom domains:** Add any custom domain in Render, issue TLS cert, and update `VITE_API_BASE_URL` + `API_ALLOWED_ORIGINS` accordingly.
- **Monitoring:** Configure uptime checks against `/health` so you catch regressions early.
- **Rollbacks:** Render keeps the last successful build; use the **Rollback** button if a deploy misbehaves.

---

## 7. Day-two operations

- When backend code changes, push to `main` → Render redeploys automatically.
- When environment values change (new Supabase keys, new frontend domains), update both Render and Vercel, then redeploy both sides.
- Periodically review Render usage to ensure you stay within free-tier limits or upgrade the instance size if traffic increases.

With this checklist completed, the backend will be publicly reachable over HTTPS, and the Vercel frontend can consume it through `VITE_API_BASE_URL` without hitting CORS issues.
