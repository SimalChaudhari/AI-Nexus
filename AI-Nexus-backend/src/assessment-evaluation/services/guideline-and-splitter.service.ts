import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';

import { LlmService } from '../../llm/llm.service';
import {
  AssessmentGuidelineRulesPayload,
  SplitQuestionSegment,
} from '../assessment-evaluation.types';
import {
  GUIDELINE_SUMMARIZATION_SYSTEM,
  buildGuidelineSummarizationUserPrompt,
  buildQuestionSplitRefinementUserPrompt,
  QUESTION_SPLIT_REFINEMENT_SYSTEM,
} from '../assessment-evaluation.prompts';
import { AssessmentGuidelineRulesEntity } from '../entities/assessment-guideline-rules.entity';
import {
  asStringArray,
  extractJsonObject,
} from '../utils/parse-structured-json.util';
import { splitTextIntoQuestions } from '../utils/question-splitter.util';

@Injectable()
export class GuidelineRulesService {
  private readonly logger = new Logger(GuidelineRulesService.name);

  constructor(
    @InjectRepository(AssessmentGuidelineRulesEntity)
    private readonly rulesRepo: Repository<AssessmentGuidelineRulesEntity>,
    private readonly llmService: LlmService,
  ) {}

  hashContent(text: string): string {
    return createHash('sha256').update(String(text || '')).digest('hex').slice(0, 32);
  }

  async getRulesForBlueprint(blueprintId: string): Promise<AssessmentGuidelineRulesPayload | null> {
    const row = await this.rulesRepo.findOne({ where: { blueprintId } });
    return row?.rules ?? null;
  }

