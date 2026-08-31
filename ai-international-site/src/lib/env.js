/**
 * All API / backend URLs come from env — no hardcoded host/port in app code.
 *
 * Required in `.env` / `.env.local`:
 *   NEXT_PUBLIC_SERVER_URL=http://localhost:5000/api
 *
 * Optional:
 *   BACKEND_ORIGIN=http://localhost:5000
 *     → used by Next.js rewrites (/api, /uploads). If omitted, derived from SERVER_URL.
 *   NEXT_PUBLIC_API_PROXY=true
 *     → browser calls same-origin `/api` (rewrite). Set `false` to call SERVER_URL directly.
 */

function trimEnv(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getServerUrl() {
  return trimEnv(process.env.NEXT_PUBLIC_SERVER_URL);
}

export function getBackendOrigin() {
  const explicit = trimEnv(process.env.BACKEND_ORIGIN);
  if (explicit) return explicit.replace(/\/+$/, '');

  const serverUrl = getServerUrl();
  if (!serverUrl) return '';

  try {
    const parsed = new URL(serverUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

/** Browser axios base: `/api` when proxy enabled, otherwise full SERVER_URL. */
export function getClientApiBase() {
  const proxy = trimEnv(process.env.NEXT_PUBLIC_API_PROXY).toLowerCase();
  const useProxy = proxy === '' || proxy === 'true' || proxy === '1';
  if (useProxy) return '/api';
  return getServerUrl();
}

/** Server-side axios / SSR base — always the full API URL from env. */
export function getServerApiBase() {
  return getServerUrl();
}
