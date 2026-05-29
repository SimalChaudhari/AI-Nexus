export const CURRICULUM_COURSES_MAX = 20;

export function normalizeCurriculumContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      smallTitle: '',
      subtext: '',
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
    smallTitle: source.smallTitle != null ? String(source.smallTitle) : '',
    subtext: source.subtext != null ? String(source.subtext) : '',
    courseIds: courseIds.slice(0, CURRICULUM_COURSES_MAX),
  };
}

export function buildCurriculumHeadline(moduleCount) {
  const count = Number(moduleCount) || 0;
  if (count <= 0) return '';
  return `${count} module${count === 1 ? '' : 's'}`;
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
