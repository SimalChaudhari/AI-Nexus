import { resolveServerOrigin } from 'src/utils/server-url';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

export function resolveAssetUrl(value) {
  if (!value || typeof value !== 'string') return value || '';

  if (
    ABSOLUTE_URL_PATTERN.test(value) ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  const origin = resolveServerOrigin();
  if (!origin) return value;

  if (value.startsWith('/uploads/')) {
    return `${origin}${value}`;
  }

  if (value.startsWith('uploads/')) {
    return `${origin}/${value}`;
  }

  return value;
}

