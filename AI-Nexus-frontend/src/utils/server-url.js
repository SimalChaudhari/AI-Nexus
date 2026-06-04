/**
 * Resolve API base URL and asset/socket origin for dev vs production.
 * Production builds without VITE_SERVER_URL use same-origin `/api` to avoid CORS.
 */

function useSameOriginApiInBrowser(apiBase) {
  if (typeof window === 'undefined' || !apiBase || !/^https?:\/\//i.test(apiBase)) {
    return apiBase;
  }
  try {
    const configured = new URL(apiBase);
    const page = window.location;
    const sameHost =
      configured.hostname === page.hostname &&
      configured.protocol === page.protocol;
    const differentPort = configured.port !== page.port;
    // e.g. SPA on :443 but VITE_SERVER_URL=https://host:5000/api → use /api on page origin
    if (sameHost && differentPort) {
      return '/api';
    }
  } catch {
    // keep configured value
  }
  return apiBase;
}

export function resolveApiBaseUrl() {
  const fromEnv = (import.meta.env.VITE_SERVER_URL || '').trim();
  const fallback = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
  const apiBase = fromEnv || fallback;
  return useSameOriginApiInBrowser(apiBase);
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
