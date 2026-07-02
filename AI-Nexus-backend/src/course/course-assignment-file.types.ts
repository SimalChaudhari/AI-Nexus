/** Learner submission file metadata (stored in jsonb). */
export type AssignmentSubmissionFileRecord = {
  fileUrl: string;
  originalFileName: string;
  mimeType?: string | null;
};

export const ASSESSMENT_QUESTION_FILE_EXT = /\.(pdf|doc|docx|zip)$/i;
export const ASSESSMENT_ANSWER_SHEET_FILE_EXT = /\.(pdf|doc|docx|zip)$/i;
export const ASSESSMENT_GUIDE_FILE_EXT = /\.(pdf|doc|docx)$/i;
export const LEARNER_SUBMISSION_FILE_EXT =
  /\.(png|jpe?g|pdf|doc|docx|xlsx|xlsm|pptx|txt)$/i;

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
