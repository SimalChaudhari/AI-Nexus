import {
  coverageMeasureSeconds,
  isTimelineFullyCovered,
  mergeCoverageRangesMonotonic,
  parseCoverageRangePairs,
} from 'src/utils/video-coverage';

/**
 * In-memory only (no localStorage / sessionStorage).
 * Server DB is the source of truth; React state holds the live map for the session.
 */
const memoryProgressByCode = new Map();

/** One-time wipe of legacy browser progress keys from older builds. */
export function clearLegacyIntlProgressBrowserStorage() {
  if (typeof window === 'undefined') return;
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('intl:watch-progress:') ||
          key === 'intl:pending-module-progress' ||
          key.startsWith('intl:open-pathway-videos:'))
      ) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.startsWith('intl:watch-progress:') ||
          key === 'intl:pending-module-progress' ||
          key.startsWith('intl:open-pathway-videos:'))
      ) {
        keys.push(key);
      }
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  clearLegacyIntlProgressBrowserStorage();
}

export function readCachedProgressMap() {
  const out = {};
  memoryProgressByCode.forEach((row, code) => {
    out[code] = row;
  });
  return out;
}

export function readCachedModuleProgress(code) {
  if (!code) return null;
  return memoryProgressByCode.get(code) || null;
}

export function writeCachedModuleProgress(code, row) {
  if (!code || !row) return;
  memoryProgressByCode.set(code, mergeProgressRow(memoryProgressByCode.get(code), row));
}

export function writeCachedProgressMap(nextMap) {
  memoryProgressByCode.clear();
  Object.entries(nextMap && typeof nextMap === 'object' ? nextMap : {}).forEach(([code, row]) => {
    if (code && row) memoryProgressByCode.set(code, row);
  });
}

export function clearCachedProgressMap() {
  memoryProgressByCode.clear();
}

export function mergeProgressRow(current, incoming, { allowReset = false } = {}) {
  if (!incoming) return current || null;
  if (!current) return incoming;

  const incomingWatched = Number(incoming.watchedSeconds) || 0;
  const incomingPos = Number(incoming.lastPositionSeconds) || 0;
  const incomingRanges = Array.isArray(incoming.watchedCoverageRanges)
    ? incoming.watchedCoverageRanges
    : [];
  const incomingEmpty =
    !incoming.isCompleted &&
    incomingWatched <= 0 &&
    incomingPos <= 2 &&
    incomingRanges.length === 0;

  // After DB wipe / empty GET — do not keep a stale end-of-video playhead.
  if (allowReset && incomingEmpty) {
    return {
      ...incoming,
      lastPositionSeconds: 0,
      watchedSeconds: 0,
      watchedCoverageRanges: [],
      isCompleted: false,
    };
  }

  const currentWatched = Number(current.watchedSeconds) || 0;
  const richer = incomingWatched >= currentWatched ? incoming : current;
  const other = richer === incoming ? current : incoming;
  const mergedDuration = Math.max(
    Number(current.durationSeconds) || 0,
    Number(incoming.durationSeconds) || 0,
    Number(current.videoDurationSeconds) || 0,
    Number(incoming.videoDurationSeconds) || 0,
  );
  const mergedRanges = mergeCoverageRangesMonotonic(
    current.watchedCoverageRanges,
    incoming.watchedCoverageRanges,
    mergedDuration,
  );
  const watchedFromRanges = mergedRanges.length
    ? coverageMeasureSeconds(mergedRanges, mergedDuration)
    : 0;
  return {
    ...other,
    ...richer,
    lastPositionSeconds: (() => {
      const nextRaw = incoming.lastPositionSeconds;
      const currentPos = Math.max(0, Number(current.lastPositionSeconds) || 0);
      if (nextRaw == null || !Number.isFinite(Number(nextRaw))) return currentPos;
      const nextPos = Math.max(0, Number(nextRaw) || 0);
      // Empty GET / 0:00 server row must not wipe a live playhead mid-watch.
      if (!allowReset && nextPos <= 2 && currentPos > 2) return currentPos;
      return nextPos;
    })(),
    watchedSeconds: Math.max(currentWatched, incomingWatched, watchedFromRanges),
    durationSeconds: mergedDuration,
    videoDurationSeconds: mergedDuration,
    isCompleted: Boolean(current.isCompleted || incoming.isCompleted),
    watchedCoverageRanges: mergedRanges.length
      ? mergedRanges
      : richer.watchedCoverageRanges || other.watchedCoverageRanges || [],
    courseId: richer.courseId || other.courseId || current.courseId || incoming.courseId,
    moduleId: richer.moduleId || other.moduleId || current.moduleId || incoming.moduleId,
    sectionId: richer.sectionId || other.sectionId || current.sectionId || incoming.sectionId,
  };
}

export function bookmarkSecondsFromProgress(row, liveDuration = 0) {
  if (!row) return 0;
  // Fort Spotlightr: completed / fully watched lessons reopen from 0:00.
  if (row.isCompleted || row.isWatched) return 0;
  const dur = Math.max(
    0,
    Number(liveDuration) || 0,
    Number(row.durationSeconds) || 0,
    Number(row.videoDurationSeconds) || 0,
  );
  const ranges = parseCoverageRangePairs(row.watchedCoverageRanges);
  const watched = Math.max(
    Number(row.watchedSeconds) || 0,
    coverageMeasureSeconds(ranges, dur),
  );
  // No real watch progress → always open at 0:00 (never mid-video from a lone playhead).
  if (!(watched > 1)) return 0;
  const pos = Math.max(0, Number(row.lastPositionSeconds) || 0);
  if (!(pos > 2)) return 0;
  // Unknown duration — do not seek to a stale "end" bookmark from a previous session.
  if (!(dur > 0)) return 0;
  if (isTimelineFullyCovered(ranges, dur)) return 0;
  if (pos >= dur - 1) return 0;
  // Fort: resume from lastPosition bookmark only — never coverage range end.
  return pos;
}

export function mergeProgressMaps(currentMap, incomingMap) {
  const out = { ...(currentMap || {}) };
  Object.entries(incomingMap || {}).forEach(([code, row]) => {
    out[code] = mergeProgressRow(out[code], row);
  });
  return out;
}
