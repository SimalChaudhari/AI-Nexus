import { CONFIG } from 'src/config-global';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

function getServerOrigin() {
  const serverUrl = (CONFIG.site.serverUrl || '').trim();
  if (!serverUrl) return '';

  try {
    const parsed = new URL(serverUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
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

  const origin = getServerOrigin();
  if (!origin) return value;

  if (value.startsWith('/uploads/')) {
    return `${origin}${value}`;
  }

  if (value.startsWith('uploads/')) {
    return `${origin}/${value}`;
  }

  return value;
}
