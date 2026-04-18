/**
 * Public Flowise UI/API base URL for redirects, iframes, and window.open.
 *
 * Prefer VITE_FLOWISE_URL when Flowise is on a different origin (e.g. http://localhost:3001).
 * In production behind the same host as the app (reverse proxy), set VITE_FLOWISE_RELATIVE_PATH
 * (e.g. /flowise) so the browser uses the same scheme/host as the page — avoids https://host:3002
 * while the Node process only speaks HTTP behind TLS termination.
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