  async summarizeAndStore(
    blueprintId: string,
    guidelineText: string,
  ): Promise<AssessmentGuidelineRulesEntity | null> {
    const trimmed = String(guidelineText || '').trim();
    if (!trimmed) return null;

    const sourceFileHash = this.hashContent(trimmed);
    const existing = await this.rulesRepo.findOne({ where: { blueprintId } });
    if (existing?.sourceFileHash === sourceFileHash) {
      return existing;
    }

    if (!this.llmService.isConfigured()) {
      const fallback = this.buildFallbackRules(trimmed);
      return this.saveRules(blueprintId, sourceFileHash, fallback, existing?.id);
    }

    try {
      const response = await this.llmService.chat({
        useCase: 'default',
        temperature: 0.1,
        maxTokens: 1200,
        messages: [
          { role: 'system', content: GUIDELINE_SUMMARIZATION_SYSTEM },
          { role: 'user', content: buildGuidelineSummarizationUserPrompt(trimmed.slice(0, 12000)) },
        ],
      });

      const parsed = extractJsonObject(response.text);
      const rules = this.normalizeRulesPayload(parsed, trimmed);
      return this.saveRules(blueprintId, sourceFileHash, rules, existing?.id);
    } catch (error) {
      this.logger.warn(
        `Guideline summarization failed, using fallback: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return this.saveRules(
        blueprintId,
        sourceFileHash,
        this.buildFallbackRules(trimmed),
        existing?.id,
      );
    }
  }

  private async saveRules(
    blueprintId: string,
    sourceFileHash: string,
    rules: AssessmentGuidelineRulesPayload,
    existingId?: string,
  ): Promise<AssessmentGuidelineRulesEntity> {
    const entity = this.rulesRepo.create({
      id: existingId,
      blueprintId,
      sourceFileHash,
      rules,
      sourceTokenEstimate: Math.ceil(JSON.stringify(rules).length / 4),
    });
    return this.rulesRepo.save(entity);
  }

  private buildFallbackRules(guidelineText: string): AssessmentGuidelineRulesPayload {
    const lines = guidelineText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 3)
      .slice(0, 12);

    return {
      version: 1,
      globalRules: lines.slice(0, 6),
      markingCriteria: lines.slice(6, 10),
      synonymPolicy: 'flexible',
      grammarPolicy: 'ignore',
      perQuestionRules: {},
      defaultQuestionRules: ['Award partial credit for correct concepts'],
      notes: 'Fallback rules generated without AI',
    };
  }

  private normalizeRulesPayload(
    parsed: Record<string, unknown> | null,
    fallbackText: string,
  ): AssessmentGuidelineRulesPayload {
    if (!parsed) return this.buildFallbackRules(fallbackText);

    const perQuestionRaw = parsed.perQuestionRules;
    const perQuestionRules: Record<string, string[]> = {};
    if (perQuestionRaw && typeof perQuestionRaw === 'object' && !Array.isArray(perQuestionRaw)) {
      Object.entries(perQuestionRaw as Record<string, unknown>).forEach(([key, value]) => {
        perQuestionRules[String(key)] = asStringArray(value);
      });
    }

    const synonym = String(parsed.synonymPolicy || 'flexible');
    const grammar = String(parsed.grammarPolicy || 'ignore');

    return {
      version: 1,
      globalRules: asStringArray(parsed.globalRules),
      markingCriteria: asStringArray(parsed.markingCriteria),
      synonymPolicy: ['strict', 'flexible', 'contextual'].includes(synonym)
        ? (synonym as AssessmentGuidelineRulesPayload['synonymPolicy'])
        : 'flexible',
      grammarPolicy: ['ignore', 'minor_penalty', 'strict'].includes(grammar)
        ? (grammar as AssessmentGuidelineRulesPayload['grammarPolicy'])
        : 'ignore',
      perQuestionRules,
      defaultQuestionRules: asStringArray(parsed.defaultQuestionRules),
      notes: parsed.notes ? String(parsed.notes).slice(0, 500) : undefined,
    };
  }
}

@Injectable()
export class QuestionSplitterService {
  private readonly logger = new Logger(QuestionSplitterService.name);

  constructor(private readonly llmService: LlmService) {}

  splitHeuristic(text: string): SplitQuestionSegment[] {
    return splitTextIntoQuestions(text);
  }

  async splitWithOptionalRefinement(
    text: string,
    options?: { refineWithAi?: boolean },
  ): Promise<SplitQuestionSegment[]> {
    const heuristic = this.splitHeuristic(text);
    if (!options?.refineWithAi || heuristic.length <= 1 || !this.llmService.isConfigured()) {
      return heuristic;
    }

    try {
      const response = await this.llmService.chat({
        useCase: 'default',
        temperature: 0,
        maxTokens: 4000,
        messages: [
          { role: 'system', content: QUESTION_SPLIT_REFINEMENT_SYSTEM },
          {
            role: 'user',
            content: buildQuestionSplitRefinementUserPrompt(text, heuristic),
          },
        ],
      });

      const parsed = extractJsonObject(response.text);
      const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
      if (!questions.length) return heuristic;

      const refined: SplitQuestionSegment[] = questions
        .map((item, index) => {
          const row = item as Record<string, unknown>;
          const questionNumber = Number(row.questionNumber) || index + 1;
          const body = String(row.text || '').trim();
          if (!body) return null;
          return {
            questionNumber,
            label: String(row.label || `Q${questionNumber}`),
            text: body,
            startOffset: 0,
            endOffset: body.length,
          };
        })
        .filter((item): item is SplitQuestionSegment => Boolean(item));

      return refined.length ? refined : heuristic;
    } catch (error) {
      this.logger.warn(
        `AI question split refinement failed, using heuristic: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return heuristic;
    }
  }

  alignAnswerKeyToQuestions(
    assessmentSegments: SplitQuestionSegment[],
    answerKeySegments: SplitQuestionSegment[],
  ): { questionNumber: number; label: string; promptText: string; expectedAnswerText: string }[] {
    const answerByNumber = new Map(
      answerKeySegments.map((segment) => [segment.questionNumber, segment.text]),
    );

    return assessmentSegments.map((segment, index) => ({
      questionNumber: index + 1,
      label: segment.label || `Q${index + 1}`,
      promptText: segment.text,
      expectedAnswerText:
        answerByNumber.get(segment.questionNumber) ||
        answerKeySegments[index]?.text ||
        '',
    }));
  }
}
