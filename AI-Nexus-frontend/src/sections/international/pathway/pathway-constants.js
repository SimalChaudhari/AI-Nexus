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
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export function roleFoundation(role) {
  const ex = new Set(role.reqExclude || []);
  const base = FOUNDATION.filter((c) => !ex.has(c));
  return [...base, ...(role.reqAdd || [])];
}

export function roleEntries(role, foundationSet) {
  const locked = new Set(roleFoundation(role));
  return Object.entries(role.scores).filter(([c]) => !locked.has(c) && !foundationSet.has(c));
}

export function autoSelect(role, modulesByCode, foundationSet) {
  const req = roleFoundation(role);
  const selected = new Set(req);
  const entries = roleEntries(role, foundationSet);

  entries.filter(([, v]) => v === 3).forEach(([c]) => selected.add(c));

  let total = [...selected].reduce((t, c) => t + modulesByCode[c].minutes, 0);

  [2, 1].forEach((score) => {
    entries
      .filter(([, v]) => v === score)
      .sort((a, b) => modulesByCode[a[0]].minutes - modulesByCode[b[0]].minutes)
      .forEach(([c]) => {
        if (total < TARGET && total + modulesByCode[c].minutes <= CAP) {
          selected.add(c);
          total += modulesByCode[c].minutes;
        }
      });
  });

  return selected;
}
