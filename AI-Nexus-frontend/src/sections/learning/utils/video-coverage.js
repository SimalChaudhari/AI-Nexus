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
  const sorted = ranges
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)])
    .filter(([s, e]) => e > s && Number.isFinite(s) && Number.isFinite(e))
    .sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (!last || s > last[1]) out.push([s, e]);
    else last[1] = Math.max(last[1], e);
  }
  return out;
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

export function coverageMeasureSeconds(ranges, maxDuration) {
  const merged =
    maxDuration > 0 ? clipCoverageRanges(ranges, maxDuration) : mergeCoverageRanges(ranges);
  let total = 0;
  for (const [s, e] of merged) total += e - s;
  return Math.floor(Math.max(0, total));
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
