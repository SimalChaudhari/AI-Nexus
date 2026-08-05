# AI International Site

Standalone **Next.js + React** site for the AI Nexus International pages.

> Folder name: `ai-international-site` (npm requires lowercase). Project display name: **AI-International-site**.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing (hero + regions, global, trust, footer) |
| `/ai-fluency` | AI Fluency pathway planner |

## Setup

```bash
cd ai-international-site
npm install
cp .env.local.example .env.local
npm run dev
```

Open the URL printed by Next.js (often http://localhost:3000 or :3001).

### Env (API host / port — not hardcoded in source)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SERVER_URL` | Full API base, e.g. `http://localhost:5000/api` |
| `BACKEND_ORIGIN` | Backend origin for `/api` + `/uploads` rewrites, e.g. `http://localhost:5000` |
| `NEXT_PUBLIC_API_PROXY` | `true` = browser calls `/api` (proxy); `false` = call `SERVER_URL` directly |

Change host/port only in `.env` / `.env.local`, then restart `npm run dev`.

## Stack

- Next.js 15 (App Router)
- React 18
- MUI 5
- JavaScript (no TypeScript)
