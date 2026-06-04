/** Same default as compress-image-file.js — fits common ~1MB reverse-proxy body limits. */
export const DEFAULT_PROXY_SAFE_BYTES = 900 * 1024;

function parseEnvMb(name) {
  const mb = Number(import.meta.env[name]);
  return Number.isFinite(mb) && mb > 0 ? mb : null;
}

function isProxyLimitVerified() {
  return String(import.meta.env.VITE_UPLOAD_PROXY_VERIFIED || '').trim() === 'true';
}

/**
 * Bytes we try to fit under after client compression (images + videos).
 * Large VITE_UPLOAD_PROXY_MAX_MB is ignored until VITE_UPLOAD_PROXY_VERIFIED=true,
 * so a misconfigured nginx (still ~1MB on :5000) does not skip video compression.
 */
export function getProxySafeMaxBytes() {
  const proxyMb = parseEnvMb('VITE_UPLOAD_PROXY_MAX_MB');
  if (isProxyLimitVerified() && proxyMb) {
    return Math.floor(proxyMb * 1024 * 1024 * 0.9);
  }
  return DEFAULT_PROXY_SAFE_BYTES;
}

/** Run video compression when the file is larger than this (default: same as images). */
export function getVideoCompressAboveBytes() {
  const aboveMb = parseEnvMb('VITE_UPLOAD_COMPRESS_ABOVE_MB');
  if (aboveMb) return Math.floor(aboveMb * 1024 * 1024);
  return DEFAULT_PROXY_SAFE_BYTES;
}

export function getCeoVideoTargetMaxBytes() {
  const ceoMb = parseEnvMb('VITE_UPLOAD_VIDEO_MAX_MB') ?? 100;
  const proxyCap = getProxySafeMaxBytes();
  const ceoCap = Math.floor(ceoMb * 1024 * 1024 * 0.95);
  return Math.min(ceoCap, proxyCap);
}

export function getSectionVideoTargetMaxBytes() {
  const gb = parseEnvMb('VITE_UPLOAD_SECTION_VIDEO_MAX_GB');
  const proxyCap = getProxySafeMaxBytes();
  if (gb) {
    return Math.min(Math.floor(gb * 1024 * 1024 * 1024 * 0.95), proxyCap);
  }
  return proxyCap;
}

/** @deprecated use getCeoVideoTargetMaxBytes */
export function getCeoVideoMaxBytes() {
  return getCeoVideoTargetMaxBytes();
}

/** @deprecated use getSectionVideoTargetMaxBytes */
export function getSectionVideoMaxBytes() {
  return getSectionVideoTargetMaxBytes();
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
