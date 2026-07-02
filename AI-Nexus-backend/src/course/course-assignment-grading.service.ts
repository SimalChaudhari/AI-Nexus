import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { extname } from 'path';

import { LlmService } from '../llm/llm.service';
import { LlmChatContentPart } from '../llm/llm.types';
import { LocalStorageService } from '../service/local-storage.service';
import { CourseQuestionBankEntity } from './course-question-bank.entity';
import { CourseQuestionAssignmentSubmissionEntity } from './course-question-assignment-submission.entity';
import {
  AssignmentAiGradingResult,
  AssignmentVerificationLogEntry,
  getAssignmentPassScoreThreshold,
  resolvePassFromScore,
} from './course-assignment-submission-evaluation.types';
import { getSubmissionFilesFromEntity } from './course-assignment-file.types';

type PreparedFileContent = {
  label: string;
  fileName: string;
  text?: string;
  imageDataUrl?: string;
  couldRead: boolean;
};

@Injectable()
export class CourseAssignmentGradingService {
  private readonly logger = new Logger(CourseAssignmentGradingService.name);

  constructor(
    @InjectRepository(CourseQuestionAssignmentSubmissionEntity)
    private readonly submissionRepo: Repository<CourseQuestionAssignmentSubmissionEntity>,
    @InjectRepository(CourseQuestionBankEntity)
    private readonly questionRepo: Repository<CourseQuestionBankEntity>,
    private readonly llmService: LlmService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  queueGrading(submissionId: string): void {
    void this.gradeSubmissionById(submissionId).catch((error) => {
      this.logger.error(
        `Assignment grading failed for ${submissionId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    });
  }

  async gradeSubmissionById(submissionId: string): Promise<CourseQuestionAssignmentSubmissionEntity | null> {
    const submission = await this.submissionRepo.findOne({ where: { id: submissionId } });
    if (!submission) return null;

    const question = await this.questionRepo.findOne({
      where: { id: submission.questionId, courseId: submission.courseId },
    });
    if (!question) return null;

    const passThreshold = getAssignmentPassScoreThreshold(question.passingPercentage);
    const learnerFiles = getSubmissionFilesFromEntity(submission);

    submission.evaluationStatus = 'processing';
    submission.aiScore = null;
    submission.aiPassed = null;
    submission.aiFeedback = null;
    submission.aiRawResult = null;
    submission.aiEvaluatedAt = null;
    await this.submissionRepo.save(submission);

    try {
      if (!this.llmService.isConfigured()) {
        return this.saveManualRequired(
          submission,
          'AI grading is not configured. An admin will review your submission manually.',
        );
      }

      if (!learnerFiles.length) {
        return this.saveManualRequired(
          submission,
          'No submission files found. An admin will review manually.',
        );
      }

      const answerSheetUrl =
        question.answerSheetFileUrl || question.referenceFileUrl || null;
      const answerSheetName =
        question.answerSheetFileName || question.referenceFileName || null;

      const questionFile = question.questionFileUrl
        ? await this.localStorageService.readFileByUrl(question.questionFileUrl)
        : null;

      const answerSheetFile = answerSheetUrl
        ? await this.localStorageService.readFileByUrl(answerSheetUrl)
        : null;

      const questionPrepared = questionFile
        ? await this.prepareFileContent(
            questionFile.buffer,
            questionFile.mimeType,
            questionFile.fileName,
            'Assessment question',
          )
        : null;

      const answerSheetPrepared = answerSheetFile
        ? await this.prepareFileContent(
            answerSheetFile.buffer,
            answerSheetFile.mimeType,
            answerSheetFile.fileName,
            'Official answer sheet',
          )
        : null;

      const learnerPrepared: PreparedFileContent[] = [];
      for (const file of learnerFiles) {
        const stored = await this.localStorageService.readFileByUrl(file.fileUrl);
        if (!stored) {
          learnerPrepared.push({
            label: 'Learner submission',
            fileName: file.originalFileName,
            couldRead: false,
          });
          continue;
        }
        learnerPrepared.push(
          await this.prepareFileContent(
            stored.buffer,
            stored.mimeType,
            stored.fileName || file.originalFileName,
            `Learner file: ${file.originalFileName}`,
          ),
        );
      }

      const readableLearner = learnerPrepared.filter((f) => f.couldRead);
      if (!readableLearner.length) {
        return this.saveManualRequired(
          submission,
          'AI could not read the uploaded file formats. An admin will review manually.',
        );
      }

      if (!answerSheetPrepared?.couldRead) {
        return this.saveManualRequired(
          submission,
          answerSheetUrl
            ? 'The official answer sheet could not be read. An admin will review manually.'
            : 'No official answer sheet is configured for this assessment. An admin will review manually.',
        );
      }

      const result = await this.runAiGrading(
        question,
        passThreshold,
        questionPrepared,
        answerSheetPrepared,
        learnerPrepared,
      );

      const aiRawResult = this.buildStoredAiRawResult(result, {
        passThreshold,
        question,
        questionPrepared,
        answerSheetPrepared,
        answerSheetName,
        learnerPrepared,
        learnerFileNames: learnerFiles.map((f) => f.originalFileName),
      });

      if (!result.couldVerify) {
        return this.saveManualRequired(
          submission,
          result.feedback || 'AI could not verify this submission. An admin will review manually.',
          result,
          aiRawResult,
        );
      }

      submission.evaluationStatus = 'completed';
      submission.aiScore = result.score;
      submission.aiPassed = result.passed;
      submission.aiFeedback = result.feedback;
      submission.aiRawResult = aiRawResult;
      submission.aiEvaluatedAt = new Date();
      return this.submissionRepo.save(submission);
    } catch (error) {
      submission.evaluationStatus = 'manual_required';
      submission.aiPassed = null;
      submission.aiScore = null;
      submission.aiFeedback =
        error instanceof Error
          ? `Automatic grading failed: ${error.message}. An admin will review manually.`
          : 'Automatic grading failed. An admin will review manually.';
      submission.aiEvaluatedAt = new Date();
      return this.submissionRepo.save(submission);
    }
  }

  private async saveManualRequired(
    submission: CourseQuestionAssignmentSubmissionEntity,
    feedback: string,
    result?: AssignmentAiGradingResult,
    aiRawResult?: Record<string, unknown> | null,
  ) {
    submission.evaluationStatus = 'manual_required';
    submission.aiScore = result?.score ?? null;
    submission.aiPassed = null;
    submission.aiFeedback = feedback;
    submission.aiRawResult = aiRawResult ?? result?.raw ?? null;
    submission.aiEvaluatedAt = new Date();
    return this.submissionRepo.save(submission);
  }

  private buildStoredAiRawResult(
    result: AssignmentAiGradingResult,
    context: {
      passThreshold: number;
      question: CourseQuestionBankEntity;
      questionPrepared: PreparedFileContent | null;
      answerSheetPrepared: PreparedFileContent | null;
      answerSheetName?: string | null;
      learnerPrepared: PreparedFileContent[];
      learnerFileNames: string[];
    },
  ): Record<string, unknown> {
    return {
      ...(result.raw || {}),
      verificationLog: this.buildVerificationLog(result, context),
      passThreshold: context.passThreshold,
      learnerFileNames: context.learnerFileNames,
      answerSheetFileName: context.answerSheetName || null,
      strengths: result.raw?.strengths ?? [],
      weaknesses: result.raw?.weaknesses ?? [],
      confidence: result.confidence,
      couldVerify: result.couldVerify,
      gradedAt: new Date().toISOString(),
    };
  }

  private buildVerificationLog(
    result: AssignmentAiGradingResult,
    context: {
      passThreshold: number;
      question: CourseQuestionBankEntity;
      questionPrepared: PreparedFileContent | null;
      answerSheetPrepared: PreparedFileContent | null;
      answerSheetName?: string | null;
      learnerPrepared: PreparedFileContent[];
      learnerFileNames: string[];
    },
  ): AssignmentVerificationLogEntry[] {
    const logs: AssignmentVerificationLogEntry[] = [
      {
        step: 'Assessment loaded',
        status: 'info',
        detail: context.question.prompt || 'Assessment loaded',
      },
    ];

    if (context.questionPrepared) {
      logs.push({
        step: 'Assessment question file',
        status: context.questionPrepared.couldRead ? 'pass' : 'warn',
        detail: context.questionPrepared.couldRead
          ? 'Question file processed'
          : 'Question file could not be fully read',
      });
    }

    if (context.answerSheetPrepared) {
      logs.push({
        step: 'Official answer sheet',
        status: context.answerSheetPrepared.couldRead ? 'pass' : 'fail',
        detail: context.answerSheetPrepared.couldRead
          ? context.answerSheetPrepared.imageDataUrl
            ? `Image answer sheet read (${context.answerSheetName || 'file'})`
            : `Text extracted from ${context.answerSheetName || 'answer sheet'}`
          : `Could not read ${context.answerSheetName || 'answer sheet'}`,
      });
    } else {
      logs.push({
        step: 'Official answer sheet',
        status: 'fail',
        detail: 'No answer sheet configured',
      });
    }

    context.learnerPrepared.forEach((file, index) => {
      logs.push({
        step: `Learner file ${index + 1}`,
        status: file.couldRead ? 'pass' : 'fail',
        detail: file.couldRead
          ? file.imageDataUrl
            ? `Image read (${file.fileName})`
            : `Text extracted from ${file.fileName}`
          : `Could not read ${file.fileName}`,
      });
    });

    if (!result.couldVerify) {
      logs.push({
        step: 'AI verification',
        status: 'fail',
        detail: result.feedback || 'AI could not verify this submission',
      });
      return logs;
    }

    logs.push({
      step: 'AI compared submission to answer sheet',
      status: 'pass',
      detail: result.confidence
        ? `Comparison completed (confidence: ${result.confidence})`
        : 'Submission compared against official answer sheet',
    });

    const aiChecks = result.raw?.checks;
    if (Array.isArray(aiChecks)) {
      aiChecks.forEach((check, index) => {
        if (!check || typeof check !== 'object') return;
        const row = check as Record<string, unknown>;
        const statusRaw = String(row.status || 'unknown').toLowerCase();
        const status =
          statusRaw === 'pass' ? 'pass' : statusRaw === 'fail' ? 'fail' : 'info';
        logs.push({
          step: String(row.label || `Check ${index + 1}`),
          status,
          detail: String(row.detail || 'Verified by AI'),
        });
      });
    }

    if (result.score != null) {
      logs.push({
        step: 'AI score',
        status: 'info',
        detail: `${result.score}%`,
      });
    }

    logs.push({
      step: 'Pass threshold',
      status: result.passed ? 'pass' : 'fail',
      detail: `Required ${context.passThreshold}% — ${result.passed ? 'Passed' : 'Failed'}`,
    });

    if (result.feedback) {
      logs.push({
        step: 'AI feedback',
        status: result.passed ? 'pass' : 'fail',
        detail: result.feedback,
      });
    }

    return logs;
  }

  private async runAiGrading(
    question: CourseQuestionBankEntity,
    passThreshold: number,
    questionPrepared: PreparedFileContent | null,
    answerSheetPrepared: PreparedFileContent,
    learnerPrepared: PreparedFileContent[],
  ): Promise<AssignmentAiGradingResult> {
    const systemPrompt = `You grade course assessment submissions.
DO NOT solve the assessment question yourself.
Use the OFFICIAL ANSWER SHEET as the authoritative reference for what a correct submission should contain.
Compare the learner's submission files against the official answer sheet.

Evaluate on: accuracy, completeness, missing steps, correctness, and quality.

Return ONLY valid JSON with this shape:
{
  "score": <integer 0-100>,
  "pass": <true|false>,
  "passed": <true|false>,
  "feedback": "<short learner-facing explanation>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>"],
  "confidence": "<high|medium|low>",
  "couldVerify": <true|false>,
  "checks": [
    { "label": "<what was checked>", "status": "pass|fail|unknown", "detail": "<brief reason>" }
  ]
}
Rules:
- score is the main result: 0 = no requirements met, 100 = fully matches the answer sheet.
- The platform passes learners at score >= ${passThreshold}. Set pass/passed true only when score >= ${passThreshold}.
- Set couldVerify to false when files are unreadable, unrelated, or there is not enough evidence to grade.
- Be practical: screenshots, documents, spreadsheets, and presentations may contain answers in text or visuals.
- Do not invent requirements beyond what the answer sheet shows.`;

    const learnerTextBlocks = learnerPrepared
      .filter((f) => f.text)
      .map((f) => `--- ${f.fileName} ---\n${f.text}`)
      .join('\n\n');

    const userParts: LlmChatContentPart[] = [
      {
        type: 'text',
        text: [
          'ASSESSMENT TITLE:',
          question.prompt || '(no title)',
          '',
          'ASSESSMENT DESCRIPTION / INSTRUCTIONS:',
          question.explanation || '(none provided)',
          '',
          questionPrepared?.text
            ? `ASSESSMENT QUESTION FILE (extracted text):\n${questionPrepared.text}`
            : 'ASSESSMENT QUESTION FILE: (not provided or unreadable)',
          '',
          answerSheetPrepared.text
            ? `OFFICIAL ANSWER SHEET (extracted text):\n${answerSheetPrepared.text}`
            : 'OFFICIAL ANSWER SHEET: see attached image(s).',
          '',
          learnerTextBlocks
            ? `LEARNER SUBMISSION FILES (extracted text):\n${learnerTextBlocks}`
            : 'LEARNER SUBMISSION FILES: see attached image(s) below.',
        ].join('\n'),
      },
    ];

    if (questionPrepared?.imageDataUrl) {
      userParts.push({
        type: 'image_url',
        image_url: { url: questionPrepared.imageDataUrl },
      });
    }
    if (answerSheetPrepared.imageDataUrl) {
      userParts.push({
        type: 'image_url',
        image_url: { url: answerSheetPrepared.imageDataUrl },
      });
    }
    learnerPrepared
      .filter((f) => f.imageDataUrl)
      .forEach((f) => {
        userParts.push({
          type: 'image_url',
          image_url: { url: f.imageDataUrl! },
        });
      });

    const response = await this.llmService.chat({
      useCase: 'default',
      temperature: 0.1,
      maxTokens: 1600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userParts },
      ],
    });

    return this.parseAiResult(response.text, question.passingPercentage);
  }

  private parseAiResult(
    text: string,
    passingPercentage?: number | null,
  ): AssignmentAiGradingResult {
    const rawText = String(text || '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        score: null,
        passed: null,
        feedback: 'AI returned an invalid grading response.',
        confidence: null,
        couldVerify: false,
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const couldVerify = parsed.couldVerify === true;
      const scoreRaw = Number(parsed.score);
      const score = Number.isFinite(scoreRaw)
        ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
        : null;
      const passThreshold = getAssignmentPassScoreThreshold(passingPercentage);
      const passedFromAi = parsed.pass ?? parsed.passed;
      const passed =
        passedFromAi === true || passedFromAi === false
          ? passedFromAi
          : resolvePassFromScore(score, passingPercentage);
      let feedback = String(parsed.feedback || '').trim() || 'Graded by AI.';
      if (couldVerify && score != null && passed === false && !feedback.toLowerCase().includes('pass')) {
        feedback = `${feedback} Score ${score}% — need at least ${passThreshold}% to pass.`.trim();
      }
      const confidenceValue = String(parsed.confidence || '').toLowerCase();
      const confidence =
        confidenceValue === 'high' || confidenceValue === 'medium' || confidenceValue === 'low'
          ? confidenceValue
          : null;

      return {
        score,
        passed: couldVerify ? passed : null,
        feedback,
        confidence,
        couldVerify,
        raw: parsed,
      };
    } catch {
      return {
        score: null,
        passed: null,
        feedback: 'AI returned malformed JSON.',
        confidence: null,
        couldVerify: false,
      };
    }
  }

  private async prepareFileContent(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
    label: string,
  ): Promise<PreparedFileContent> {
    const ext = this.getExtension(fileName, mimeType);

    if (this.isImageMime(mimeType, ext)) {
      return {
        label,
        fileName,
        imageDataUrl: this.buildDataUrl(buffer, mimeType),
        couldRead: true,
      };
    }

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const text = await this.extractPdfText(buffer);
      return { label, fileName, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.docx' || mimeType.includes('wordprocessingml')) {
      const text = await this.extractDocxText(buffer);
      return { label, fileName, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.doc' || mimeType === 'application/msword') {
      const text = await this.extractDocText(buffer);
      return { label, fileName, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.pptx' || mimeType.includes('presentationml')) {
      const text = await this.extractPptxText(buffer);
      return { label, fileName, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.txt' || mimeType === 'text/plain') {
      const text = String(buffer.toString('utf8') || '').trim();
      return { label, fileName, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.xlsx' || ext === '.xlsm' || mimeType.includes('spreadsheetml')) {
      const text = await this.extractXlsxText(buffer);
      return { label, fileName, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.ppt' || mimeType.includes('powerpoint')) {
      return { label, fileName, text: '', couldRead: false };
    }

    return { label, fileName, text: '', couldRead: false };
  }

  private isImageMime(mimeType: string, ext: string): boolean {
    if (/^image\//i.test(mimeType)) return true;
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(ext);
  }

  private getExtension(fileName: string, mimeType: string): string {
    const fromName = extname(String(fileName || '')).toLowerCase();
    if (fromName) return fromName;
    if (mimeType === 'application/pdf') return '.pdf';
    if (mimeType.includes('wordprocessingml')) return '.docx';
    if (mimeType === 'application/msword') return '.doc';
    if (mimeType.includes('presentationml')) return '.pptx';
    if (mimeType.includes('powerpoint')) return '.ppt';
    if (mimeType.includes('spreadsheetml')) return '.xlsx';
    if (mimeType === 'text/plain') return '.txt';
    return '';
  }

  private buildDataUrl(buffer: Buffer, mimeType: string): string {
    const safeMime = mimeType.startsWith('image/') ? mimeType : 'image/png';
    return `data:${safeMime};base64,${buffer.toString('base64')}`;
  }

  private truncateText(text: string, max = 12000): string {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    return value.length <= max ? value : `${value.slice(0, max)}…`;
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse') as (data: Buffer) => Promise<{ text?: string }>;
      const result = await pdfParse(buffer);
      return String(result?.text || '').trim();
    } catch {
      return '';
    }
  }

  private async extractDocxText(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const mammoth = require('mammoth') as {
        extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
      };
      const { value } = await mammoth.extractRawText({ buffer });
      return String(value || '').trim();
    } catch {
      return '';
    }
  }

  private async extractDocText(buffer: Buffer): Promise<string> {
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');
    const tmp = path.join(
      os.tmpdir(),
      `assignment-${Date.now()}-${Math.random().toString(36).slice(2)}.doc`,
    );
    await fs.writeFile(tmp, buffer);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const WordExtractor = require('word-extractor') as new () => {
        extract: (p: string) => Promise<{ getBody: () => string }>;
      };
      const extractor = new WordExtractor();
      const document = await extractor.extract(tmp);
      return String(document.getBody() || '').trim();
    } catch {
      return '';
    } finally {
      await fs.unlink(tmp).catch(() => undefined);
    }
  }

  private async extractPptxText(buffer: Buffer): Promise<string> {
    try {
      const { promisify } = await import('util');
      const zlib = await import('zlib');
      const inflateRaw = promisify(zlib.inflateRaw);
      const chunks: string[] = [];
      const source = buffer.toString('binary');
      const localHeaders = [...source.matchAll(/\x50\x4b\x03\x04/g)];
      for (let i = 0; i < localHeaders.length; i += 1) {
        const start = localHeaders[i].index ?? 0;
        const nameLength = source.charCodeAt(start + 26) + (source.charCodeAt(start + 27) << 8);
        const extraLength = source.charCodeAt(start + 28) + (source.charCodeAt(start + 29) << 8);
        const compressedSize =
          source.charCodeAt(start + 18) +
          (source.charCodeAt(start + 19) << 8) +
          (source.charCodeAt(start + 20) << 16) +
          (source.charCodeAt(start + 21) << 24);
        const fileName = source.slice(start + 30, start + 30 + nameLength);
        const dataStart = start + 30 + nameLength + extraLength;
        const compressed = Buffer.from(source.slice(dataStart, dataStart + compressedSize), 'binary');
        if (!fileName.startsWith('ppt/slides/slide') || !fileName.endsWith('.xml')) continue;
        const xmlBuffer = await inflateRaw(compressed);
        const xml = xmlBuffer.toString('utf8');
        const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]);
        if (texts.length) chunks.push(texts.join(' '));
      }
      return chunks.join('\n').trim();
    } catch {
      return '';
    }
  }

  private async extractXlsxText(buffer: Buffer): Promise<string> {
    try {
      const { promisify } = await import('util');
      const zlib = await import('zlib');
      const inflateRaw = promisify(zlib.inflateRaw);
      const chunks: string[] = [];
      const source = buffer.toString('binary');
      const localHeaders = [...source.matchAll(/\x50\x4b\x03\x04/g)];
      for (let i = 0; i < localHeaders.length; i += 1) {
        const start = localHeaders[i].index ?? 0;
        const nameLength = source.charCodeAt(start + 26) + (source.charCodeAt(start + 27) << 8);
        const extraLength = source.charCodeAt(start + 28) + (source.charCodeAt(start + 29) << 8);
        const compressedSize =
          source.charCodeAt(start + 18) +
          (source.charCodeAt(start + 19) << 8) +
          (source.charCodeAt(start + 20) << 16) +
          (source.charCodeAt(start + 21) << 24);
        const fileName = source.slice(start + 30, start + 30 + nameLength);
        const dataStart = start + 30 + nameLength + extraLength;
        const compressed = Buffer.from(source.slice(dataStart, dataStart + compressedSize), 'binary');
        if (
          !fileName.startsWith('xl/worksheets/sheet') ||
          !fileName.endsWith('.xml')
        ) {
          if (fileName === 'xl/sharedStrings.xml') {
            const xmlBuffer = await inflateRaw(compressed);
            const xml = xmlBuffer.toString('utf8');
            const texts = [...xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
            if (texts.length) chunks.push(texts.join(' '));
          }
          continue;
        }
        const xmlBuffer = await inflateRaw(compressed);
        const xml = xmlBuffer.toString('utf8');
        const texts = [...xml.matchAll(/<v>([^<]*)<\/v>/g)].map((m) => m[1]);
        if (texts.length) chunks.push(texts.join(' '));
      }
      return chunks.join(' ').trim();
    } catch {
      return '';
    }
  }
}
