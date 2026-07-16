# AI-Nexus Flowise (System README)

This repository contains the customized Flowise setup used in AI-Nexus.

## Main commands (start here)

From the `AI-Nexus-flowise` root:

| Command | Use |
|---------|-----|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Development (API + UI together via Turbo) |
| `pnpm prod:separate` | **Production split (recommended for UAT)** — API `:3002` + UI `:3001` |
| `pnpm prod` | Production single process (API serves built UI on one port) |

### Recommended production (split UI + API)

```bash
pnpm prod:separate
```

This builds API + UI once, then starts both in parallel:

| Service | Default port | Public host (UAT nginx) |
|---------|--------------|-------------------------|
| Flowise API | `3002` | `https://api.flowise.ainexusuat.isca.org.sg` |
| Flowise UI | `3001` | `https://flowise.ainexusuat.isca.org.sg` |

Nginx example: `deploy/nginx-flowise-uat-split.conf`

Related scripts:

```bash
pnpm build:api        # build server only
pnpm build:ui         # build UI only
pnpm start:api:prod   # start API only (after build)
pnpm start:ui:prod    # start UI preview only (after build)
```

---

## Project Structure

- `packages/server` - Flowise backend API/server
- `packages/ui` - Flowise web UI (Vite build)
- `packages/components` - node/component integrations
- `deploy/nginx-flowise-uat-split.conf` - nginx split for UI `:3001` + API `:3002`

## Prerequisites

- Node.js `>=18.15.0`
- pnpm `^10`

Install pnpm globally if needed:

```bash
npm i -g pnpm
```

## Install

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Typical local UI URL: `http://localhost:8080`  
Typical server URL: from `packages/server/.env` `PORT` (often `3002`).

## Production (other options)

### Single port (API serves UI)

```bash
pnpm prod
```

### Start production mode directly (already built)

```bash
pnpm start:prod
```

## Environment Files

Use these files for configuration:

- `packages/server/.env`
- `packages/server/.env.production`
- `packages/ui/.env`
- `packages/ui/.env.production`

Split UAT essentials:

- Server: `PORT=3002`, `APP_URL=https://flowise.ainexusuat.isca.org.sg`, `COOKIE_DOMAIN=.flowise.ainexusuat.isca.org.sg`
- UI: `VITE_PREVIEW_PORT=3001`, `VITE_API_BASE_URL=https://api.flowise.ainexusuat.isca.org.sg`

## Branding (Title + Favicon) - Important

For this setup, production serves the built UI from `packages/ui/build`, generated from:

- `packages/ui/index.html` (primary Vite HTML template)

### To update browser title/icon correctly in production:

1. Update title/meta in:
   - `packages/ui/index.html`
2. Put favicon file in:
   - `packages/ui/public/favicon.ico`
3. Use favicon path in HTML as:
   - `<link rel="icon" href="/favicon.ico" />`
4. Rebuild and restart:

```bash
pnpm build:ui
pnpm prod:separate
```

5. Hard refresh browser (`Ctrl+F5`) because favicon is cached aggressively.

## Common Commands

```bash
pnpm prod:separate # main UAT/prod split: API :3002 + UI :3001
pnpm prod          # build + single-port production
pnpm build         # build all packages
pnpm build:api     # build API only
pnpm build:ui      # build UI only
pnpm start         # start server (OS-specific script)
pnpm start:prod    # start with NODE_ENV=production
pnpm start:api:prod
pnpm start:ui:prod
pnpm clean         # clean package build artifacts
pnpm nuke          # deep clean (build + node_modules)
pnpm lint          # lint workspace
```

## Troubleshooting

### Dev title/icon changes work, but production does not

- Ensure changes are in `packages/ui/index.html` (not only `public/index.html`)
- Ensure `packages/ui/public/favicon.ico` exists
- Rebuild UI (`pnpm build:ui`) and restart (`pnpm prod:separate` or `pnpm start:prod`)
- Clear browser cache / use incognito

### Build not reflecting latest UI

```bash
pnpm clean
pnpm build
pnpm prod:separate
```

### `/api` returns HTML instead of JSON

Nginx must route `api.flowise.*` → `:3002` (API), not UI `:3001`. See `deploy/nginx-flowise-uat-split.conf`.

## Notes

- This README is customized for AI-Nexus local + production workflow.
- Prefer `pnpm prod:separate` when UI and API use different hosts/ports behind nginx.
- Keep branding edits and deployment steps in sync to avoid local/prod mismatch.
