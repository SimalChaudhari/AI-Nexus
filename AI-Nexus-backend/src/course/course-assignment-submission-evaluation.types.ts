import {
  AssignmentSubmissionFileRecord,
  getSubmissionFilesFromEntity,
  summarizeSubmissionFiles,
} from './course-assignment-file.types';

export type AssignmentEvaluationStatus =
  | 'draft'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'manual_required'
  | 'failed';

/**
 * AI assignment verification is off by default.
 * Set ASSIGNMENT_AI_VERIFICATION_ENABLED=true to re-enable.
 */
export function isAssignmentAiVerificationEnabled(): boolean {
  const raw = String(process.env.ASSIGNMENT_AI_VERIFICATION_ENABLED || '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** Minimum AI score (0–100) required to pass. Override with ASSIGNMENT_PASS_SCORE_THRESHOLD in .env */
export function getAssignmentPassScoreThreshold(assessmentPassingPercentage?: number | null): number {
  const perAssessment = Number(assessmentPassingPercentage);
  if (Number.isFinite(perAssessment) && perAssessment >= 0 && perAssessment <= 100) {
    return Math.round(perAssessment);
  }
  const raw = Number(process.env.ASSIGNMENT_PASS_SCORE_THRESHOLD);
  if (Number.isFinite(raw) && raw >= 0 && raw <= 100) {
    return Math.round(raw);
  }
  return 70;
}

export function resolvePassFromScore(
  score: number | null | undefined,
  assessmentPassingPercentage?: number | null,
): boolean | null {
  if (score == null || !Number.isFinite(Number(score))) return null;
  return Number(score) >= getAssignmentPassScoreThreshold(assessmentPassingPercentage);
}

export type AssignmentVerificationLogEntry = {
  step: string;
  status: 'pass' | 'fail' | 'info' | 'warn';
  detail: string;
};

export type AssignmentAiGradingResult = {
  score: number | null;
  passed: boolean | null;
  feedback: string;
  confidence: 'high' | 'medium' | 'low' | null;
  couldVerify: boolean;
  raw?: Record<string, unknown>;
};

export type AssignmentSubmissionAttemptRecord = {
  attemptNumber: number;
  originalFileName: string;
  uploadedAt: string;
  evaluatedAt: string | null;
  evaluationStatus: AssignmentEvaluationStatus;
  aiScore: number | null;
  passed: boolean | null;
  passedSource: 'manual' | 'ai' | null;
  aiFeedback: string | null;
  manualFeedback: string | null;
};

export type AssignmentSubmissionEvaluationFields = {
  evaluationStatus: AssignmentEvaluationStatus;
  aiScore: number | null;
  aiPassed: boolean | null;
  aiFeedback: string | null;
  aiRawResult: Record<string, unknown> | null;
  aiEvaluatedAt: Date | null;
  manualPassed: boolean | null;
  manualFeedback: string | null;
  manualVerifiedAt: Date | null;
  manualVerifiedBy: string | null;
  passed: boolean | null;
  passedSource: 'manual' | 'ai' | null;
};

export function resolveSubmissionPassed(row: {
  manualPassed?: boolean | null;
  aiPassed?: boolean | null;
}): { passed: boolean | null; passedSource: 'manual' | 'ai' | null } {
  if (row.manualPassed === true || row.manualPassed === false) {
    return { passed: row.manualPassed, passedSource: 'manual' };
  }
  if (row.aiPassed === true || row.aiPassed === false) {
    return { passed: row.aiPassed, passedSource: 'ai' };
  }
  return { passed: null, passedSource: null };
}

export function isSubmissionPassedLocked(submission: {
  manualPassed?: boolean | null;
  aiPassed?: boolean | null;
  isCompleted?: boolean | null;
}): boolean {
  if (submission.isCompleted === true) return true;
  return resolveSubmissionPassed(submission).passed === true;
}

export function mapSubmissionEvaluationFields(
  submission: {
    evaluationStatus?: string | null;
    aiScore?: number | null;
    aiPassed?: boolean | null;
    aiFeedback?: string | null;
    aiRawResult?: Record<string, unknown> | null;
    aiEvaluatedAt?: Date | null;
    manualPassed?: boolean | null;
    manualFeedback?: string | null;
    manualVerifiedAt?: Date | null;
    manualVerifiedBy?: string | null;
  },
): AssignmentSubmissionEvaluationFields {
  const { passed, passedSource } = resolveSubmissionPassed(submission);
  return {
    evaluationStatus: (submission.evaluationStatus as AssignmentEvaluationStatus) || 'pending',
    aiScore: submission.aiScore ?? null,
    aiPassed: submission.aiPassed ?? null,
    aiFeedback: submission.aiFeedback ?? null,
    aiRawResult: submission.aiRawResult ?? null,
    aiEvaluatedAt: submission.aiEvaluatedAt ?? null,
    manualPassed: submission.manualPassed ?? null,
    manualFeedback: submission.manualFeedback ?? null,
    manualVerifiedAt: submission.manualVerifiedAt ?? null,
    manualVerifiedBy: submission.manualVerifiedBy ?? null,
    passed,
    passedSource,
  };
}

export function buildSubmissionAttemptRecord(
  submission: {
    originalFileName?: string | null;
    submissionFiles?: AssignmentSubmissionFileRecord[] | null;
    fileUrl?: string | null;
    uploadedAt?: Date | null;
    updatedAt?: Date | null;
    submittedAt?: Date | null;
    evaluationStatus?: string | null;
    aiScore?: number | null;
    aiPassed?: boolean | null;
    aiFeedback?: string | null;
    aiRawResult?: Record<string, unknown> | null;
    aiEvaluatedAt?: Date | null;
    manualPassed?: boolean | null;
    manualFeedback?: string | null;
    manualVerifiedAt?: Date | null;
    manualVerifiedBy?: string | null;
  },
  attemptNumber: number,
): AssignmentSubmissionAttemptRecord {
  const evaluation = mapSubmissionEvaluationFields(submission);
  const files = getSubmissionFilesFromEntity(submission);
  const fileLabel =
    summarizeSubmissionFiles(files) ||
    String(submission.originalFileName || '').trim() ||
    'Submission files';
  const uploadedAt =
    attemptNumber <= 1
      ? submission.submittedAt || submission.uploadedAt || submission.updatedAt || new Date()
      : submission.submittedAt || submission.updatedAt || submission.uploadedAt || new Date();
  const evaluatedAt = evaluation.aiEvaluatedAt || evaluation.manualVerifiedAt || null;
  return {
    attemptNumber,
    originalFileName: fileLabel,
    uploadedAt: uploadedAt.toISOString(),
    evaluatedAt: evaluatedAt ? evaluatedAt.toISOString() : null,
    evaluationStatus: evaluation.evaluationStatus,
    aiScore: evaluation.aiScore,
    passed: evaluation.passed,
    passedSource: evaluation.passedSource,
    aiFeedback: evaluation.aiFeedback,
    manualFeedback: evaluation.manualFeedback,
  };
}

export function extractVerificationLog(
  aiRawResult?: Record<string, unknown> | null,
): AssignmentVerificationLogEntry[] {
  const raw = aiRawResult?.verificationLog;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row = item as Record<string, unknown>;
      const statusRaw = String(row.status || 'info');
      const status = ['pass', 'fail', 'info', 'warn'].includes(statusRaw)
        ? (statusRaw as AssignmentVerificationLogEntry['status'])
        : 'info';
      return {
        step: String(row.step || 'Step'),
        status,
        detail: String(row.detail || ''),
      };
    });
}
