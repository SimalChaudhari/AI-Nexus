export const FOUNDATION = ['01-00', '01-01', '01-02', '01-03', '01-04', '01-05', '01-06'];

export const DEFAULT_FOUNDATION_NOTE =
  "We recommend that all learners complete these modules first, to form a strong foundation in AI basics, safe use, prompting, documents and everyday workflows.";

/** 10h aim; don't auto-fill past ~10h40m (minutes) */
export const TARGET = 600;
export const CAP = 640;

export const TIER = {
  3: { k: 't3', label: 'Essential' },
  2: { k: 't2', label: 'Recommended' },
  1: { k: 't1', label: 'Optional' },
};

export function fmtMinutes(min) {
  const raw = Number(min);
  if (!Number.isFinite(raw) || raw <= 0) return '0m';

  // Exact split — no rounding of hours/minutes.
  const totalSeconds = Math.round(Math.abs(raw) * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || (hours === 0 && seconds === 0)) parts.push(`${minutes}m`);
  // Only show seconds when the source had a fractional minute (exact leftover).
  if (seconds > 0 && !Number.isInteger(raw)) parts.push(`${seconds}s`);

  return parts.join(' ') || '0m';
}

/** Compact exact clock for meters: 9h 32m (never rounds minutes up/down). */
export function fmtClock(min) {
  return fmtMinutes(min);
}

/** Prefer API minutes, then catalog row minutes. Always a finite number. */
export function resolveModuleMinutes(code, minutesByCode, modulesByCode) {
  const fromApi = Number(minutesByCode?.[code]);
  if (Number.isFinite(fromApi) && fromApi > 0) return fromApi;
  const fromRow = Number(modulesByCode?.[code]?.minutes);
  if (Number.isFinite(fromRow) && fromRow > 0) return fromRow;
  return 0;
}

export function sumSelectedMinutes(selectedCodes, minutesByCode, modulesByCode) {
  return [...selectedCodes].reduce(
    (total, code) => total + resolveModuleMinutes(code, minutesByCode, modulesByCode),
    0
  );
}

export function roleFoundation(role) {
  const ex = new Set(role.reqExclude || []);
  const base = FOUNDATION.filter((c) => !ex.has(c));
  return [...base, ...(role.reqAdd || [])];
}

export function roleEntries(role, foundationSet) {
  const locked = new Set(roleFoundation(role));
  return Object.entries(role.scores || {}).filter(([c]) => !locked.has(c) && !foundationSet.has(c));
}

export function autoSelect(role, modulesByCode, foundationSet, minutesByCode = {}) {
  const req = roleFoundation(role);
  const selected = new Set(req);
  const entries = roleEntries(role, foundationSet);
  const mins = (code) => resolveModuleMinutes(code, minutesByCode, modulesByCode);

  entries.filter(([, v]) => v === 3).forEach(([c]) => selected.add(c));

  let total = [...selected].reduce((t, c) => t + mins(c), 0);

  [2, 1].forEach((score) => {
    entries
      .filter(([, v]) => v === score)
      .sort((a, b) => mins(a[0]) - mins(b[0]))
      .forEach(([c]) => {
        const add = mins(c);
        if (total < TARGET && total + add <= CAP) {
          selected.add(c);
          total += add;
        }
      });
  });

  return selected;
}
