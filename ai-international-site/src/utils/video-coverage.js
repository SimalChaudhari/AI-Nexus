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

/**
 * Fort LMS: add unique coverage only for real playback. Jumps do not fill gaps unless
 * wall-clock since the last tick explains the delta (poll lag / background tab).
 */
export function appendCoverageSlice(rangesRef, from, to, maxDuration, { atEnd = false, wallElapsedMs = null } = {}) {
  const lo = Number(from);
  const hi = Number(to);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const rawDelta = b - a;
  if (rawDelta <= 0) return;

  const LEGACY_POLL_MAX_SEC = 2.5;
  // Hard cap: seeks jump faster than real time — never credit a scrub as continuous watch.
  const HARD_MAX_SLICE_SEC = 8;
  const durationCap = Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : 7200;
  let maxAcceptSec = LEGACY_POLL_MAX_SEC;
  if (Number.isFinite(wallElapsedMs) && wallElapsedMs != null && wallElapsedMs >= 0) {
    maxAcceptSec = Math.min(
      durationCap,
      HARD_MAX_SLICE_SEC,
      Math.max(LEGACY_POLL_MAX_SEC, (wallElapsedMs / 1000) * 1.5 + 1.5),
    );
  } else {
    maxAcceptSec = Math.min(HARD_MAX_SLICE_SEC, maxAcceptSec);
  }
  if (!atEnd && rawDelta > maxAcceptSec) return;

  const cap = Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : null;
  const start = Math.max(0, a);
  let end = cap != null ? Math.min(cap, b) : b;
  if (cap != null && atEnd) end = cap;
  if (end <= start) return;
  const prev = Array.isArray(rangesRef.current) ? rangesRef.current : [];
  const merged = mergeCoverageRanges([...parseCoverageRangePairs(prev), [start, end]]);
  rangesRef.current = cap != null ? clipCoverageRanges(merged, cap) : merged;
}

export function roundedVideoDurationSeconds(duration) {
  return Math.max(0, Math.round(Number(duration) || 0));
}

export function isPlaybackAtVideoEnd(position, duration, { ended = false } = {}) {
  if (ended) return true;
  const totalSec = roundedVideoDurationSeconds(duration);
  if (totalSec <= 0) return false;
  const positionSec = Math.max(0, Number(position) || 0);
  return Math.ceil(positionSec) >= totalSec;
}

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

export function totalUnwatchedGapSeconds(watchedRanges, durationSec) {
  const gaps = computeUnwatchedRanges(watchedRanges, durationSec);
  return gaps.reduce((sum, [start, end]) => sum + Math.max(0, end - start), 0);
}

export function isTimelineFullyCovered(watchedRanges, durationSec) {
  const duration = roundedVideoDurationSeconds(durationSec);
  if (duration <= 0) return false;
  return totalUnwatchedGapSeconds(watchedRanges, duration) < 1;
}

export function sealCoverageRangesWhenComplete(ranges, durationSec) {
  const duration = roundedVideoDurationSeconds(durationSec);
  if (duration <= 0) return mergeCoverageRanges(ranges);
  const clipped = clipCoverageRanges(ranges, duration);
  if (!isTimelineFullyCovered(clipped, duration)) return clipped;
  return [[0, duration]];
}

export function coverageMeasureSeconds(ranges, maxDuration) {
  const duration = roundedVideoDurationSeconds(maxDuration);
  const merged =
    duration > 0 ? clipCoverageRanges(ranges, duration) : mergeCoverageRanges(ranges);
  if (duration > 0 && isTimelineFullyCovered(merged, duration)) {
    return duration;
  }
  let total = 0;
  for (const [s, e] of merged) total += e - s;
  // Fort-accurate: keep fractional coverage (2dp). Do not Math.round away real watch time.
  const measured = Number(Math.max(0, total).toFixed(2));
  return duration > 0 ? Math.min(duration, measured) : measured;
}

/** Progress % from unique watched coverage. Display as whole integers (Fort sidebar style). */
export function coveragePercentDisplay(watchedSec, durationSec, { isComplete = false } = {}) {
  const duration = Math.max(0, Number(durationSec) || 0);
  const watched = Math.max(0, Number(watchedSec) || 0);
  if (duration <= 0) return watched > 0 || isComplete ? 1 : 0;
  // Only show 100% when every second is covered — never round 406/407 up to 100.
  if (watched >= duration) return 100;
  if (!(watched > 0)) return isComplete ? 100 : 0;
  const pct = Math.round((100 * watched) / duration);
  return Math.max(1, Math.min(99, pct));
}

/** Exact playhead seconds — no Math.round (resume must match real player time). */
export function precisePlaybackSeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Serialize coverage ranges to centisecond precision (Fort PUT payload). */
export function serializeCoverageRangesPrecise(ranges) {
  return parseCoverageRangePairs(ranges).map(([s, e]) => [
    Math.round(s * 100) / 100,
    Math.round(e * 100) / 100,
  ]);
}

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

/**
 * Resume playhead from unique coverage when lastPosition is missing/wiped.
 * Uses the end of the latest substantial range (ignores tiny skip fragments).
 */
export function coverageResumeSeconds(ranges) {
  const merged = mergeCoverageRanges(parseCoverageRangePairs(ranges));
  if (!merged.length) return 0;
  const MIN_SPAN = 8;
  for (let i = merged.length - 1; i >= 0; i -= 1) {
    const [start, end] = merged[i];
    if (end - start >= MIN_SPAN && end > 2) return end;
  }
  const lastEnd = merged[merged.length - 1][1];
  return lastEnd > 2 ? lastEnd : 0;
}
