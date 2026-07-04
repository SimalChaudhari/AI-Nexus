import { Injectable, Logger } from '@nestjs/common';

import { LlmService } from '../../llm/llm.service';
import {
  AggregatedAssessmentResult,
  AssessmentGuidelineRulesPayload,
  PerQuestionEvaluationResult,
} from '../assessment-evaluation.types';
import {
  buildOverallFeedbackUserPrompt,
  buildPerQuestionEvaluationUserPrompt,
  OVERALL_FEEDBACK_SYSTEM,
  PER_QUESTION_EVALUATION_SYSTEM,
} from '../assessment-evaluation.prompts';
import { AssessmentQuestionEntity } from '../entities/assessment-question.entity';
import {
  asStringArray,
  clampScore,
  extractJsonObject,
} from '../utils/parse-structured-json.util';

export type EvaluateQuestionInput = {
  question: AssessmentQuestionEntity;
  studentAnswer: string;
  rules: AssessmentGuidelineRulesPayload | null;
};

@Injectable()
export class PerQuestionEvaluatorService {
  private readonly logger = new Logger(PerQuestionEvaluatorService.name);

  constructor(private readonly llmService: LlmService) {}

  async evaluateQuestion(
    input: EvaluateQuestionInput,
  ): Promise<{ result: PerQuestionEvaluationResult; usage?: { prompt_tokens?: number; completion_tokens?: number } }> {
    const maxScore = Number(input.question.maxScore) || 1;
    const studentAnswer = String(input.studentAnswer || '').trim();

    if (!studentAnswer) {
      return {
        result: {
          questionId: input.question.id,
          questionNumber: input.question.questionNumber,
          score: 0,
          maxScore,
          strengths: [],
          missingPoints: ['No answer provided'],
          incorrectPoints: [],
          feedback: 'No answer was submitted for this question.',
          confidence: 'high',
        },
      };
    }

    if (!this.llmService.isConfigured()) {
      throw new Error(this.llmService.getConfigurationErrorMessage());
    }

    const response = await this.llmService.chat({
      useCase: 'default',
      temperature: 0.1,
      maxTokens: 700,
      messages: [
        { role: 'system', content: PER_QUESTION_EVALUATION_SYSTEM },
        {
          role: 'user',
          content: buildPerQuestionEvaluationUserPrompt({
            questionNumber: input.question.questionNumber,
            maxScore,
            questionText: input.question.promptText,
            expectedAnswer: input.question.expectedAnswerText,
            studentAnswer,
            rules: input.rules,
          }),
        },
      ],
    });

    const parsed = extractJsonObject(response.text);
    const result = this.normalizeResult(parsed, input.question, maxScore);
    return { result, usage: response.usage };
  }

  private normalizeResult(
    parsed: Record<string, unknown> | null,
    question: AssessmentQuestionEntity,
    maxScore: number,
  ): PerQuestionEvaluationResult {
    if (!parsed) {
      this.logger.warn(`Invalid per-question JSON for Q${question.questionNumber}`);
      return {
        questionId: question.id,
        questionNumber: question.questionNumber,
        score: 0,
        maxScore,
        strengths: [],
        missingPoints: [],
        incorrectPoints: [],
        feedback: 'Evaluation could not be parsed. Manual review required.',
        confidence: 'low',
      };
    }

    const confidenceRaw = String(parsed.confidence || 'medium');
    const confidence = ['high', 'medium', 'low'].includes(confidenceRaw)
      ? (confidenceRaw as PerQuestionEvaluationResult['confidence'])
      : 'medium';

    return {
      questionId: question.id,
      questionNumber: question.questionNumber,
      score: clampScore(parsed.score, maxScore),
      maxScore,
      strengths: asStringArray(parsed.strengths),
      missingPoints: asStringArray(parsed.missingPoints),
      incorrectPoints: asStringArray(parsed.incorrectPoints),
      feedback: String(parsed.feedback || '').trim().slice(0, 2000),
      confidence,
    };
  }
}

@Injectable()
export class EvaluationAggregatorService {
  constructor(private readonly llmService: LlmService) {}

  aggregate(
    questionResults: PerQuestionEvaluationResult[],
    passThreshold: number,
  ): Omit<AggregatedAssessmentResult, 'overallFeedback'> & { overallFeedback?: string } {
    const totalScore = questionResults.reduce((sum, row) => sum + (Number(row.score) || 0), 0);
    const maxScore = questionResults.reduce((sum, row) => sum + (Number(row.maxScore) || 0), 0);
    const percentage =
      maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
    const passed = percentage >= passThreshold;

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      maxScore,
      percentage,
      passed,
      questionResults,
      passThreshold,
    };
  }

  async buildOverallFeedback(
    aggregate: Omit<AggregatedAssessmentResult, 'overallFeedback'>,
  ): Promise<string> {
    if (!this.llmService.isConfigured() || !aggregate.questionResults.length) {
      return this.fallbackOverallFeedback(aggregate);
    }

    try {
      const response = await this.llmService.chat({
        useCase: 'default',
        temperature: 0.3,
        maxTokens: 300,
        messages: [
          { role: 'system', content: OVERALL_FEEDBACK_SYSTEM },
          {
            role: 'user',
            content: buildOverallFeedbackUserPrompt(
              aggregate.percentage,
              aggregate.passed,
              aggregate.questionResults.map((q) => ({
                questionNumber: q.questionNumber,
                score: q.score,
                maxScore: q.maxScore,
                feedback: q.feedback,
              })),
            ),
          },
        ],
      });
      const parsed = extractJsonObject(response.text);
      const feedback = String(parsed?.overallFeedback || '').trim();
      return feedback || this.fallbackOverallFeedback(aggregate);
    } catch {
      return this.fallbackOverallFeedback(aggregate);
    }
  }

  private fallbackOverallFeedback(
    aggregate: Omit<AggregatedAssessmentResult, 'overallFeedback'>,
  ): string {
    const status = aggregate.passed ? 'passed' : 'did not pass';
    return `You scored ${aggregate.percentage}% (${aggregate.totalScore}/${aggregate.maxScore}) and ${status}. Review per-question feedback for details.`;
  }
}
