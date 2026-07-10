import axios from 'src/utils/axios';
import { ensureFreshAuthSession } from 'src/auth/context/jwt/axios-interceptors';

// ----------------------------------------------------------------------
// Reliable section progress PUTs: queue failed saves, flush after refresh/online,
// and harden tab-close saves when the access cookie may be expired.

const STORAGE_KEY = 'ainexus:pending-section-progress';
const FLUSH_DEBOUNCE_MS = 1500;
const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { courseId: string, sectionId: string, payload: object, enqueuedAt: number }>} */
const pendingByKey = new Map();
let flushTimer = null;
let flushInFlight = null;
let onlineListenerAttached = false;

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );

function progressKey(courseId, sectionId) {
  return `${courseId}:${sectionId}`;
}

function persistQueue() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const rows = [...pendingByKey.values()];
    if (rows.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore quota / private mode
  }
}

function hydrateQueueFromStorage() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return;
    const now = Date.now();
    rows.forEach((row) => {
      if (!row?.courseId || !isUuid(row?.sectionId) || !row?.payload) return;
      if (now - Number(row.enqueuedAt || 0) > MAX_QUEUE_AGE_MS) return;
      pendingByKey.set(progressKey(row.courseId, row.sectionId), {
        courseId: row.courseId,
        sectionId: row.sectionId,
        payload: row.payload,
        enqueuedAt: Number(row.enqueuedAt) || now,
      });
    });
  } catch {
    // ignore corrupt storage
  }
}

function ensureOnlineFlushListener() {
  if (onlineListenerAttached || typeof window === 'undefined') return;
  onlineListenerAttached = true;
  window.addEventListener('online', () => {
    scheduleFlushPendingSectionProgress(0);
  });
}

/**
 * Keep the latest failed/unload payload per section so a later flush can recover accuracy.
 */
export function enqueueSectionProgress(courseId, sectionId, payload) {
  if (!courseId || !isUuid(sectionId) || !payload || typeof payload !== 'object') return;
  pendingByKey.set(progressKey(courseId, sectionId), {
    courseId,
    sectionId,
    payload: { ...payload },
    enqueuedAt: Date.now(),
  });
  persistQueue();
  ensureOnlineFlushListener();
  scheduleFlushPendingSectionProgress();
}

export function clearQueuedSectionProgress(courseId, sectionId) {
  if (!courseId || !sectionId) return;
  if (pendingByKey.delete(progressKey(courseId, sectionId))) {
    persistQueue();
  }
}

function scheduleFlushPendingSectionProgress(delayMs = FLUSH_DEBOUNCE_MS) {
  if (typeof window === 'undefined') return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPendingSectionProgress();
  }, delayMs);
}

async function putSectionProgress(courseId, sectionId, payload) {
  const response = await axios.put(
    `/courses/${courseId}/sections/${sectionId}/progress`,
    payload,
    { skipApiLoading: true }
  );
  return response.data?.data ?? response.data ?? null;
}

function sendKeepaliveProgress(courseId, sectionId, payload) {
  const baseURL = axios?.defaults?.baseURL || '';
  if (!baseURL || !courseId || !isUuid(sectionId)) return;
  try {
    fetch(`${baseURL}/courses/${courseId}/sections/${sectionId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload || {}),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore keepalive errors
  }
}

/**
 * Flush queued progress saves (after network recovery, remount, or post-refresh).
 * Returns the last successful response for callers that want to merge into UI.
 */
export async function flushPendingSectionProgress() {
  hydrateQueueFromStorage();
  if (pendingByKey.size === 0) return [];
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    const results = [];
    const entries = [...pendingByKey.values()];
    for (const entry of entries) {
      try {
        const data = await putSectionProgress(entry.courseId, entry.sectionId, entry.payload);
        clearQueuedSectionProgress(entry.courseId, entry.sectionId);
        if (data) results.push({ courseId: entry.courseId, sectionId: entry.sectionId, data });
      } catch {
        // Keep queued; retry on next online / heartbeat / remount.
      }
    }
    return results;
  })().finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}

/**
 * Normal in-session save. On failure, queues for retry (axios already retries once after 401 refresh).
 */
export async function saveSectionProgress(courseId, sectionId, payload = {}) {
  if (!courseId || !isUuid(sectionId)) return null;
  try {
    const data = await putSectionProgress(courseId, sectionId, payload);
    clearQueuedSectionProgress(courseId, sectionId);
    return data;
  } catch (error) {
    enqueueSectionProgress(courseId, sectionId, payload);
    throw error;
  }
}

/**
 * Tab hide / close / unload path:
 * 1) Queue payload so a remount can recover if keepalive fails
 * 2) Fire keepalive immediately (survives page teardown)
 * 3) Best-effort refresh + axios PUT while the document is still briefly alive
 */
export function saveSectionProgressOnUnload(courseId, sectionId, payload = {}) {
  if (!courseId || !isUuid(sectionId)) return;
  enqueueSectionProgress(courseId, sectionId, payload);
  sendKeepaliveProgress(courseId, sectionId, payload);

  void (async () => {
    try {
      await ensureFreshAuthSession(axios);
      const data = await putSectionProgress(courseId, sectionId, payload);
      clearQueuedSectionProgress(courseId, sectionId);
      return data;
    } catch {
      // Keepalive + queue remain as fallback.
      return null;
    }
  })();
}

// Hydrate once at module load so a hard refresh can still flush.
hydrateQueueFromStorage();
ensureOnlineFlushListener();
