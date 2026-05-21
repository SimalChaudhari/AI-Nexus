export const DEFAULT_CURRICULUM_CONTENT = {
  smallTitle: 'POWER-UP PHASE CURRICULUM',
  subtext: 'Gain applied knowledge to master the use of AI coding assistants.',
  hoursLabel: '18 hours',
  pacingLabel: '100% self-paced',
  courseIds: [],
};

export const CURRICULUM_COURSES_MAX = 20;

export function normalizeCurriculumContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      ...DEFAULT_CURRICULUM_CONTENT,
      courseIds: [],
    };
  }

  const rawIds = Array.isArray(source.courseIds)
    ? source.courseIds
    : source.courseId
      ? [source.courseId]
      : [];
  const seen = new Set();
  const courseIds = [];

  rawIds.forEach((id) => {
    const value = String(id || '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    courseIds.push(value);
  });

  return {
    smallTitle:
      source.smallTitle != null
        ? String(source.smallTitle)
        : DEFAULT_CURRICULUM_CONTENT.smallTitle,
    subtext:
      source.subtext != null ? String(source.subtext) : DEFAULT_CURRICULUM_CONTENT.subtext,
    hoursLabel:
      source.hoursLabel != null
        ? String(source.hoursLabel)
        : DEFAULT_CURRICULUM_CONTENT.hoursLabel,
    pacingLabel:
      source.pacingLabel != null
        ? String(source.pacingLabel)
        : DEFAULT_CURRICULUM_CONTENT.pacingLabel,
    courseIds: courseIds.slice(0, CURRICULUM_COURSES_MAX),
  };
}

export function buildCurriculumHeadline(moduleCount, content) {
  const parts = [];
  const count = Number(moduleCount) || 0;
  parts.push(`${count} module${count === 1 ? '' : 's'}`);
  const hours = String(content?.hoursLabel || '').trim();
  const pacing = String(content?.pacingLabel || '').trim();
  if (hours) parts.push(hours);
  if (pacing) parts.push(pacing);
  return parts.join(' · ');
}

export function mapModulesForDisplay(modules = []) {
  return (modules || [])
    .map((row, index) => ({
      index: Number.isFinite(row?.index) ? Number(row.index) : index,
      title: String(row?.title || '').trim(),
      description: String(row?.description || '').trim(),
      courseId: row?.courseId != null ? String(row.courseId) : '',
    }))
    .filter((row) => row.title);
}
