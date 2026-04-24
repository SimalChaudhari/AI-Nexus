# AI-Nexus Flowise (System README)

This repository contains the customized Flowise setup used in AI-Nexus.

## Project Structure

- `packages/server` - Flowise backend API/server
- `packages/ui` - Flowise web UI (Vite build)
- `packages/components` - node/component integrations

## Prerequisites

- Node.js `>=18.15.0`
- pnpm `^10`

Install pnpm globally if needed:

```bash
npm i -g pnpm
```

## Install

From the `AI-Nexus-flowise` root:

```bash
pnpm install
```

## Development

Run full monorepo development mode:

```bash
pnpm dev
```

Typical local UI URL: `http://localhost:8080`  
Typical server URL: `http://localhost:3000` (depends on env).

## Production

### Option 1: Build + start

```bash
pnpm prod
```

### Option 2: Start production mode directly

```bash
pnpm start:prod
```

## Environment Files

Use these files for configuration:

- `packages/server/.env`
- `packages/server/.env.production`
- `packages/ui/.env`
- `packages/ui/.env.production`

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
4. Rebuild and restart production:

```bash
cd packages/ui
pnpm build
cd ../..
pnpm start:prod
```

5. Hard refresh browser (`Ctrl+F5`) because favicon is cached aggressively.

## Common Commands

```bash
pnpm build        # build all packages
pnpm start        # start server (OS-specific script)
pnpm start:prod   # start with NODE_ENV=production
pnpm prod         # build + start production
pnpm clean        # clean package build artifacts
pnpm nuke         # deep clean (build + node_modules)
pnpm lint         # lint workspace
```

## Troubleshooting

### Dev title/icon changes work, but production does not

- Ensure changes are in `packages/ui/index.html` (not only `public/index.html`)
- Ensure `packages/ui/public/favicon.ico` exists
- Rebuild UI (`pnpm build`) and restart server
- Clear browser cache / use incognito

### Build not reflecting latest UI

- Run clean build:

```bash
pnpm clean
pnpm build
pnpm start:prod
```

## Notes

- This README is customized for AI-Nexus local + production workflow.
- Keep branding edits and deployment steps in sync to avoid local/prod mismatch.
