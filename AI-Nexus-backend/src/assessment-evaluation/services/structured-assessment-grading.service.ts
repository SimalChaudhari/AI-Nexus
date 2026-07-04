import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LocalStorageService } from '../../service/local-storage.service';
import { CourseQuestionBankEntity } from '../../course/course-question-bank.entity';
import { CourseQuestionAssignmentSubmissionEntity } from '../../course/course-question-assignment-submission.entity';
import { getSubmissionFilesFromEntity } from '../../course/course-assignment-file.types';
import { resolveSubmissionPassed, getAssignmentPassScoreThreshold } from '../../course/course-assignment-submission-evaluation.types';
import { AssessmentBlueprintEntity } from '../entities/assessment-blueprint.entity';
import { AssessmentQuestionEntity } from '../entities/assessment-question.entity';
import { AssessmentSubmissionAnswerEntity } from '../entities/assessment-submission-answer.entity';
import { AssessmentQuestionEvaluationEntity } from '../entities/assessment-question-evaluation.entity';
import { AssessmentAnswerSource } from '../assessment-evaluation.types';
import { DocumentTextExtractionService } from './document-text-extraction.service';
import { BlueprintIngestionService } from './blueprint-ingestion.service';
import { GuidelineRulesService, QuestionSplitterService } from './guideline-and-splitter.service';
import {
  EvaluationAggregatorService,
  PerQuestionEvaluatorService,
} from './evaluation-engine.service';
import { alignStudentAnswersToQuestions } from '../utils/question-splitter.util';

@Injectable()
export class StructuredAssessmentGradingService {
  private readonly logger = new Logger(StructuredAssessmentGradingService.name);

