# NeuroSecure — Setup Guide

AI-powered browser privacy protection. This monorepo contains:

- `backend/` — Node.js + Express + TypeScript API (Supabase + Prisma + Nodemailer)
- `extension/` — Plasmo + React + TypeScript Chrome extension (face-api.js)
- `scripts/` — Helper scripts (face model downloader)

System requirements:
- **Node.js 20.x** locally (aligned with backend `engines`; Vercel uses 20.x for production API)
- **npm** (no pnpm/yarn)
- **Windows 11** (all scripts use `cross-env` and `rimraf` — fully cross-platform)
- A Supabase project (free tier is fine)
- A Gmail account with an **App Password** for SMTP

---

## 1. Install all dependencies

From the project root (`neurosecure/`):

```bash
npm run install:all
```

This installs:
- root dev dependencies (rimraf)
- backend dependencies
- extension dependencies

---

## 2. Download face-api.js models

```bash
npm run download-models
```

The models are saved into `extension/public/models/` and will be bundled
with the extension build. Required files:

- `ssd_mobilenetv1_model-weights_manifest.json` + shards
- `face_landmark_68_model-weights_manifest.json` + shard
- `face_recognition_model-weights_manifest.json` + shards

---

## 3. Configure environment variables

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
GMAIL_USER=neurohireofficial@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
ALERT_EMAIL=neurohireofficial@gmail.com
```

> Create a Gmail **App Password** at: https://myaccount.google.com/apppasswords

### Extension (`extension/.env`)

```env
PLASMO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PLASMO_PUBLIC_SUPABASE_ANON_KEY=...
PLASMO_PUBLIC_BACKEND_URL=http://localhost:3000
```

---

## 4. Set up the database (Prisma + Supabase)

```bash
cd backend
npx prisma generate
npm run prisma:push
cd ..
```

`prisma:push` is a non-interactive `prisma db push` that mirrors the
`schema.prisma` file straight onto your Supabase Postgres — perfect for
the first run because it does not need a TTY. It creates the `users`
and `alerts` tables.

If you prefer migration files instead (recommended once you go to
production), run `npx prisma migrate dev --name init` from `backend/`.

> 🛟 **Stuck on "user already registered"?** That happens when an old
> Supabase auth user exists but the matching row in `users` was never
> created (usually because this step was skipped on the first attempt).
> Wipe both sides cleanly and try again:
>
> ```bash
> cd backend
> npm run user:delete -- you@example.com
> cd ..
> ```

---

## 5. Start the backend (dev mode)

```bash
cd backend
npm run dev
```

The API listens on `http://localhost:3000`. Health check:

```
GET http://localhost:3000/health
```

---

## 6. Build / run the extension

For development with hot reload:

```bash
cd extension
npm run dev
```

> Once Plasmo has created `build/chrome-mv3-dev/`, open another terminal and run
> `npm run copy:public` inside `extension/` so that the face-api.js models
> (in `public/models/`) are available to the running extension.

For a production build (this auto-copies `public/` for you):

```bash
cd extension
npm run build
```

---

## 7. Load the extension into Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select **`extension/build/chrome-mv3-prod`** (this is the folder you get
   after `npm run build` in the `extension/` folder — **always reload from
   here after a rebuild**).

> ℹ️ **About the camera prompt:** The Chrome extension popup window closes
> whenever it loses focus, so the camera permission prompt would dismiss it
> immediately. NeuroSecure detects this and routes you to the options page
> (a regular browser tab) for enrollment, where the prompt works as expected.

### What to do after every change

| Type of change | Restart steps |
| --- | --- |
| Backend code (`backend/src/**`) | The `npm run dev` task watches and reloads automatically. If it crashed, run `npm run dev` again from `backend/`. |
| Backend `.env` or Prisma schema | Stop and restart `npm run dev` in `backend/`. After schema changes also run `npm run prisma:push`. |
| Extension code (`extension/src/**`) | `cd extension && npm run build`, then click the **Reload** button on the NeuroSecure card in `chrome://extensions`. |
| Static assets in `extension/public/` (e.g. logo, models) | `cd extension && npm run build`, then **Reload** the extension. |

---

## Useful npm scripts (root)

| Script | Purpose |
| --- | --- |
| `npm run install:all` | install root + backend + extension deps |
| `npm run download-models` | fetch face-api.js model weights |
| `npm run dev:backend` | start backend in dev mode |
| `npm run dev:extension` | start extension in dev mode |
| `npm run build:backend` | compile backend TS → dist |
| `npm run build:extension` | build extension into `build/` |
| `npm run prisma:generate` | regenerate Prisma client |
| `npm run prisma:migrate` | apply migrations |
| `npm run clean` | remove build outputs |

---

## API summary

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | – | health check |
| POST | `/api/v1/auth/register` | – | sign up |
| POST | `/api/v1/auth/login` | – | sign in |
| POST | `/api/v1/auth/refresh` | – | refresh tokens |
| POST | `/api/v1/auth/logout` | Bearer | sign out |
| GET | `/api/v1/auth/me` | Bearer | current user |
| POST | `/api/v1/notify/alert` | Bearer | send intruder alert (rate limited) |
| PATCH | `/api/v1/user/settings` | Bearer | update WhatsApp number |

All endpoints return `{ error, message, statusCode }` on failure.

---

## Deploy backend to Vercel

The API is wired for serverless Express via **`api/index.js`** (loads **`dist/app.js`**), **`vercel.json`** rewrites, and **`npm run vercel-build`** (**`prisma generate` + TypeScript compile**).

1. Push the repo to GitHub (or another Git provider).
2. In **[Vercel](https://vercel.com)** → **Add Project** → import the repo.
3. **Root Directory**: set **`backend`** (when the repo root is `neurosecure/`).
4. **Framework Preset**: **Other**.
5. **Node.js**: **20.x** (matches **`package.json`** `engines`).
6. **Install Command**: `npm install` (default is fine).
7. **Build Command**: leave blank so **Vercel runs the `vercel-build` script** (`npx prisma generate && npm run build`).
8. **Environment variables**: paste every variable from **`backend/.env.example`** except `PORT` is optional—the same keys must exist under **Production** (and Preview if needed). Use **`NODE_ENV=production`**. Prefer Supabase **`DATABASE_URL`** with the **pooler** (`:6543` + `pgbouncer=true` when shown in the dashboard).
9. Deploy. Smoke-test **`https://YOUR-PROJECT.vercel.app/health`**, then **`GET /`** (confirmation HTML).

Point the extension at production:

```env
PLASMO_PUBLIC_BACKEND_URL=https://YOUR-PROJECT.vercel.app
```

Rebuild the extension and reload it in Chrome (`npm run build` in `extension/`).

If the function crashes with **`FUNCTION_INVOCATION_FAILED`**, open the deployment → **Functions** → **`api/index`** logs: missing variables show as **`[env] Invalid configuration`**.

---

## Notes

- All scripts work on Windows. We use `cross-env` to set `NODE_ENV` and `rimraf` instead of `rm -rf`.
- Face embeddings never leave the user's machine in plaintext — they're encrypted with **AES-GCM** using a key derived via **PBKDF2** from the user's PIN.
- Alert email rate limit: **1 alert / 30 seconds / user** (in-memory, no Redis).
- Camera access is requested only on the enrollment + dashboard pages and is fully released on unmount.
