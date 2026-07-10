/** Parse HH:MM:SS, MM:SS, or raw seconds into total seconds (0 if invalid). */
export function parseWatchtimeToSeconds(value?: string | null): number {
  const text = String(value || '').trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number(text) || 0;
  const hms = text.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (hms) {
    const h = Number(hms[1]);
    const m = Number(hms[2]);
    const s = Number(hms[3]);
    if ([h, m, s].some((n) => Number.isNaN(n)) || m > 59 || s > 59) return 0;
    return h * 3600 + m * 60 + s;
  }
  const ms = text.match(/^(\d+):(\d{1,2})$/);
  if (ms) {
    const m = Number(ms[1]);
    const s = Number(ms[2]);
    if ([m, s].some((n) => Number.isNaN(n)) || s > 59) return 0;
    return m * 60 + s;
  }
  return 0;
}

/** Watchtime must not exceed full video length when both are set. */
export function reconcileSectionVideoTimingFields(
  watchtime?: string | null,
  durationTime?: string | null,
): { watchtime: string | null; durationTime: string | null } {
  const wt = watchtime ?? null;
  const dt = durationTime ?? null;
  const watchSeconds = parseWatchtimeToSeconds(wt);
  const durationSeconds = parseWatchtimeToSeconds(dt);
  if (durationSeconds > 0 && watchSeconds > durationSeconds) {
    return { watchtime: dt, durationTime: dt };
  }
  return { watchtime: wt, durationTime: dt };
}
