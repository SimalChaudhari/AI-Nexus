import { AssessmentGuidelineRulesPayload } from './assessment-evaluation.types';

export const GUIDELINE_SUMMARIZATION_SYSTEM = `You are an assessment operations assistant.
Extract concise evaluation rules from marking guidelines.
Return ONLY valid JSON matching the schema. No markdown.`;

export function buildGuidelineSummarizationUserPrompt(guidelineText: string): string {
  return `Summarize these assessment guidelines into structured evaluation rules.

Guidelines:
"""
${guidelineText}
"""

Return JSON:
{
  "version": 1,
  "globalRules": ["string"],
  "markingCriteria": ["string"],
  "synonymPolicy": "strict|flexible|contextual",
  "grammarPolicy": "ignore|minor_penalty|strict",
  "perQuestionRules": { "1": ["rule"], "2": ["rule"] },
  "defaultQuestionRules": ["string"],
  "notes": "optional short note"
}`;
}

export const QUESTION_SPLIT_REFINEMENT_SYSTEM = `You split academic assessments into numbered questions.
Return ONLY valid JSON. Preserve original wording.`;

export function buildQuestionSplitRefinementUserPrompt(
  rawText: string,
  heuristicSegments: { questionNumber: number; label: string; text: string }[],
): string {
  return `Refine question boundaries if needed. Heuristic split:
${JSON.stringify(heuristicSegments.map((s) => ({ n: s.questionNumber, label: s.label, preview: s.text.slice(0, 120) })))}

Full document:
"""
${rawText.slice(0, 8000)}
"""

Return JSON:
{ "questions": [{ "questionNumber": 1, "label": "Q1", "text": "full question text" }] }`;
}

export const PER_QUESTION_EVALUATION_SYSTEM = `You grade one assessment question at a time.
Compare the student answer to the expected answer using the provided rules only.
Be fair, specific, and concise.
Return ONLY valid JSON. No markdown.`;

export type PerQuestionPromptInput = {
  questionNumber: number;
  maxScore: number;
  questionText: string;
  expectedAnswer: string;
  studentAnswer: string;
  rules: AssessmentGuidelineRulesPayload | null;
};

export function buildPerQuestionEvaluationUserPrompt(input: PerQuestionPromptInput): string {
  const rules = input.rules;
  const relevantRules = [
    ...(rules?.globalRules || []),
    ...(rules?.perQuestionRules?.[String(input.questionNumber)] || []),
    ...(rules?.defaultQuestionRules || []),
    ...(rules?.markingCriteria || []).slice(0, 5),
  ];
  const policyLines = rules
    ? [
        `Synonyms: ${rules.synonymPolicy}`,
        `Grammar: ${rules.grammarPolicy}`,
      ]
    : [];

  return `Grade this single question.

Question ${input.questionNumber} (${input.maxScore} marks):
"""
${input.questionText}
"""

Expected answer:
"""
${input.expectedAnswer}
"""

Student answer:
"""
${input.studentAnswer}
"""

Evaluation rules (apply only these):
${[...policyLines, ...relevantRules].map((r) => `- ${r}`).join('\n') || '- Standard academic marking'}

Return JSON:
{
  "questionNumber": ${input.questionNumber},
  "score": number,
  "maxScore": ${input.maxScore},
  "strengths": ["string"],
  "missingPoints": ["string"],
  "incorrectPoints": ["string"],
  "feedback": "string",
  "confidence": "high|medium|low"
}`;
}

export const OVERALL_FEEDBACK_SYSTEM = `You write brief overall assessment feedback from per-question results.
Return ONLY valid JSON.`;

export function buildOverallFeedbackUserPrompt(
  percentage: number,
  passed: boolean,
  questionSummaries: { questionNumber: number; score: number; maxScore: number; feedback: string }[],
): string {
  return `Write overall feedback for a completed assessment.

Score: ${percentage}% (${passed ? 'PASS' : 'FAIL'})

Per-question:
${questionSummaries.map((q) => `Q${q.questionNumber}: ${q.score}/${q.maxScore} — ${q.feedback}`).join('\n')}

Return JSON:
{ "overallFeedback": "2-4 sentences, constructive" }`;
}
