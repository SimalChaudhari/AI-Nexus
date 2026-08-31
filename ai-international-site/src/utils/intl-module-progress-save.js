import axios from 'src/utils/axios';

import { getIntlAccessToken } from 'src/auth/intl-session';
import { intlPathwayProgressService } from 'src/services/intl-pathway-progress.service';
import { clearLegacyIntlProgressBrowserStorage } from 'src/utils/intl-progress-cache';

/** In-memory retry queue only — never written to localStorage/sessionStorage. */
const pendingByCode = new Map();
let flushTimer = null;

/** Currently mounted lesson player — flushed before navigating to another video. */
let activeProgressFlusher = null;
/** After a navigate flush PUT, skip the duplicate unmount PUT (Fort leaves once). */
let skipNextUnmountPersist = false;

clearLegacyIntlProgressBrowserStorage();

export function registerActiveIntlProgressFlusher(fn) {
  activeProgressFlusher = typeof fn === 'function' ? fn : null;
}

/** Await in-flight lesson save before switching modules (navigate / accordion). */
export async function flushActiveIntlModuleProgress() {
  const flush = activeProgressFlusher;
  if (!flush) return null;
  try {
    const data = await flush();
    // Only skip unmount when this flush actually saved.
    skipNextUnmountPersist = data != null;
    return data;
  } catch {
    skipNextUnmountPersist = false;
    return null;
  }
}

/** Player unmount cleanup: false if parent already flushed on navigate. */
export function consumeSkipNextUnmountPersist() {
  if (!skipNextUnmountPersist) return false;
  skipNextUnmountPersist = false;
  return true;
}

function sendKeepaliveProgress(code, payload) {
  const token = getIntlAccessToken();
  const baseURL = axios?.defaults?.baseURL || '/api';
  if (!token || !code) return;
  const body = {
    ...(payload || {}),
    // Fort: lastPosition stays float — never Math.round.
    lastPositionSeconds: Math.max(0, Number(payload?.lastPositionSeconds) || 0),
    watchedSeconds: Number(Math.max(0, Number(payload?.watchedSeconds) || 0).toFixed(2)),
    durationSeconds: Math.max(0, Math.round(Number(payload?.durationSeconds) || 0)),
  };
  try {
    fetch(`${baseURL}/intl-pathway/modules/${encodeURIComponent(code)}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export async function saveIntlModuleProgress(code, payload) {
  if (!code || !payloadHasWatchData(payload)) return null;
  const safePayload = {
    ...payload,
    lastPositionSeconds: Math.max(0, Number(payload.lastPositionSeconds) || 0),
    watchedSeconds: Number(Math.max(0, Number(payload.watchedSeconds) || 0).toFixed(2)),
    durationSeconds: Math.max(0, Math.round(Number(payload.durationSeconds) || 0)),
  };
  try {
    const data = await intlPathwayProgressService.saveModuleProgress(code, safePayload);
    pendingByCode.delete(code);
    return data;
  } catch (error) {
    pendingByCode.set(code, { code, payload: { ...safePayload }, enqueuedAt: Date.now() });
    if (typeof window !== 'undefined') {
      if (flushTimer) window.clearTimeout(flushTimer);
      flushTimer = window.setTimeout(() => {
        void flushPendingIntlModuleProgress();
      }, 1200);
    }
    throw error;
  }
}

function payloadHasWatchData(payload) {
  if (!payload) return false;
  if (Array.isArray(payload.watchedCoverageRanges) && payload.watchedCoverageRanges.length > 0) {
    return true;
  }
  return Number(payload.watchedSeconds) > 0 || Number(payload.lastPositionSeconds) > 0;
}

export function saveIntlModuleProgressOnUnload(code, payload) {
  if (!code || !payloadHasWatchData(payload)) return;
  pendingByCode.set(code, { code, payload: { ...payload }, enqueuedAt: Date.now() });
  sendKeepaliveProgress(code, payload);
  void saveIntlModuleProgress(code, payload).catch(() => {});
}

export async function flushPendingIntlModuleProgress() {
  const results = [];
  for (const entry of [...pendingByCode.values()]) {
    if (!payloadHasWatchData(entry?.payload)) {
      pendingByCode.delete(entry.code);
      continue;
    }
    try {
      const data = await intlPathwayProgressService.saveModuleProgress(entry.code, entry.payload);
      pendingByCode.delete(entry.code);
      if (data) results.push({ code: entry.code, data });
    } catch {
      // keep queued in memory for this tab session only
    }
  }
  return results;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (flushTimer) window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      void flushPendingIntlModuleProgress();
    }, 400);
  });
}
