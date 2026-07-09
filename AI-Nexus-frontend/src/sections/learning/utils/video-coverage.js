/** Shared video segment coverage helpers (Udemy-style unique seconds watched). */

export function parseCoverageRangePairs(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const a = Number(item[0]);
    const b = Number(item[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    out.push([a, b]);
  }
  return out;
}

export function mergeCoverageRanges(ranges) {
  if (!ranges.length) return [];
  // Close tiny holes from play/pause / poll jitter so watch coverage stays continuous.
  const GAP_FILL_SEC = 0.75;
  const sorted = ranges
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)])
    .filter(([s, e]) => e > s && Number.isFinite(s) && Number.isFinite(e))
    .sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (!last || s > last[1] + GAP_FILL_SEC) out.push([s, e]);
    else last[1] = Math.max(last[1], e);
  }
  return out;
}

/** Union existing + incoming ranges — never shrinks local coverage (out-of-order server race). */
export function mergeCoverageRangesMonotonic(existing, incoming, maxDuration = 0) {
  const merged = mergeCoverageRanges([
    ...parseCoverageRangePairs(existing),
    ...parseCoverageRangePairs(incoming),
  ]);
  const dur = roundedVideoDurationSeconds(maxDuration);
  if (dur > 0) return clipCoverageRanges(merged, dur);
  return merged;
}

export function clipCoverageRanges(ranges, maxDuration) {
  if (!maxDuration || maxDuration <= 0) return mergeCoverageRanges(ranges);
  const clipped = [];
  for (const [s0, e0] of ranges) {
    const lo = Math.min(s0, e0);
    const hi = Math.max(s0, e0);
    const s = Math.max(0, lo);
    const e = Math.min(maxDuration, hi);
    if (e > s) clipped.push([s, e]);
  }
  return mergeCoverageRanges(clipped);
}

/** Whole-second duration used for progress accounting (matches displayed mm:ss). */
export function roundedVideoDurationSeconds(duration) {
  return Math.max(0, Math.round(Number(duration) || 0));
}

/**
 * True when playback is on the final video second or the player fired `ended`.
 * Uses integer-second boundaries — no float epsilon (audit-friendly).
 */
export function isPlaybackAtVideoEnd(position, duration, { ended = false } = {}) {
  if (ended) return true;
  const totalSec = roundedVideoDurationSeconds(duration);
  if (totalSec <= 0) return false;
  const positionSec = Math.max(0, Number(position) || 0);
  return Math.ceil(positionSec) >= totalSec;
}

/** @deprecated Use isPlaybackAtVideoEnd */
export function playbackReachedEnd(position, duration, ended = false) {
  return isPlaybackAtVideoEnd(position, duration, { ended });
}

/**
 * Seal the last coverage segment to the rounded video duration.
 * Only extends when coverage already includes the final second (prevents seek-to-end fraud).
 */
export function sealCoverageRangesToVideoEnd(ranges, maxDuration) {
  const duration = roundedVideoDurationSeconds(maxDuration);
  if (duration <= 0) return mergeCoverageRanges(ranges);
  const merged = clipCoverageRanges(ranges, duration);
  if (!merged.length) return merged;
  const last = merged[merged.length - 1];
  if (Math.ceil(last[1]) >= duration - 1) {
    last[1] = duration;
  }
  return merged;
}

/** Unique seconds covered by merged ranges (single source of truth for watchedSeconds). */
export function coverageMeasureSeconds(ranges, maxDuration) {
  const duration = roundedVideoDurationSeconds(maxDuration);
  const merged =
    duration > 0 ? clipCoverageRanges(ranges, duration) : mergeCoverageRanges(ranges);
  let total = 0;
  for (const [s, e] of merged) total += e - s;
  const measured = Math.floor(Math.max(0, total));
  return duration > 0 ? Math.min(duration, measured) : measured;
}

/** Progress % from unique watched coverage. Completion status does not inflate this to 100. */
export function coveragePercentDisplay(watchedSec, durationSec, { isComplete = false } = {}) {
  const duration = Math.max(0, Number(durationSec) || 0);
  const watched = Math.max(0, Number(watchedSec) || 0);
  if (duration <= 0) return watched > 0 || isComplete ? 1 : 0;
  const pct = Math.round((100 * Math.min(duration, watched)) / duration);
  // Show true coverage; only reach 100 when the full video range is actually watched.
  return Math.max(0, Math.min(100, pct));
}

/** Gaps in [0, duration] not covered by watched ranges. */
export function computeUnwatchedRanges(watchedRanges, durationSec) {
  const duration = Math.max(0, Number(durationSec) || 0);
  if (duration <= 0) return [];
  const watched = clipCoverageRanges(watchedRanges, duration);
  if (!watched.length) return [[0, duration]];

  const gaps = [];
  let cursor = 0;
  for (const [start, end] of watched) {
    if (start > cursor + 0.25) gaps.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < duration - 0.25) gaps.push([cursor, duration]);
  return gaps;
}

export function formatSecondsToClock(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatRangeLabel([start, end]) {
  return `${formatSecondsToClock(start)}–${formatSecondsToClock(end)}`;
}
