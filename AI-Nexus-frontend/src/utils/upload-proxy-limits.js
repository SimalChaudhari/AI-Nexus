/** Same default as compress-image-file.js — fits common ~1MB reverse-proxy body limits. */
export const DEFAULT_PROXY_SAFE_BYTES = 900 * 1024;

/**
 * Max upload bytes before client-side compression (images/videos).
 * Set VITE_UPLOAD_PROXY_MAX_MB to match nginx `client_max_body_size` (e.g. 500).
 */
export function getProxySafeMaxBytes() {
  const mb = Number(import.meta.env.VITE_UPLOAD_PROXY_MAX_MB);
  if (Number.isFinite(mb) && mb > 0) {
    return Math.floor(mb * 1024 * 1024 * 0.9);
  }
  return DEFAULT_PROXY_SAFE_BYTES;
}

export function getCeoVideoMaxBytes() {
  const ceoMb = Number(import.meta.env.VITE_UPLOAD_VIDEO_MAX_MB);
  const proxyCap = getProxySafeMaxBytes();
  if (Number.isFinite(ceoMb) && ceoMb > 0) {
    return Math.min(Math.floor(ceoMb * 1024 * 1024 * 0.95), proxyCap);
  }
  return proxyCap;
}

export function getSectionVideoMaxBytes() {
  const gb = Number(import.meta.env.VITE_UPLOAD_SECTION_VIDEO_MAX_GB);
  const proxyCap = getProxySafeMaxBytes();
  if (Number.isFinite(gb) && gb > 0) {
    return Math.min(Math.floor(gb * 1024 * 1024 * 1024 * 0.95), proxyCap);
  }
  return proxyCap;
}

export function formatMaxUploadLabel(bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}
