export const DEFAULT_PROGRAMME_STRUCTURE_CONTENT = {
  eyebrow: '',
  heading: '',
  phases: [],
};

export const PROGRAMME_STRUCTURE_PHASES_MAX = 8;

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function createProgrammePhaseId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizePhaseId(value) {
  const id = String(value ?? '').trim();
  return UUID_RE.test(id) ? id : '';
}

export function normalizeProgrammeStructureContent(source) {
  if (!source || typeof source !== 'object') {
    return { ...DEFAULT_PROGRAMME_STRUCTURE_CONTENT, phases: [] };
  }
  const rawPhases = Array.isArray(source.phases) ? source.phases : [];
  return {
    eyebrow: source.eyebrow != null ? String(source.eyebrow) : '',
    heading: source.heading != null ? String(source.heading) : '',
    phases: rawPhases.slice(0, PROGRAMME_STRUCTURE_PHASES_MAX).map((row, index) => ({
      id: normalizePhaseId(row?.id),
      label: String(row?.label ?? '').trim() || `Phase ${index + 1}`,
      title: row?.title != null ? String(row.title) : '',
      description: row?.description != null ? String(row.description) : '',
    })),
  };
}

export function hasProgrammeStructureContent(content) {
  const c = content || {};
  if (String(c.eyebrow || '').trim()) return true;
  if (String(c.heading || '').trim()) return true;
  const phases = Array.isArray(c.phases) ? c.phases : [];
  return phases.some(
    (row) =>
      String(row?.label || '').trim() ||
      String(row?.title || '').trim() ||
      String(row?.description || '').trim()
  );
}

export function resolveProgrammeStructureContent(source) {
  return normalizeProgrammeStructureContent(source);
}
