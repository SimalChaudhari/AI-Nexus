'use client';

export const INTL_REGION_STORAGE_KEY = 'ainexus_intl_region';

/**
 * Default landing languages (fixed set — no third-party languages API).
 * Status line under each language name is set via `note`.
 */
const FULL_TRANSLATION_NOTE = 'Full translation in September';
const CLOSE_CAPTION_NOTE = 'Close Caption Available';

export const INTL_REGIONS = [
  {
    id: 'en',
    code: 'en',
    label: 'English',
    nativeLabel: 'International',
    locale: 'en',
    language: 'English',
    flagCode: null,
    icon: 'solar:global-bold-duotone',
    selectable: true,
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
    note: CLOSE_CAPTION_NOTE,
  },
  {
    id: 'id',
    code: 'id',
    label: 'Indonesian',
    nativeLabel: 'Bahasa Indonesia',
    locale: 'id',
    language: 'Indonesian',
    flagCode: 'id',
    icon: 'solar:global-bold-duotone',
    note: CLOSE_CAPTION_NOTE,
  },
  {
    id: 'zh-Hans',
    code: 'zh-Hans',
    label: 'Chinese',
    nativeLabel: '中文',
    locale: 'zh-Hans',
    language: 'Chinese',
    flagCode: 'cn',
    icon: 'solar:buildings-bold-duotone',
    note: FULL_TRANSLATION_NOTE,
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
    note: CLOSE_CAPTION_NOTE,
  },
];

export function isLanguageSelectable(region) {
  if (typeof region?.selectable === 'boolean') return region.selectable;
  const id = String(region?.id || region?.code || '').trim().toLowerCase();
  const language = String(region?.language || region?.label || '').trim().toLowerCase();
  return id === 'en' || language === 'english';
}

export function getLanguageNote(region) {
  if (region && Object.prototype.hasOwnProperty.call(region, 'note')) {
    return String(region.note || '').trim();
  }
  const keys = [region?.id, region?.code, region?.language, region?.label]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  if (keys.some((key) => key === 'zh-hans' || key === 'zh' || key === 'chinese')) {
    return FULL_TRANSLATION_NOTE;
  }
  if (
    keys.some((key) =>
      ['th', 'thai', 'vi', 'vietnamese', 'id', 'indonesian'].includes(key)
    )
  ) {
    return CLOSE_CAPTION_NOTE;
  }
  return '';
}

function normalizeStored(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.id) {
    const matched = INTL_REGIONS.find((r) => r.id === value.id || r.code === value.code);
    if (matched) return matched;
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
      note: value.note || getLanguageNote(value),
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

/** Always the default landing languages. */
export async function fetchIntlRegions() {
  return INTL_REGIONS;
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
    const matched =
      typeof regionOrId === 'string'
        ? INTL_REGIONS.find((r) => r.id === regionOrId || r.code === regionOrId)
        : INTL_REGIONS.find((r) => r.id === regionOrId?.id || r.code === regionOrId?.code);

    const payload = matched || (
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
            note: regionOrId.note || getLanguageNote(regionOrId),
          }
    );
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
