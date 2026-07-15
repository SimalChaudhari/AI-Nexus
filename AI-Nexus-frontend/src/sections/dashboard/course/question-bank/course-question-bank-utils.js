export const QUESTION_BANK_CATEGORY_PARAM = 'qb';

export function parseQuestionBankCategoryParam(value) {
  if (value === 'quiz' || value === 'assessment') return value;
  return null;
}

export const UNLINKED_MODULE_KEY = '__unlinked__';

export const QUESTION_BANK_CATEGORIES = {
  quiz: {
    key: 'quiz',
    label: 'Quiz questions',
    shortLabel: 'Quiz',
    icon: 'solar:clipboard-list-bold',
    color: 'primary',
    presetType: 'mcq',
  },
  assessment: {
    key: 'assessment',
    label: 'Assessments',
    shortLabel: 'Assessment',
    icon: 'solar:document-add-bold',
    color: 'warning',
    presetType: 'assignment',
  },
};

export const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_text', label: 'Short text' },
  { value: 'assignment', label: 'Assessment (file upload)' },
];

export const QUIZ_QUESTION_TYPES = QUESTION_TYPES.filter((t) => t.value !== 'assignment');

export const ASSESSMENT_QUESTION_TYPES = QUESTION_TYPES.filter((t) => t.value === 'assignment');

export const ASSESSMENT_ADMIN_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

export const ASSIGNMENT_REFERENCE_ACCEPT = ASSESSMENT_ADMIN_ACCEPT;
export const ASSESSMENT_QUESTION_ACCEPT = ASSESSMENT_ADMIN_ACCEPT;
export const ASSESSMENT_ANSWER_SHEET_ACCEPT = ASSESSMENT_ADMIN_ACCEPT;
export const ASSESSMENT_GUIDE_ACCEPT = ASSESSMENT_ADMIN_ACCEPT;

export const LEARNER_SUBMISSION_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

export function questionTypeChipLabel(type) {
  if (type === 'true_false') return 'T/F';
  if (type === 'short_text') return 'Text';
  if (type === 'assignment') return 'Assessment';
  return 'MCQ';
}

export function truncateQuestionPrompt(str, n = 72) {
  const s = String(str || '');
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export function sortQuestionsByOrder(list) {
  return [...list].sort(
    (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
  );
}

export function partitionModuleQuestions(questions) {
  const quizQuestions = [];
  const assessmentQuestions = [];
  (questions || []).forEach((q) => {
    if (q?.questionType === 'assignment') {
      assessmentQuestions.push(q);
    } else {
      quizQuestions.push(q);
    }
  });
  return {
    quizQuestions: sortQuestionsByOrder(quizQuestions),
    assessmentQuestions: sortQuestionsByOrder(assessmentQuestions),
  };
}

export function enrichModuleSummary(id, label, questions) {
  const sorted = sortQuestionsByOrder(questions);
  const { quizQuestions, assessmentQuestions } = partitionModuleQuestions(sorted);
  return {
    id,
    label,
    questions: sorted,
    quizQuestions,
    assessmentQuestions,
    quizCount: quizQuestions.length,
    assessmentCount: assessmentQuestions.length,
    isLinked: id !== UNLINKED_MODULE_KEY,
  };
}

export function getModuleCategoryCount(moduleSummary, categoryKey) {
  if (categoryKey === 'assessment') return moduleSummary?.assessmentCount || 0;
  return moduleSummary?.quizCount || 0;
}

export function getModuleCategoryQuestions(moduleSummary, categoryKey) {
  if (categoryKey === 'assessment') return moduleSummary?.assessmentQuestions || [];
  return moduleSummary?.quizQuestions || [];
}

export function buildModuleSummaries(questions, moduleChoices) {
  const byModule = new Map();

  (questions || []).forEach((q) => {
    const key = q.moduleId || UNLINKED_MODULE_KEY;
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key).push(q);
  });

  const summaries = moduleChoices.map((mod) =>
    enrichModuleSummary(mod.id, mod.label, byModule.get(mod.id) || [])
  );

  summaries.push(
    enrichModuleSummary(
      UNLINKED_MODULE_KEY,
      'Course-level (not linked to a module)',
      byModule.get(UNLINKED_MODULE_KEY) || []
    )
  );

  return summaries;
}

export function countQuestionsByCategory(moduleSummaries, categoryKey) {
  return (moduleSummaries || []).reduce(
    (sum, mod) => sum + getModuleCategoryCount(mod, categoryKey),
    0
  );
}

export function flattenCategoryQuestions(moduleSummaries, categoryKey) {
  const items = [];
  (moduleSummaries || []).forEach((mod) => {
    getModuleCategoryQuestions(mod, categoryKey).forEach((question) => {
      items.push({
        question,
        moduleId: mod.id,
        moduleLabel: mod.label,
        isLinked: mod.isLinked,
      });
    });
  });
  return items;
}
