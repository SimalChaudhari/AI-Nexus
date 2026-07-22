import { CONFIG } from 'src/config-global';

export const DEFAULT_DIGITAL_BADGE_IMAGE = `${CONFIG.site.basePath}/badge/badge.png`.replace(
  /\/{2,}/g,
  '/'
);

export const DEFAULT_DIGITAL_BADGE_ISSUER = 'AI Nexus';

const IMAGE_STORAGE_KEY = 'digital-badge-image-url';
const ISSUER_STORAGE_KEY = 'digital-badge-issuer';

export function getDigitalBadgeImage() {
  if (typeof window === 'undefined') return DEFAULT_DIGITAL_BADGE_IMAGE;
  return window.localStorage.getItem(IMAGE_STORAGE_KEY) || DEFAULT_DIGITAL_BADGE_IMAGE;
}

export function getDigitalBadgeIssuer() {
  if (typeof window === 'undefined') return DEFAULT_DIGITAL_BADGE_ISSUER;
  return window.localStorage.getItem(ISSUER_STORAGE_KEY) || DEFAULT_DIGITAL_BADGE_ISSUER;
}

export function persistDigitalBadgeSettings({ imageUrl, issuer } = {}) {
  if (typeof window === 'undefined') return;
  if (imageUrl) {
    window.localStorage.setItem(IMAGE_STORAGE_KEY, imageUrl);
  } else {
    window.localStorage.removeItem(IMAGE_STORAGE_KEY);
  }
  if (issuer) {
    window.localStorage.setItem(ISSUER_STORAGE_KEY, issuer);
  } else {
    window.localStorage.removeItem(ISSUER_STORAGE_KEY);
  }
}
