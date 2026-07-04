import { UNLINKED_MODULE_KEY } from '../question-bank/course-question-bank-utils';

export { UNLINKED_MODULE_KEY };

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

export function truncateSubmissionText(str, n = 64) {
  const s = String(str || '');
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export function getSubmissionEvaluationDisplay(row) {
  if (row?.manualPassed === true) {
    return { label: 'Pass', color: 'success', detail: row.manualFeedback || 'Verified by admin' };
  }
  if (row?.manualPassed === false) {
    return { label: 'Fail', color: 'error', detail: row.manualFeedback || 'Verified by admin' };
  }
  if (row?.passed === true) {
    return {
      label: 'Pass',
      color: 'success',
      detail: row.aiFeedback || (row.aiScore != null ? `Score ${row.aiScore}%` : 'AI graded'),
    };
  }
  if (row?.passed === false) {
    return {
      label: 'Fail',
      color: 'error',
      detail:
        row.aiFeedback ||
        (row.aiScore != null ? `Score ${row.aiScore}% — need at least 70% to pass` : 'Did not meet pass threshold'),
    };
  }
  if (row?.evaluationStatus === 'draft') {
    return { label: 'Draft', color: 'default', detail: 'Upload files and submit when ready' };
  }
  if (row?.evaluationStatus === 'manual_required') {
    return {
      label: 'Review needed',
      color: 'warning',
      detail: row.aiFeedback || 'AI could not verify — admin review required',
    };
  }
  if (row?.evaluationStatus === 'processing' || row?.evaluationStatus === 'pending') {
    return { label: 'Grading…', color: 'info', detail: 'AI is reviewing the submission' };
  }
  return { label: 'Pending', color: 'default', detail: 'Waiting for grading' };
}

export function getStructuredQuestionResults(submission) {
  const raw = submission?.aiRawResult;
  if (!raw || raw.mode !== 'structured_per_question') return [];
  const results = Array.isArray(raw.questionResults) ? raw.questionResults : [];
  return results.map((row) => ({
    questionId: row.questionId,
    questionNumber: row.questionNumber,
    label: row.label || `Q${row.questionNumber}`,
    score: Number(row.score) || 0,
    maxScore: Number(row.maxScore) || 0,
    feedback: row.feedback || '',
    strengths: Array.isArray(row.strengths) ? row.strengths : [],
    missingPoints: Array.isArray(row.missingPoints) ? row.missingPoints : [],
    incorrectPoints: Array.isArray(row.incorrectPoints) ? row.incorrectPoints : [],
  }));
}

export function mapSubmissionFromApi(row) {
  if (!row) return null;
  const submissionFiles = Array.isArray(row.submissionFiles) ? row.submissionFiles : [];
  const primary = submissionFiles[0];
  const structuredResults = getStructuredQuestionResults({ aiRawResult: row.aiRawResult });
  const legacyWeaknesses = Array.isArray(row.aiRawResult?.weaknesses) ? row.aiRawResult.weaknesses : [];
  const structuredWeaknesses = structuredResults
    .flatMap((item) => item.missingPoints || [])
    .filter(Boolean)
    .slice(0, 12);
  return {
    id: row.id,
    questionId: row.questionId,
    fileUrl: primary?.fileUrl ?? row.fileUrl ?? null,
    originalFileName:
      submissionFiles.length > 1
        ? `${submissionFiles.length} files`
        : primary?.originalFileName ?? row.originalFileName ?? null,
    submissionFiles,
    uploadedAt: row.uploadedAt,
    submittedAt: row.submittedAt ?? null,
    evaluationStatus: row.evaluationStatus || 'pending',
    aiScore: row.aiScore ?? null,
    aiPassed: row.aiPassed ?? null,
    aiFeedback: row.aiFeedback ?? null,
    aiRawResult: row.aiRawResult ?? null,
    structuredResults,
    strengths: Array.isArray(row.aiRawResult?.strengths) ? row.aiRawResult.strengths : [],
    weaknesses: structuredWeaknesses.length ? structuredWeaknesses : legacyWeaknesses,
    aiEvaluatedAt: row.aiEvaluatedAt ?? null,
    manualPassed: row.manualPassed ?? null,
    manualFeedback: row.manualFeedback ?? null,
    manualVerifiedAt: row.manualVerifiedAt ?? null,
    passed: row.passed ?? null,
    passedSource: row.passedSource ?? null,
    verificationLog: Array.isArray(row.verificationLog) ? row.verificationLog : [],
    attemptCount: Math.max(1, Number(row.attemptCount) || 1),
    attemptHistory: Array.isArray(row.attemptHistory) ? row.attemptHistory : [],
  };
}

export function isSubmissionDraft(submission) {
  return submission?.evaluationStatus === 'draft';
}

export function getSubmissionFileList(submission) {
  if (!submission) return [];
  if (Array.isArray(submission.submissionFiles) && submission.submissionFiles.length) {
    return submission.submissionFiles;
  }
  if (submission.fileUrl) {
    return [
      {
        fileUrl: submission.fileUrl,
        originalFileName: submission.originalFileName || 'Submission',
      },
    ];
  }
  return [];
}

export function getSubmissionAttemptCount(submission) {
  return Math.max(1, Number(submission?.attemptCount) || 1);
}

export function formatSubmissionAttemptLabel(submission) {
  const count = getSubmissionAttemptCount(submission);
  return count === 1 ? '1 attempt' : `${count} attempts`;
}

export function getSubmissionAttemptDisplayRows(submission) {
  if (!submission) return [];
  const history = Array.isArray(submission.attemptHistory) ? submission.attemptHistory : [];
  const currentNumber = getSubmissionAttemptCount(submission);
  const currentRow = {
    attemptNumber: currentNumber,
    originalFileName: submission.originalFileName,
    uploadedAt: submission.uploadedAt,
    evaluatedAt: submission.aiEvaluatedAt || submission.manualVerifiedAt || null,
    evaluationStatus: submission.evaluationStatus,
    aiScore: submission.aiScore ?? null,
    passed: submission.passed ?? null,
    passedSource: submission.passedSource ?? null,
    aiFeedback: submission.aiFeedback ?? null,
    manualFeedback: submission.manualFeedback ?? null,
    isCurrent: true,
  };
  return [...history, currentRow];
}

export function getAttemptResultDisplay(attempt) {
  if (attempt?.passed === true) {
    return { label: 'Pass', color: 'success' };
  }
  if (attempt?.passed === false) {
    return { label: 'Fail', color: 'error' };
  }
  if (attempt?.evaluationStatus === 'manual_required') {
    return { label: 'Review needed', color: 'warning' };
  }
  if (attempt?.evaluationStatus === 'pending' || attempt?.evaluationStatus === 'processing') {
    return { label: 'Grading…', color: 'info' };
  }
  return { label: 'Pending', color: 'default' };
}

export function canShowVerificationLog(submission) {
  if (!submission) return false;
  if (submission.evaluationStatus === 'pending' || submission.evaluationStatus === 'processing') {
    return false;
  }
  return (
    (Array.isArray(submission.verificationLog) && submission.verificationLog.length > 0) ||
    Boolean(submission.aiEvaluatedAt) ||
    Boolean(submission.aiFeedback)
  );
}

export function getVerificationLogEntries(submission) {
  if (Array.isArray(submission?.verificationLog) && submission.verificationLog.length) {
    return submission.verificationLog;
  }
  const structured = getStructuredQuestionResults(submission);
  if (structured.length) {
    return structured.map((row) => ({
      step: row.label || `Q${row.questionNumber}`,
      status: row.score >= row.maxScore * 0.7 ? 'pass' : row.score > 0 ? 'warn' : 'fail',
      detail: `${row.score}/${row.maxScore}${row.feedback ? ` — ${row.feedback}` : ''}`,
    }));
  }
  const entries = [];
  if (submission?.aiScore != null) {
    entries.push({
      step: 'AI score',
      status: 'info',
      detail: `${submission.aiScore}%`,
    });
  }
  if (submission?.passed != null) {
    entries.push({
      step: 'Result',
      status: submission.passed ? 'pass' : 'fail',
      detail: submission.passed ? 'Passed' : 'Failed',
    });
  }
  if (submission?.aiFeedback) {
    entries.push({
      step: 'AI feedback',
      status: submission.passed ? 'pass' : submission.passed === false ? 'fail' : 'info',
      detail: submission.aiFeedback,
    });
  }
  if (submission?.manualFeedback) {
    entries.push({
      step: 'Admin verification',
      status: submission.manualPassed ? 'pass' : submission.manualPassed === false ? 'fail' : 'info',
      detail: submission.manualFeedback,
    });
  }
  return entries;
}

export function verificationLogStatusColor(status) {
  if (status === 'pass') return 'success';
  if (status === 'fail') return 'error';
  if (status === 'warn') return 'warning';
  return 'info';
}

export function isSubmissionPassedLocked(submission) {
  if (!submission) return false;
  if (submission.manualPassed === true) return true;
  if (submission.manualPassed === false) return false;
  return submission.passed === true || submission.aiPassed === true;
}
