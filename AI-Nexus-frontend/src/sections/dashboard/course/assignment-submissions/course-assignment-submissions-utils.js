import { UNLINKED_MODULE_KEY } from '../question-bank/course-question-bank-utils';

export { UNLINKED_MODULE_KEY };

export function truncateSubmissionText(str, n = 64) {
  const s = String(str || '');
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export function buildSubmissionModuleSummaries(rows, moduleChoices) {
  const byModule = new Map();

  (rows || []).forEach((row) => {
    const key = row.moduleId || UNLINKED_MODULE_KEY;
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key).push(row);
  });

  const summaries = moduleChoices.map((mod) => ({
    id: mod.id,
    label: mod.label,
    submissions: byModule.get(mod.id) || [],
  }));

  summaries.push({
    id: UNLINKED_MODULE_KEY,
    label: 'Course-level (not linked to a module)',
    submissions: byModule.get(UNLINKED_MODULE_KEY) || [],
  });

  return summaries;
}
