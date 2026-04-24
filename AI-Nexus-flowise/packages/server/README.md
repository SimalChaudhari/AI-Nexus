# AI-Nexus Flowise Server

TypeScript/Node backend for Flowise in the AI-Nexus monorepo. It exposes the API, runs chatflows, and in production serves the built UI from the workspace package **`flowise-ui`** (`packages/ui`).

## What this package is

- Main entry after build: `dist/`
- CLI: `bin/run` (used by root `pnpm start` / `pnpm start:prod`)
- Environment: `.env` and `.env.production` in **this folder** (`packages/server/`)

## Scripts

From `packages/server`:

```bash
pnpm build       # tsc + gulp
pnpm dev         # nodemon (local API development)
pnpm start       # run server (after build; paths differ on Windows vs Unix)
pnpm start:prod  # NODE_ENV=production + start
```

From monorepo root (`AI-Nexus-flowise`):

```bash
pnpm --filter "./packages/server" build
pnpm --filter "./packages/server" dev
```

Full-stack dev and production flows are documented in the root [README](../../README.md) (`pnpm dev`, `pnpm prod`, `pnpm start:prod`).

## Environment

- **`.env`** — local development (database path, `PORT`, API keys, feature flags, etc.)
- **`.env.production`** — values used when running in production mode

Upstream Flowise documents many variables in their [contributing / env docs](https://github.com/FlowiseAI/Flowise/blob/main/CONTRIBUTING.md). Prefer keeping secrets out of git and loading them from these files or your host’s secret store.

## UI in production

The server resolves static UI assets from the **`flowise-ui`** workspace dependency (built output under `packages/ui/build` after `pnpm build` in that package). If the UI looks stale or branding (title/favicon) does not match, rebuild `flowise-ui` and restart the server; see **`packages/ui/README.md`** and the root README.

## License

Upstream Flowise is Apache 2.0. This README is project documentation only.