  constructor(
    @InjectRepository(CourseQuestionAssignmentSubmissionEntity)
    private readonly submissionRepo: Repository<CourseQuestionAssignmentSubmissionEntity>,
    @InjectRepository(CourseQuestionBankEntity)
    private readonly questionBankRepo: Repository<CourseQuestionBankEntity>,
    @InjectRepository(AssessmentBlueprintEntity)
    private readonly blueprintRepo: Repository<AssessmentBlueprintEntity>,
    @InjectRepository(AssessmentQuestionEntity)
    private readonly assessmentQuestionRepo: Repository<AssessmentQuestionEntity>,
    @InjectRepository(AssessmentSubmissionAnswerEntity)
    private readonly submissionAnswerRepo: Repository<AssessmentSubmissionAnswerEntity>,
    @InjectRepository(AssessmentQuestionEvaluationEntity)
    private readonly questionEvaluationRepo: Repository<AssessmentQuestionEvaluationEntity>,
    private readonly blueprintIngestionService: BlueprintIngestionService,
    private readonly guidelineRulesService: GuidelineRulesService,
    private readonly splitterService: QuestionSplitterService,
    private readonly extractionService: DocumentTextExtractionService,
    private readonly perQuestionEvaluator: PerQuestionEvaluatorService,
    private readonly aggregator: EvaluationAggregatorService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  queueGrading(submissionId: string): void {
    void this.gradeSubmissionById(submissionId).catch((error) => {
      this.logger.error(
        `Structured grading failed for ${submissionId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    });
  }

  async gradeSubmissionById(
    submissionId: string,
  ): Promise<CourseQuestionAssignmentSubmissionEntity | null> {
    const submission = await this.submissionRepo.findOne({ where: { id: submissionId } });
    if (!submission) return null;

    const questionBank = await this.questionBankRepo.findOne({
      where: { id: submission.questionId, courseId: submission.courseId },
    });
    if (!questionBank) return null;

    submission.evaluationStatus = 'processing';
    submission.aiScore = null;
    submission.aiPassed = null;
    submission.aiFeedback = null;
    submission.aiRawResult = null;
    submission.aiEvaluatedAt = null;
    await this.submissionRepo.save(submission);

    try {
      let blueprint = await this.blueprintRepo.findOne({
        where: { questionBankId: questionBank.id },
      });

      if (!blueprint || blueprint.status !== 'ready') {
        blueprint = await this.blueprintIngestionService.ingestBlueprint(questionBank.id);
      }

      if (!blueprint || blueprint.status !== 'ready') {
        return this.saveManualRequired(
          submission,
          blueprint?.processingError ||
            'Assessment blueprint is not ready. An admin will review manually.',
        );
      }

      const assessmentQuestions = await this.assessmentQuestionRepo.find({
        where: { blueprintId: blueprint.id },
        order: { sortOrder: 'ASC', questionNumber: 'ASC' },
      });

      if (!assessmentQuestions.length) {
        return this.saveManualRequired(
          submission,
          'No structured questions found for this assessment.',
        );
      }

      const typedAnswers = this.parseTypedAnswers(submission);
      const fileAnswers = await this.extractAnswersFromFiles(submission, assessmentQuestions.length);
      const mergedAnswers = this.mergeAnswers(typedAnswers, fileAnswers, assessmentQuestions);

      await this.submissionAnswerRepo.delete({ submissionId: submission.id });
      await this.questionEvaluationRepo.delete({ submissionId: submission.id });

      const answerRows = assessmentQuestions.map((question, index) =>
        this.submissionAnswerRepo.create({
          submissionId: submission.id,
          assessmentQuestionId: question.id,
          answerText: mergedAnswers[index] || '',
          source: typedAnswers[index] && fileAnswers[index] ? 'mixed' : typedAnswers[index] ? 'typed' : 'file',
        }),
      );
      await this.submissionAnswerRepo.save(answerRows);

      const rules = await this.guidelineRulesService.getRulesForBlueprint(blueprint.id);
      const passThreshold = getAssignmentPassScoreThreshold(
        blueprint.passingPercentage ?? questionBank.passingPercentage,
      );

      const verificationLog: { step: string; status: string; detail: string }[] = [
        {
          step: 'Structured evaluation',
          status: 'info',
          detail: `${assessmentQuestions.length} questions loaded`,
        },
      ];

      const questionResults = [];
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      for (const question of assessmentQuestions) {
        const studentAnswer =
          answerRows.find((row) => row.assessmentQuestionId === question.id)?.answerText || '';

        const evaluationRow = this.questionEvaluationRepo.create({
          submissionId: submission.id,
          assessmentQuestionId: question.id,
          status: 'processing',
        });
        await this.questionEvaluationRepo.save(evaluationRow);

        try {
          const { result, usage } = await this.perQuestionEvaluator.evaluateQuestion({
            question,
            studentAnswer,
            rules,
          });

          evaluationRow.status = 'completed';
          evaluationRow.result = result;
          evaluationRow.evaluatedAt = new Date();
          evaluationRow.promptTokens = usage?.prompt_tokens ?? null;
          evaluationRow.completionTokens = usage?.completion_tokens ?? null;
          await this.questionEvaluationRepo.save(evaluationRow);

          totalPromptTokens += usage?.prompt_tokens || 0;
          totalCompletionTokens += usage?.completion_tokens || 0;
          questionResults.push(result);

          verificationLog.push({
            step: `Q${question.questionNumber}`,
            status: 'pass',
            detail: `Scored ${result.score}/${result.maxScore}`,
          });
        } catch (error) {
          evaluationRow.status = 'failed';
          evaluationRow.errorMessage =
            error instanceof Error ? error.message : 'Question evaluation failed';
          await this.questionEvaluationRepo.save(evaluationRow);
          verificationLog.push({
            step: `Q${question.questionNumber}`,
            status: 'fail',
            detail: evaluationRow.errorMessage,
          });
        }
      }

      if (!questionResults.length) {
        return this.saveManualRequired(
          submission,
          'AI could not evaluate any questions. An admin will review manually.',
          { verificationLog },
        );
      }

      const aggregateBase = this.aggregator.aggregate(questionResults, passThreshold);
      const overallFeedback = await this.aggregator.buildOverallFeedback(aggregateBase);
      const aggregate = { ...aggregateBase, overallFeedback };

      submission.evaluationStatus = 'completed';
      submission.aiScore = aggregate.percentage;
      submission.aiPassed = aggregate.passed;
      submission.aiFeedback = aggregate.overallFeedback;
      submission.aiRawResult = {
        mode: 'structured_per_question',
        aggregate,
        questionResults,
        tokenUsage: {
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
          total: totalPromptTokens + totalCompletionTokens,
        },
        verificationLog,
        gradedAt: new Date().toISOString(),
        passThreshold,
      };
      submission.aiEvaluatedAt = new Date();

      const finalized = this.finalizeSubmission(submission);
      return this.submissionRepo.save(finalized);
    } catch (error) {
      submission.evaluationStatus = 'manual_required';
      submission.aiFeedback =
        error instanceof Error
          ? `Structured grading failed: ${error.message}`
          : 'Structured grading failed.';
      submission.aiEvaluatedAt = new Date();
      submission.isCompleted = false;
      return this.submissionRepo.save(submission);
    }
  }

  private parseTypedAnswers(
    submission: CourseQuestionAssignmentSubmissionEntity,
  ): string[] {
    const raw = submission.aiRawResult as Record<string, unknown> | null;
    const typed = raw?.typedAnswers;
    if (!Array.isArray(typed)) return [];
    return typed.map((item) => String(item || '').trim());
  }

  private async extractAnswersFromFiles(
    submission: CourseQuestionAssignmentSubmissionEntity,
    questionCount: number,
  ): Promise<string[]> {
    const files = getSubmissionFilesFromEntity(submission);
    if (!files.length) return Array(questionCount).fill('');

    const chunks: string[] = [];
    for (const file of files) {
      const stored = await this.localStorageService.readFileByUrl(file.fileUrl);
      if (!stored) continue;
      const extracted = await this.extractionService.extractFromBuffer(
        stored.buffer,
        stored.fileName || file.originalFileName,
        stored.mimeType,
      );
      if (extracted.couldRead) chunks.push(extracted.text);
    }

    const combined = chunks.join('\n\n');
    const segments = this.splitterService.splitHeuristic(combined);
    return alignStudentAnswersToQuestions(segments, questionCount);
  }

  private mergeAnswers(
    typed: string[],
    fromFiles: string[],
    questions: AssessmentQuestionEntity[],
  ): string[] {
    return questions.map((_, index) => {
      const typedAnswer = typed[index] || '';
      const fileAnswer = fromFiles[index] || '';
      if (typedAnswer && fileAnswer) return `${typedAnswer}\n\n${fileAnswer}`.trim();
      return typedAnswer || fileAnswer;
    });
  }

  private async saveManualRequired(
    submission: CourseQuestionAssignmentSubmissionEntity,
    feedback: string,
    extra?: Record<string, unknown>,
  ) {
    submission.evaluationStatus = 'manual_required';
    submission.aiPassed = null;
    submission.aiScore = null;
    submission.aiFeedback = feedback;
    submission.aiRawResult = { mode: 'structured_per_question', ...extra };
    submission.aiEvaluatedAt = new Date();
    submission.isCompleted = false;
    return this.submissionRepo.save(submission);
  }

  finalizeSubmission(
    submission: CourseQuestionAssignmentSubmissionEntity,
  ): CourseQuestionAssignmentSubmissionEntity {
    const { passed } = resolveSubmissionPassed(submission);
    submission.isCompleted = passed === true;
    return submission;
  }
}
