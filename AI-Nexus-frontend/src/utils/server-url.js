/**
 * Resolve API base URL and asset/socket origin.
 * Production on port 5000: set VITE_SERVER_URL or VITE_API_PORT=5000 at build time.
 */

function buildApiUrlFromPagePort(apiPort) {
  if (typeof window === 'undefined' || !apiPort) return '';
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${apiPort}/api`;
}

export function resolveApiBaseUrl() {
  const fromEnv = (import.meta.env.VITE_SERVER_URL || '').trim();
  if (fromEnv) return fromEnv;

  const apiPort = (import.meta.env.VITE_API_PORT || '').trim();
  if (apiPort) {
    const fromPort = buildApiUrlFromPagePort(apiPort);
    if (fromPort) return fromPort;
  }

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
