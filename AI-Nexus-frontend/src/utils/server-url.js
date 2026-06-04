/**
 * Resolve API base URL and asset/socket origin for dev vs production.
 * Production builds without VITE_SERVER_URL use same-origin `/api` to avoid CORS.
 */

export function resolveApiBaseUrl() {
  const fromEnv = (import.meta.env.VITE_SERVER_URL || '').trim();
  if (fromEnv) return fromEnv;
  return import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
}

/** Backend origin without /api (for uploads, Socket.IO, static assets). */
export function resolveServerOrigin() {
  const apiBase = resolveApiBaseUrl();
  if (/^https?:\/\//i.test(apiBase)) {
    return apiBase.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}
