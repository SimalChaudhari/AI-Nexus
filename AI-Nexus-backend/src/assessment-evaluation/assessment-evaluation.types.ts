export type AssessmentBlueprintStatus =
  | 'pending'
  | 'extracting'
  | 'splitting'
  | 'summarizing_guidelines'
  | 'ready'
  | 'failed';

export type AssessmentQuestionEvaluationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped';

export type AssessmentAnswerSource = 'file' | 'typed' | 'mixed';

/** Compiled once from guideline PDF/DOCX — never sent whole to per-question eval. */
export type AssessmentGuidelineRulesPayload = {
  version: 1;
  globalRules: string[];
  markingCriteria: string[];
  synonymPolicy: 'strict' | 'flexible' | 'contextual';
  grammarPolicy: 'ignore' | 'minor_penalty' | 'strict';
  perQuestionRules: Record<string, string[]>;
  defaultQuestionRules: string[];
  notes?: string;
};

export type SplitQuestionSegment = {
  questionNumber: number;
  label: string;
  text: string;
  startOffset: number;
  endOffset: number;
};

export type PerQuestionEvaluationResult = {
  questionId: string;
  questionNumber: number;
  score: number;
  maxScore: number;
  strengths: string[];
  missingPoints: string[];
  incorrectPoints: string[];
  feedback: string;
  confidence?: 'high' | 'medium' | 'low';
};

export type AggregatedAssessmentResult = {
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  overallFeedback: string;
  questionResults: PerQuestionEvaluationResult[];
  passThreshold: number;
};

export type AssessmentEvaluationJobPayload = {
  submissionId: string;
  blueprintId: string;
};

export type BlueprintIngestionJobPayload = {
  questionBankId: string;
  forceReprocess?: boolean;
};

export function isStructuredEvaluationEnabled(): boolean {
  const raw = String(process.env.ASSESSMENT_STRUCTURED_EVALUATION || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}
