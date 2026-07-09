/**
 * Equal-weight course progress: each section + quiz + assessment counts as one unit.
 * Example: 3 sections + quiz + assessment = 5 units → each worth 20% when complete.
 */

export function summarizeProgressUnits(units) {
  const total = Array.isArray(units) ? units.length : 0;
  if (total === 0) {
    return { percent: 0, completed: 0, total: 0, isComplete: false };
  }
  const completed = units.filter((u) => u.isDone).length;
  const percentSum = units.reduce(
    (sum, u) => sum + Math.max(0, Math.min(100, Number(u.percent) || 0)),
    0
  );
  return {
    percent: Math.round(percentSum / total),
    completed,
    total,
    isComplete: completed === total,
  };
}

export function getModuleProgressFromUnits(units, moduleId) {
  const moduleUnits = (units || []).filter((u) => u.moduleId === moduleId);
  return summarizeProgressUnits(moduleUnits);
}

/**
 * Build all progress units for a course (sections, module quiz/assessment, course-end quiz/assessment).
 */
export function buildCourseProgressUnits({
  modules = [],
  quizCountByModuleId = {},
  assignmentCountByModuleId = {},
  quizAssessmentScopeByModuleId = {},
  courseEndQuizAssessmentScope = null,
  isCourseEndModel = false,
  courseEndQuizCount = 0,
  courseEndAssignmentCount = 0,
  courseEndAssignmentAllowed = false,
  isModuleQuizPerfect = () => false,
  isCourseEndQuizPerfect = false,
  getLessonUnitPercent,
}) {
  const units = [];

  (modules || []).forEach((module) => {
    (module.lessons || []).forEach((lesson) => {
      const { percent, isDone } = getLessonUnitPercent(lesson);
      units.push({
        type: 'section',
        moduleId: module.id,
        id: lesson.id,
        percent,
        isDone,
      });
    });

    if (!isCourseEndModel && (quizCountByModuleId[module.id] || 0) > 0) {
      const isDone = isModuleQuizPerfect(module.id);
      units.push({
        type: 'quiz',
        moduleId: module.id,
        id: `quiz-${module.id}`,
        percent: isDone ? 100 : 0,
        isDone,
      });
    }

    if (!isCourseEndModel && (assignmentCountByModuleId[module.id] || 0) > 0) {
      const isDone = Boolean(quizAssessmentScopeByModuleId[module.id]?.assignmentCompleted);
      units.push({
        type: 'assessment',
        moduleId: module.id,
        id: `assessment-${module.id}`,
        percent: isDone ? 100 : 0,
        isDone,
      });
    }
  });

  if (isCourseEndModel && courseEndQuizCount > 0) {
    const isDone = Boolean(isCourseEndQuizPerfect);
    units.push({
      type: 'course-end-quiz',
      moduleId: null,
      id: '__course_end_quiz__',
      percent: isDone ? 100 : 0,
      isDone,
    });
  }

  if (courseEndAssignmentAllowed && courseEndAssignmentCount > 0) {
    const isDone = Boolean(courseEndQuizAssessmentScope?.assignmentCompleted);
    units.push({
      type: 'course-end-assessment',
      moduleId: null,
      id: '__course_end_assignment__',
      percent: isDone ? 100 : 0,
      isDone,
    });
  }

  return units;
}
