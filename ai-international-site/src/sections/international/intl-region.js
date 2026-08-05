'use client';

export const INTL_REGION_STORAGE_KEY = 'ainexus_intl_region';

/**
 * Fallback landing options when the third-party languages API is unavailable.
 */
export const INTL_REGIONS = [
  {
    id: 'zh-Hans',
    code: 'zh-Hans',
    label: 'Chinese Simplified',
    nativeLabel: '中文 (简体)',
    locale: 'zh-Hans',
    language: 'Chinese Simplified',
    flagCode: 'cn',
    icon: 'solar:buildings-bold-duotone',
  },
  {
    id: 'vi',
    code: 'vi',
    label: 'Vietnamese',
    nativeLabel: 'Tiếng Việt',
    locale: 'vi',
    language: 'Vietnamese',
    flagCode: 'vn',
    icon: 'solar:map-point-bold-duotone',
  },
  {
    id: 'th',
    code: 'th',
    label: 'Thai',
    nativeLabel: 'ไทย',
    locale: 'th',
    language: 'Thai',
    flagCode: 'th',
    icon: 'solar:home-smile-bold-duotone',
  },
  {
    id: 'en',
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    locale: 'en',
    language: 'English',
    flagCode: null,
    icon: 'solar:global-bold-duotone',
  },
];

function normalizeStored(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.id) {
    return {
      id: value.id,
      code: value.code || value.id,
      label: value.label || value.title || value.language || String(value.id),
      nativeLabel: value.nativeLabel || value.label || value.title || '',
      locale: value.locale || value.code || value.id || 'en',
      language: value.language || value.title || value.label || '',
      flagCode: value.flagCode ?? null,
      icon: value.icon || 'solar:global-bold-duotone',
      title: value.title || value.label || '',
    };
  }
  const legacy = INTL_REGIONS.find((r) => r.id === value || r.code === value);
  return (
    legacy || {
      id: value,
      code: value,
      label: String(value),
      language: String(value),
      flagCode: null,
      icon: 'solar:global-bold-duotone',
    }
  );
}

/** Load languages from Next proxy → Microsoft Translator languages API. */
export async function fetchIntlRegions() {
  try {
    const response = await fetch('/api/intl-languages', { cache: 'no-store' });
    if (!response.ok) return INTL_REGIONS;
    const payload = await response.json();
    const list = Array.isArray(payload?.data) ? payload.data : [];
    if (!list.length) return INTL_REGIONS;
    return list;
  } catch {
    return INTL_REGIONS;
  }
}

export function getStoredIntlRegion() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(INTL_REGION_STORAGE_KEY);
    if (!raw) return null;
    try {
      return normalizeStored(JSON.parse(raw));
    } catch {
      return normalizeStored(raw);
    }
  } catch {
    return null;
  }
}

/** Accepts region object or id/code string. */
export function setStoredIntlRegion(regionOrId) {
  if (typeof window === 'undefined') return;
  try {
    const payload =
      typeof regionOrId === 'string'
        ? { id: regionOrId, code: regionOrId }
        : {
            id: regionOrId.id,
            code: regionOrId.code || regionOrId.id,
            label: regionOrId.label || regionOrId.title,
            title: regionOrId.title || regionOrId.label,
            nativeLabel: regionOrId.nativeLabel,
            locale: regionOrId.locale || regionOrId.code,
            language: regionOrId.language,
            flagCode: regionOrId.flagCode ?? null,
            icon: regionOrId.icon,
          };
    localStorage.setItem(INTL_REGION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearStoredIntlRegion() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(INTL_REGION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Aliases kept for older imports */
export const INTL_LANGUAGES = INTL_REGIONS;
export const getStoredIntlLanguage = getStoredIntlRegion;
export const setStoredIntlLanguage = setStoredIntlRegion;
export const clearStoredIntlLanguage = clearStoredIntlRegion;
