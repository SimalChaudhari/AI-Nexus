export const CURRICULUM_CATEGORIES_MAX = 20;
export const CURRICULUM_COURSES_MAX = 100;

function dedupeIds(rawIds, max) {
  const seen = new Set();
  const ids = [];

  (rawIds || []).forEach((id) => {
    const value = String(id || '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    ids.push(value);
  });

  return ids.slice(0, max);
}

export function normalizeCurriculumContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      smallTitle: '',
      subtext: '',
      categoryIds: [],
      courseIds: [],
    };
  }

  const categoryIds = dedupeIds(
    Array.isArray(source.categoryIds) ? source.categoryIds : [],
    CURRICULUM_CATEGORIES_MAX
  );

  const rawCourseIds = Array.isArray(source.courseIds)
    ? source.courseIds
    : source.courseId
      ? [source.courseId]
      : [];

  return {
    smallTitle: source.smallTitle != null ? String(source.smallTitle) : '',
    subtext: source.subtext != null ? String(source.subtext) : '',
    categoryIds,
    courseIds: dedupeIds(rawCourseIds, CURRICULUM_COURSES_MAX),
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

export function mapCategoriesForDisplay(categories = []) {
  return (categories || [])
    .map((row) => ({
      id: row?.id != null ? String(row.id) : '',
      title: String(row?.title || '').trim(),
      courseIds: Array.isArray(row?.courseIds)
        ? row.courseIds.map((id) => String(id || '')).filter(Boolean)
        : [],
      courses: Array.isArray(row?.courses)
        ? row.courses.map((course) => ({
            id: course?.id != null ? String(course.id) : '',
            title: String(course?.title || '').trim(),
            modulesCount: Number(course?.modulesCount) || 0,
            categoryId: course?.categoryId != null ? String(course.categoryId) : '',
          }))
        : [],
    }))
    .filter((row) => row.id && row.title);
}

export function buildDraftPreviewCategories({
  categoryIds = [],
  categoryCache = {},
  coursesByCategory = {},
  selectedCourseIds = [],
}) {
  const selectedSet = new Set(selectedCourseIds);

  return categoryIds
    .map((categoryId) => {
      const categoryTitle = String(categoryCache[categoryId]?.title || '').trim() || 'Category';
      const appliedIds = Array.isArray(categoryCache[categoryId]?.appliedCourseIds)
        ? categoryCache[categoryId].appliedCourseIds
        : [];
      const appliedCourses = Array.isArray(categoryCache[categoryId]?.appliedCourses)
        ? categoryCache[categoryId].appliedCourses
        : [];
      const loaded = Array.isArray(coursesByCategory[categoryId]) ? coursesByCategory[categoryId] : [];

      const courseIds = (
        appliedIds.length ? appliedIds : loaded.map((course) => course.id).filter(Boolean)
      ).filter((id) => selectedSet.has(id));

      const metaById = new Map();
      appliedCourses.forEach((course) => {
        if (course?.id) metaById.set(course.id, course);
      });
      loaded.forEach((course) => {
        if (course?.id && !metaById.has(course.id)) metaById.set(course.id, course);
      });

      const courses = courseIds.map((id) => {
        const meta = metaById.get(id);
        return {
          id,
          title: meta?.title || 'Course',
          modulesCount: Number(meta?.modulesCount) || 0,
          categoryId,
        };
      });

      return {
        id: categoryId,
        title: categoryTitle,
        courseIds: courses.map((c) => c.id),
        courses,
      };
    })
    .filter((row) => row.id);
}
