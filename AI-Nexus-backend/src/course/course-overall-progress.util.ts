import { CourseLevel } from './courses.entity';
import type { QuizAssessmentScopeProgress } from './course-quiz-assessment-progress.service';

export type ProgressUnit = {
  percent: number;
  isDone: boolean;
};

export type CourseOverallProgressSummary = {
  completionPercent: number;
  completedUnits: number;
  totalUnits: number;
  isCompleted: boolean;
};

export function summarizeProgressUnits(units: ProgressUnit[]): CourseOverallProgressSummary {
  const totalUnits = units.length;
  if (totalUnits === 0) {
    return { completionPercent: 0, completedUnits: 0, totalUnits: 0, isCompleted: false };
  }
  const completedUnits = units.filter((u) => u.isDone).length;
  // Match the item counter (e.g. 9/13 → 69%). Do not average partial watch %.
  return {
    completionPercent: Math.round((completedUnits / totalUnits) * 100),
    completedUnits,
    totalUnits,
    isCompleted: completedUnits === totalUnits,
  };
}

function sectionUnitFromProgress(row?: {
  isCompleted?: boolean;
  isWatched?: boolean;
  completionPercent?: number;
} | null): ProgressUnit {
  const isDone = row?.isCompleted === true || row?.isWatched === true;
  if (isDone) return { percent: 100, isDone: true };
  const pct = Math.max(0, Math.min(100, Number(row?.completionPercent ?? 0)));
  return { percent: pct, isDone: false };
}

function scopeByModuleId(scopes: QuizAssessmentScopeProgress[]): Map<string, QuizAssessmentScopeProgress> {
  const map = new Map<string, QuizAssessmentScopeProgress>();
  scopes.forEach((scope) => {
    if (scope.moduleId) map.set(scope.moduleId, scope);
  });
  return map;
}

function courseEndScope(scopes: QuizAssessmentScopeProgress[]): QuizAssessmentScopeProgress | undefined {
  return scopes.find((scope) => !scope.moduleId);
}

export function buildCourseOverallProgress(input: {
  courseLevel?: string | null;
  modules: Array<{ id: string; sections: Array<{ id: string }> }>;
  sectionProgressBySectionId: Record<
    string,
    { isCompleted?: boolean; isWatched?: boolean; completionPercent?: number } | undefined
  >;
  quizAssessmentScopes: QuizAssessmentScopeProgress[];
  quizCountByModuleId: Record<string, number>;
  assignmentCountByModuleId: Record<string, number>;
  courseEndQuizCount: number;
  courseEndAssignmentCount: number;
}): CourseOverallProgressSummary {
  const level = String(input.courseLevel || CourseLevel.Beginner).toLowerCase();
  const isCourseEndModel = level === 'beginner' || level === 'advanced';
  const courseEndAssignmentAllowed = level === 'beginner' || level === 'intermediate';

  const scopeMap = scopeByModuleId(input.quizAssessmentScopes);
  const endScope = courseEndScope(input.quizAssessmentScopes);
  const units: ProgressUnit[] = [];

  input.modules.forEach((module) => {
    module.sections.forEach((section) => {
      units.push(
        sectionUnitFromProgress(input.sectionProgressBySectionId[section.id]),
      );
    });

    if (!isCourseEndModel && (input.quizCountByModuleId[module.id] || 0) > 0) {
      const scope = scopeMap.get(module.id);
      const isDone = Boolean(scope?.quizCompleted);
      units.push({ percent: isDone ? 100 : 0, isDone });
    }

    if (!isCourseEndModel && (input.assignmentCountByModuleId[module.id] || 0) > 0) {
      const scope = scopeMap.get(module.id);
      const isDone = Boolean(scope?.assignmentCompleted);
      units.push({ percent: isDone ? 100 : 0, isDone });
    }
  });

  if (isCourseEndModel && input.courseEndQuizCount > 0) {
    const isDone = Boolean(endScope?.quizCompleted);
    units.push({ percent: isDone ? 100 : 0, isDone });
  }

  if (courseEndAssignmentAllowed && input.courseEndAssignmentCount > 0) {
    const isDone = Boolean(endScope?.assignmentCompleted);
    units.push({ percent: isDone ? 100 : 0, isDone });
  }

  return summarizeProgressUnits(units);
}
