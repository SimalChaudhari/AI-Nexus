import { CONFIG } from 'src/config-global';

/**
 * Public Flowise UI base URL for redirects, iframes, and window.open.
 *
 * Prefer VITE_FLOWISE_URL when Flowise UI is on a different origin (e.g. http://localhost:3001).
 * In production behind the same host as the app (reverse proxy), set VITE_FLOWISE_RELATIVE_PATH
 * (e.g. /flowise) so the browser uses the same scheme/host as the page.
 */
export function resolveFlowisePublicBaseUrl() {
  const absolute = (import.meta.env.VITE_FLOWISE_URL || '').trim().replace(/\/$/, '');
  if (absolute) {
    return absolute;
  }

  const relative = (import.meta.env.VITE_FLOWISE_RELATIVE_PATH || '').trim();
  if (relative && typeof window !== 'undefined') {
    const path = relative.startsWith('/') ? relative : `/${relative}`;
    return `${window.location.origin}${path}`.replace(/\/$/, '');
  }

  return '';
}

/**
 * Flowise API base URL for auth endpoints (external-login, logout).
 * When UI and API are on different subdomains, set VITE_FLOWISE_API_HOST.
 * Falls back to the public UI base when /api is proxied on the same host.
 */
export function resolveFlowiseApiBaseUrl() {
  const apiHost = (CONFIG.flowise.apiHost || import.meta.env.VITE_FLOWISE_API_HOST || '')
    .trim()
    .replace(/\/$/, '');
  if (apiHost) {
    return apiHost;
  }

  return resolveFlowisePublicBaseUrl();
}

/** Build external-login URL — must hit the Flowise API host, not the UI SPA. */
export function buildFlowiseExternalLoginUrl(accessToken) {
  const token = String(accessToken || '').trim();
  const apiBase = resolveFlowiseApiBaseUrl().replace(/\/$/, '');
  if (!apiBase || !token) {
    return '';
  }
  return `${apiBase}/api/v1/auth/external-login?token=${encodeURIComponent(token)}`;
}
