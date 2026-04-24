# AI-Nexus Flowise UI

React + Vite frontend for Flowise in the AI-Nexus monorepo.

## What this package is

- Entry HTML: `index.html` (Vite template; used for dev and as the build source)
- Static assets: `public/` (copied into `build/`; favicon, manifest, etc.)
- App source: `src/`

## Scripts

From `packages/ui`:

```bash
pnpm dev      # Vite dev server (default port from env, often 8080)
pnpm build    # output to ./build
pnpm clean    # remove build output
pnpm nuke     # remove build + node_modules
```

From monorepo root (`AI-Nexus-flowise`):

```bash
pnpm --filter flowise-ui dev
pnpm --filter flowise-ui build
```

## Branding (title + favicon)

Production serves files from `build/`. To change **tab title** and **icon**:

1. Edit `packages/ui/index.html` — `<title>`, meta tags, and:

   ```html
   <link rel="icon" href="/favicon.ico" />
   ```

2. Place the icon at `packages/ui/public/favicon.ico`.

3. Rebuild and restart the server that serves `build/`:

   ```bash
   pnpm build
   ```

4. Hard refresh the browser (`Ctrl+F5`) or use a private window — favicons are heavily cached.

**Note:** `public/index.html` is not the Vite entry in this setup; prefer `index.html` at package root for changes that must appear in production.

## Env

- `.env` — local defaults
- `.env.production` — production Vite variables (if used)

See root `AI-Nexus-flowise/README.md` for full stack dev/prod and server env.

## License

Upstream Flowise is Apache 2.0. This README is project documentation only.
