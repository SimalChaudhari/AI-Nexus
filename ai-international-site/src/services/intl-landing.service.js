import axios from 'src/utils/axios';

import {
  INTL_LANDING_DEFAULTS,
  normalizeIntlLandingContent,
} from 'src/sections/international/intl-landing-defaults';

/** Prefer path under /uploads (Next rewrite) even if API returned an absolute backend URL. */
function toDisplayAssetUrl(url) {
  const value = String(url || '').trim();
  if (!value) return null;
  const uploadsIdx = value.indexOf('/uploads/');
  if (uploadsIdx >= 0) return value.slice(uploadsIdx);
  return value;
}

export async function getInternationalLandingContent() {
  try {
    const response = await axios.get('/app-settings');
    const data = response.data?.data || response.data || {};
    const normalized = normalizeIntlLandingContent(data.internationalLandingContent);
    return {
      ...normalized,
      hero: {
        ...normalized.hero,
        heroImageUrl: toDisplayAssetUrl(normalized.hero?.heroImageUrl),
      },
      globalLearning: {
        ...normalized.globalLearning,
        imageUrl: toDisplayAssetUrl(normalized.globalLearning?.imageUrl),
      },
    };
  } catch {
    return normalizeIntlLandingContent(INTL_LANDING_DEFAULTS);
  }
}
