<<<<<<< HEAD
export const INTL_REGION_STORAGE_KEY = 'ainexus_intl_region';

export const INTL_REGIONS = [
  {
    id: 'china',
    label: 'China',
    nativeLabel: '中国',
    locale: 'zh-CN',
    language: 'Chinese',
    flagCode: 'cn',
    icon: 'solar:buildings-bold-duotone',
  },
  {
    id: 'vietnam',
    label: 'Vietnam',
    nativeLabel: 'Việt Nam',
    locale: 'vi-VN',
    language: 'Vietnamese',
    flagCode: 'vn',
    icon: 'solar:map-point-bold-duotone',
  },
  {
    id: 'thailand',
    label: 'Thailand',
    nativeLabel: 'ประเทศไทย',
    locale: 'th-TH',
    language: 'Thai',
    flagCode: 'th',
    icon: 'solar:home-smile-bold-duotone',
  },
  {
    id: 'international',
    label: 'International',
    nativeLabel: 'Worldwide',
    locale: 'en',
    language: 'English',
    flagCode: null,
    icon: 'solar:global-bold-duotone',
  },
];

export function getStoredIntlRegion() {
  try {
    const raw = localStorage.getItem(INTL_REGION_STORAGE_KEY);
    if (!raw) return null;
    return INTL_REGIONS.find((r) => r.id === raw) ?? null;
  } catch {
    return null;
  }
}

export function setStoredIntlRegion(regionId) {
  try {
    localStorage.setItem(INTL_REGION_STORAGE_KEY, regionId);
  } catch {
    // ignore
  }
}

export function clearStoredIntlRegion() {
  try {
    localStorage.removeItem(INTL_REGION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
=======
export const INTL_REGION_STORAGE_KEY = 'ainexus_intl_region';

export const INTL_REGIONS = [
  {
    id: 'china',
    label: 'China',
    nativeLabel: '中国',
    locale: 'zh-CN',
    language: 'Chinese',
    flagCode: 'cn',
    icon: 'solar:buildings-bold-duotone',
  },
  {
    id: 'vietnam',
    label: 'Vietnam',
    nativeLabel: 'Việt Nam',
    locale: 'vi-VN',
    language: 'Vietnamese',
    flagCode: 'vn',
    icon: 'solar:map-point-bold-duotone',
  },
  {
    id: 'thailand',
    label: 'Thailand',
    nativeLabel: 'ประเทศไทย',
    locale: 'th-TH',
    language: 'Thai',
    flagCode: 'th',
    icon: 'solar:home-smile-bold-duotone',
  },
  {
    id: 'international',
    label: 'International',
    nativeLabel: 'Worldwide',
    locale: 'en',
    language: 'English',
    flagCode: null,
    icon: 'solar:global-bold-duotone',
  },
];

export function getStoredIntlRegion() {
  try {
    const raw = localStorage.getItem(INTL_REGION_STORAGE_KEY);
    if (!raw) return null;
    return INTL_REGIONS.find((r) => r.id === raw) ?? null;
  } catch {
    return null;
  }
}

export function setStoredIntlRegion(regionId) {
  try {
    localStorage.setItem(INTL_REGION_STORAGE_KEY, regionId);
  } catch {
    // ignore
  }
}

export function clearStoredIntlRegion() {
  try {
    localStorage.removeItem(INTL_REGION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
>>>>>>> 77824e39b799c567de95e0752cc504d0a0a4c3d1
