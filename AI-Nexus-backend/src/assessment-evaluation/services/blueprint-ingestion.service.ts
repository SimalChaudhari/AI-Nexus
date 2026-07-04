import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';

import { LocalStorageService } from '../../service/local-storage.service';
import { CourseQuestionBankEntity } from '../../course/course-question-bank.entity';
import { getAssignmentPassScoreThreshold } from '../../course/course-assignment-submission-evaluation.types';
import { AssessmentBlueprintEntity } from '../entities/assessment-blueprint.entity';
import { AssessmentQuestionEntity } from '../entities/assessment-question.entity';
import { DocumentTextExtractionService } from './document-text-extraction.service';
import { GuidelineRulesService, QuestionSplitterService } from './guideline-and-splitter.service';

@Injectable()
export class BlueprintIngestionService {
  private readonly logger = new Logger(BlueprintIngestionService.name);

  constructor(
    @InjectRepository(AssessmentBlueprintEntity)
    private readonly blueprintRepo: Repository<AssessmentBlueprintEntity>,
    @InjectRepository(AssessmentQuestionEntity)
    private readonly questionRepo: Repository<AssessmentQuestionEntity>,
    @InjectRepository(CourseQuestionBankEntity)
    private readonly questionBankRepo: Repository<CourseQuestionBankEntity>,
    private readonly extractionService: DocumentTextExtractionService,
    private readonly splitterService: QuestionSplitterService,
    private readonly guidelineRulesService: GuidelineRulesService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  queueIngestion(questionBankId: string, forceReprocess = false): void {
    void this.ingestBlueprint(questionBankId, forceReprocess).catch((error) => {
      this.logger.error(
        `Blueprint ingestion failed for ${questionBankId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    });
  }

  async ingestBlueprint(
    questionBankId: string,
    forceReprocess = false,
  ): Promise<AssessmentBlueprintEntity | null> {
    const bank = await this.questionBankRepo.findOne({ where: { id: questionBankId } });
    if (!bank || bank.questionType !== 'assignment') return null;

    const questionFileUrl = bank.questionFileUrl;
    const answerSheetUrl = bank.answerSheetFileUrl || bank.referenceFileUrl;
    if (!questionFileUrl || !answerSheetUrl) {
      await this.markFailed(questionBankId, bank.courseId, 'Assessment and answer key are required');
      return null;
    }

    let blueprint = await this.blueprintRepo.findOne({ where: { questionBankId } });
    if (!blueprint) {
      blueprint = this.blueprintRepo.create({
        questionBankId,
        courseId: bank.courseId,
        status: 'pending',
        passingPercentage: bank.passingPercentage ?? null,
      });
      blueprint = await this.blueprintRepo.save(blueprint);
    }

    const contentHash = this.buildSourceHash(bank);
    if (!forceReprocess && blueprint.status === 'ready' && blueprint.sourceContentHash === contentHash) {
      return blueprint;
    }

    blueprint.status = 'extracting';
    blueprint.processingError = null;
    await this.blueprintRepo.save(blueprint);

    try {
      const [questionDoc, answerDoc, guideDoc] = await Promise.all([
        this.readDocument(questionFileUrl),
        this.readDocument(answerSheetUrl),
        bank.guideFileUrl ? this.readDocument(bank.guideFileUrl) : Promise.resolve(null),
      ]);

      if (!questionDoc?.couldRead || !answerDoc?.couldRead) {
        throw new Error('Could not extract text from assessment or answer key');
      }

      blueprint.status = 'splitting';
      await this.blueprintRepo.save(blueprint);

      const refineWithAi = String(process.env.ASSESSMENT_AI_SPLIT_REFINEMENT || '').toLowerCase() === 'true';
      const assessmentSegments = await this.splitterService.splitWithOptionalRefinement(
        questionDoc.text,
        { refineWithAi },
      );
      const answerSegments = await this.splitterService.splitWithOptionalRefinement(
        answerDoc.text,
        { refineWithAi: false },
      );

      const aligned = this.splitterService.alignAnswerKeyToQuestions(
        assessmentSegments,
        answerSegments,
      );

      if (!aligned.length) {
        throw new Error('No questions detected in assessment document');
      }

      await this.questionRepo.delete({ blueprintId: blueprint.id });

      const marksPerQuestion = this.resolveMarksPerQuestion(bank, aligned.length);
      const questions = aligned.map((row, index) =>
        this.questionRepo.create({
          blueprintId: blueprint!.id,
          questionNumber: row.questionNumber,
          label: row.label,
          promptText: row.promptText,
          expectedAnswerText: row.expectedAnswerText,
          maxScore: marksPerQuestion,
          sortOrder: index,
        }),
      );
      await this.questionRepo.save(questions);

      blueprint.totalMarks = questions.reduce((sum, q) => sum + Number(q.maxScore), 0);

      if (guideDoc?.couldRead && guideDoc.text.trim()) {
        blueprint.status = 'summarizing_guidelines';
        await this.blueprintRepo.save(blueprint);
        const rulesEntity = await this.guidelineRulesService.summarizeAndStore(
          blueprint.id,
          guideDoc.text,
        );
        blueprint.guidelineRulesId = rulesEntity?.id ?? null;
      } else {
        blueprint.guidelineRulesId = null;
      }

      blueprint.status = 'ready';
      blueprint.sourceContentHash = contentHash;
      blueprint.processedAt = new Date();
      blueprint.passingPercentage = bank.passingPercentage ?? null;
      return this.blueprintRepo.save(blueprint);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Blueprint ingestion failed';
      return this.markFailed(questionBankId, bank.courseId, message, blueprint.id);
    }
  }

  private async markFailed(
    questionBankId: string,
    courseId: string,
    message: string,
    blueprintId?: string,
  ): Promise<AssessmentBlueprintEntity> {
    const blueprint =
      (blueprintId
        ? await this.blueprintRepo.findOne({ where: { id: blueprintId } })
        : await this.blueprintRepo.findOne({ where: { questionBankId } })) ||
      this.blueprintRepo.create({ questionBankId, courseId, status: 'failed' });

    blueprint.status = 'failed';
    blueprint.processingError = message;
    return this.blueprintRepo.save(blueprint);
  }

  private buildSourceHash(bank: CourseQuestionBankEntity): string {
    const payload = [
      bank.questionFileUrl,
      bank.answerSheetFileUrl || bank.referenceFileUrl,
      bank.guideFileUrl,
      bank.updatedAt?.toISOString?.() || '',
    ].join('|');
    return createHash('sha256').update(payload).digest('hex').slice(0, 32);
  }

  private resolveMarksPerQuestion(bank: CourseQuestionBankEntity, questionCount: number): number {
    const envTotal = Number(process.env.ASSESSMENT_DEFAULT_TOTAL_MARKS);
    if (Number.isFinite(envTotal) && envTotal > 0 && questionCount > 0) {
      return Math.round((envTotal / questionCount) * 100) / 100;
    }
    return 1;
  }

  private async readDocument(fileUrl: string) {
    const stored = await this.localStorageService.readFileByUrl(fileUrl);
    if (!stored) return null;
    return this.extractionService.extractFromBuffer(
      stored.buffer,
      stored.fileName,
      stored.mimeType,
    );
  }

  getPassThreshold(blueprint: AssessmentBlueprintEntity): number {
    return getAssignmentPassScoreThreshold(blueprint.passingPercentage);
  }

  async getLearnerOutline(questionBankId: string): Promise<{
    ready: boolean;
    status: string;
    questions: {
      id: string;
      questionNumber: number;
      label: string;
      promptText: string;
      maxScore: number;
    }[];
  }> {
    const blueprint = await this.blueprintRepo.findOne({ where: { questionBankId } });
    if (!blueprint || blueprint.status !== 'ready') {
      return {
        ready: false,
        status: blueprint?.status || 'pending',
        questions: [],
      };
    }

    const questions = await this.questionRepo.find({
      where: { blueprintId: blueprint.id },
      order: { sortOrder: 'ASC', questionNumber: 'ASC' },
    });

    return {
      ready: true,
      status: blueprint.status,
      questions: questions.map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        label: q.label,
        promptText: q.promptText,
        maxScore: Number(q.maxScore) || 1,
      })),
    };
  }
}
