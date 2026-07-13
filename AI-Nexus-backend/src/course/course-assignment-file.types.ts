/** Learner submission file metadata (stored in jsonb). */
export type AssignmentSubmissionFileRecord = {
  fileUrl: string;
  originalFileName: string;
  mimeType?: string | null;
};

export type AssessmentAdminFileRecord = AssignmentSubmissionFileRecord;

export const ASSESSMENT_ADMIN_FILE_EXT =
  /\.(png|jpe?g|pdf|doc|docx|xls|xlsx|xlsm|zip)$/i;
export const ASSESSMENT_QUESTION_FILE_EXT = ASSESSMENT_ADMIN_FILE_EXT;
export const ASSESSMENT_ANSWER_SHEET_FILE_EXT = ASSESSMENT_ADMIN_FILE_EXT;
export const ASSESSMENT_GUIDE_FILE_EXT = ASSESSMENT_ADMIN_FILE_EXT;
export const LEARNER_SUBMISSION_FILE_EXT =
  /\.(png|jpe?g|pdf|doc|docx|xlsx|xlsm|pptx|txt|zip)$/i;

export function isLearnerZipFile(fileName: string, mimeType?: string): boolean {
  const name = String(fileName || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();
  return /\.(zip|rar)$/i.test(name) || /zip|rar/i.test(mime);
}

export function summarizeSubmissionFiles(files: AssignmentSubmissionFileRecord[]): string {
  if (!files.length) return '';
  if (files.length === 1) return files[0].originalFileName;
  return `${files.length} files: ${files.map((f) => f.originalFileName).join(', ')}`;
}

export function getSubmissionFilesFromEntity(submission: {
  submissionFiles?: AssignmentSubmissionFileRecord[] | null;
  fileUrl?: string | null;
  originalFileName?: string | null;
}): AssignmentSubmissionFileRecord[] {
  const fromJson = normalizeSubmissionFiles(submission.submissionFiles);
  if (fromJson.length) return fromJson;
  const fileUrl = String(submission.fileUrl || '').trim();
  const originalFileName = String(submission.originalFileName || '').trim();
  if (fileUrl && originalFileName) {
    return [{ fileUrl, originalFileName }];
  }
  return [];
}

export function normalizeSubmissionFiles(
  raw: unknown,
): AssignmentSubmissionFileRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: AssignmentSubmissionFileRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const fileUrl = String(row.fileUrl || '').trim();
    const originalFileName = String(row.originalFileName || '').trim();
    if (!fileUrl || !originalFileName) continue;
    out.push({
      fileUrl,
      originalFileName,
      mimeType: row.mimeType != null ? String(row.mimeType) : null,
    });
  }
  return out;
}

type AssessmentAdminFileEntity = {
  questionFiles?: AssessmentAdminFileRecord[] | null;
  questionFileUrl?: string | null;
  questionFileName?: string | null;
  answerSheetFiles?: AssessmentAdminFileRecord[] | null;
  answerSheetFileUrl?: string | null;
  answerSheetFileName?: string | null;
  guideFiles?: AssessmentAdminFileRecord[] | null;
  guideFileUrl?: string | null;
  guideFileName?: string | null;
  referenceFileUrl?: string | null;
  referenceFileName?: string | null;
};

function getAssessmentAdminFiles(
  files: unknown,
  fileUrl?: string | null,
  fileName?: string | null,
): AssessmentAdminFileRecord[] {
  const normalized = normalizeSubmissionFiles(files);
  if (normalized.length) return normalized;
  const url = String(fileUrl || '').trim();
  if (!url) return [];
  return [{
    fileUrl: url,
    originalFileName: String(fileName || 'file').trim() || 'file',
  }];
}

export function getAssessmentQuestionFiles(
  assessment: AssessmentAdminFileEntity,
): AssessmentAdminFileRecord[] {
  return getAssessmentAdminFiles(
    assessment.questionFiles,
    assessment.questionFileUrl,
    assessment.questionFileName,
  );
}

export function getAssessmentAnswerSheetFiles(
  assessment: AssessmentAdminFileEntity,
): AssessmentAdminFileRecord[] {
  return getAssessmentAdminFiles(
    assessment.answerSheetFiles,
    assessment.answerSheetFileUrl,
    assessment.answerSheetFileName,
  );
}

export function getAssessmentGuideFiles(
  assessment: AssessmentAdminFileEntity,
): AssessmentAdminFileRecord[] {
  return getAssessmentAdminFiles(
    assessment.guideFiles,
    assessment.guideFileUrl || assessment.referenceFileUrl,
    assessment.guideFileName || assessment.referenceFileName,
  );
}

export function syncLegacyAssessmentFileFields(
  assessment: AssessmentAdminFileEntity,
): void {
  assessment.questionFiles = normalizeSubmissionFiles(assessment.questionFiles);
  assessment.answerSheetFiles = normalizeSubmissionFiles(assessment.answerSheetFiles);
  assessment.guideFiles = normalizeSubmissionFiles(assessment.guideFiles);

  const question = assessment.questionFiles[0];
  assessment.questionFileUrl = question?.fileUrl ?? null;
  assessment.questionFileName = question?.originalFileName ?? null;

  const answerSheet = assessment.answerSheetFiles[0];
  assessment.answerSheetFileUrl = answerSheet?.fileUrl ?? null;
  assessment.answerSheetFileName = answerSheet?.originalFileName ?? null;

  const guide = assessment.guideFiles[0];
  assessment.guideFileUrl = guide?.fileUrl ?? null;
  assessment.guideFileName = guide?.originalFileName ?? null;
  assessment.referenceFileUrl = guide?.fileUrl ?? null;
  assessment.referenceFileName = guide?.originalFileName ?? null;
}
