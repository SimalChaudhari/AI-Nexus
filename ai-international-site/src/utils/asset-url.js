import { getBackendOrigin, getServerUrl } from 'src/lib/env';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

function getAssetOrigin() {
  if (typeof window !== 'undefined') {
    const proxy = (process.env.NEXT_PUBLIC_API_PROXY || 'true').toLowerCase();
    const useProxy = proxy === '' || proxy === 'true' || proxy === '1';
    // Same-origin proxy also covers /uploads via next.config rewrites
    if (useProxy) return window.location.origin;
  }

  return getBackendOrigin() || getServerUrl();
}

export function resolveAssetUrl(value) {
  if (!value || typeof value !== 'string') return value || '';

  if (
    ABSOLUTE_URL_PATTERN.test(value) ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  const origin = getAssetOrigin();
  if (!origin) return value;

  const base = String(origin).replace(/\/+$/, '');

  if (value.startsWith('/uploads/')) {
    return `${base}${value}`;
  }

  if (value.startsWith('uploads/')) {
    return `${base}/${value}`;
  }

  return value;
}
