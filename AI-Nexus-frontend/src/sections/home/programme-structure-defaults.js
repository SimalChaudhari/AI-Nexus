export const DEFAULT_PROGRAMME_STRUCTURE_CONTENT = {
  eyebrow: '',
  heading: 'Your AI Fluency Journey',
  headingUnderlineWord: 'Fluency',
  phases: [
    {
      id: 'journey-register',
      label: '1',
      title: 'Register',
      description: 'Join the movement in minutes',
      icon: 'solar:user-plus-bold',
    },
    {
      id: 'journey-learn',
      label: '2',
      title: 'Learn',
      description: 'Build AI knowledge at your own pace',
      icon: 'solar:book-2-bold',
    },
    {
      id: 'journey-practice',
      label: '3',
      title: 'Practice',
      description: 'Apply AI skills in real-world scenarios',
      icon: 'solar:lightbulb-bolt-bold',
    },
    {
      id: 'journey-community',
      label: '4',
      title: 'Community',
      description: 'Connect, learn and grow together',
      icon: 'solar:users-group-rounded-bold',
    },
    {
      id: 'journey-certification',
      label: '5',
      title: 'Certification',
      description: 'Earn AI Fluency credentials',
      icon: 'solar:medal-ribbons-star-bold',
    },
    {
      id: 'journey-career',
      label: '6',
      title: 'Career Growth',
      description: 'Unlock new opportunities and stay ahead',
      icon: 'solar:chart-2-bold',
    },
  ],
};

export const PROGRAMME_STRUCTURE_PHASES_MAX = 8;

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Fallback icons/colors when admin has not set per-phase icons (alternating red / navy). */
export const PROGRAMME_STRUCTURE_PHASE_ICON_DEFAULTS = [
  'solar:user-plus-bold',
  'solar:book-2-bold',
  'solar:lightbulb-bolt-bold',
  'solar:users-group-rounded-bold',
  'solar:medal-ribbons-star-bold',
  'solar:chart-2-bold',
];

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
    return {
      ...DEFAULT_PROGRAMME_STRUCTURE_CONTENT,
      phases: DEFAULT_PROGRAMME_STRUCTURE_CONTENT.phases.map((row) => ({ ...row })),
    };
  }
  const rawPhases = Array.isArray(source.phases) ? source.phases : [];
  return {
    eyebrow: source.eyebrow != null ? String(source.eyebrow) : '',
    heading:
      source.heading != null
        ? String(source.heading)
        : DEFAULT_PROGRAMME_STRUCTURE_CONTENT.heading,
    headingUnderlineWord:
      source.headingUnderlineWord != null
        ? String(source.headingUnderlineWord)
        : DEFAULT_PROGRAMME_STRUCTURE_CONTENT.headingUnderlineWord,
    phases: rawPhases.slice(0, PROGRAMME_STRUCTURE_PHASES_MAX).map((row, index) => ({
      id: normalizePhaseId(row?.id),
      label: String(row?.label ?? '').trim() || `Phase ${index + 1}`,
      title: row?.title != null ? String(row.title) : '',
      description: row?.description != null ? String(row.description) : '',
      icon: row?.icon != null ? String(row.icon).trim() : '',
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
  const normalized = normalizeProgrammeStructureContent(source);
  if (hasProgrammeStructureContent(normalized)) {
    return normalized;
  }
  return normalizeProgrammeStructureContent(null);
}
