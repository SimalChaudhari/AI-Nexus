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

type PreparedFileContent = {
  label: string;
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

      const learnerFile = await this.localStorageService.readFileByUrl(submission.fileUrl);
      if (!learnerFile) {
        return this.saveManualRequired(
          submission,
          'Learner file could not be read. An admin will review manually.',
        );
      }

      const referenceFile = question.referenceFileUrl
        ? await this.localStorageService.readFileByUrl(question.referenceFileUrl)
        : null;

      const learnerPrepared = await this.prepareFileContent(
        learnerFile.buffer,
        learnerFile.mimeType,
        learnerFile.fileName,
        'Learner submission',
      );
      const referencePrepared = referenceFile
        ? await this.prepareFileContent(
            referenceFile.buffer,
            referenceFile.mimeType,
            referenceFile.fileName,
            'Admin reference / marking guide',
          )
        : null;

      if (!learnerPrepared.couldRead) {
        return this.saveManualRequired(
          submission,
          'AI could not read the uploaded file format. An admin will review manually.',
        );
      }

      const result = await this.runAiGrading(question, referencePrepared, learnerPrepared);
      const passThreshold = getAssignmentPassScoreThreshold();
      const aiRawResult = this.buildStoredAiRawResult(result, {
        passThreshold,
        question,
        referencePrepared,
        learnerPrepared,
        learnerFileName: submission.originalFileName,
        referenceFileName: question.referenceFileName,
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
      referencePrepared: PreparedFileContent | null;
      learnerPrepared: PreparedFileContent;
      learnerFileName: string;
      referenceFileName?: string | null;
    },
  ): Record<string, unknown> {
    return {
      ...(result.raw || {}),
      verificationLog: this.buildVerificationLog(result, context),
      passThreshold: context.passThreshold,
      learnerFileName: context.learnerFileName,
      referenceFileName: context.referenceFileName || null,
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
      referencePrepared: PreparedFileContent | null;
      learnerPrepared: PreparedFileContent;
      learnerFileName: string;
      referenceFileName?: string | null;
    },
  ): AssignmentVerificationLogEntry[] {
    const logs: AssignmentVerificationLogEntry[] = [
      {
        step: 'Assessment loaded',
        status: 'info',
        detail: context.question.prompt || 'Assessment prompt loaded',
      },
    ];

    if (context.referencePrepared) {
      logs.push({
        step: 'Admin reference / marking guide',
        status: context.referencePrepared.couldRead ? 'pass' : 'fail',
        detail: context.referencePrepared.couldRead
          ? context.referencePrepared.imageDataUrl
            ? `Image reference read (${context.referenceFileName || 'file'})`
            : `Text extracted from ${context.referenceFileName || 'reference file'}`
          : `Could not read ${context.referenceFileName || 'reference file'}`,
      });
    } else {
      logs.push({
        step: 'Admin reference / marking guide',
        status: 'warn',
        detail: 'No reference file uploaded — graded from instructions only',
      });
    }

    logs.push({
      step: 'Learner submission file',
      status: context.learnerPrepared.couldRead ? 'pass' : 'fail',
      detail: context.learnerPrepared.couldRead
        ? context.learnerPrepared.imageDataUrl
          ? `Image submission read (${context.learnerFileName})`
          : `Text extracted from ${context.learnerFileName}`
        : `Could not read ${context.learnerFileName}`,
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
      step: 'AI compared submission to rubric',
      status: 'pass',
      detail: result.confidence
        ? `Comparison completed (confidence: ${result.confidence})`
        : 'Submission compared against assessment requirements',
    });

    const aiChecks = result.raw?.checks;
    if (Array.isArray(aiChecks)) {
      aiChecks.forEach((check, index) => {
        if (!check || typeof check !== 'object') return;
        const row = check as Record<string, unknown>;
        const statusRaw = String(row.status || 'unknown').toLowerCase();
        const status =
          statusRaw === 'pass'
            ? 'pass'
            : statusRaw === 'fail'
              ? 'fail'
              : 'info';
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
    referencePrepared: PreparedFileContent | null,
    learnerPrepared: PreparedFileContent,
  ): Promise<AssignmentAiGradingResult> {
    const passThreshold = getAssignmentPassScoreThreshold();
    const systemPrompt = `You grade course assessment submissions.
Compare the learner submission against the assessment instructions and any admin reference/marking guide.
Supported admin/learner file types include PDF, Word, PowerPoint, and images.
Return ONLY valid JSON with this shape:
{
  "score": <integer 0-100>,
  "passed": <true|false>,
  "feedback": "<short learner-facing explanation>",
  "confidence": "<high|medium|low>",
  "couldVerify": <true|false>,
  "checks": [
    { "label": "<what was checked>", "status": "pass|fail|unknown", "detail": "<brief reason>" }
  ]
}
Rules:
- score is the main result: 0 = no requirements met, 100 = fully correct.
- The platform passes learners at score >= ${passThreshold}. Set passed true only when score >= ${passThreshold}.
- Set couldVerify to false when files are unreadable, unrelated, or there is not enough evidence to grade.
- Be practical: screenshots, documents, and presentations may contain the answer in text or visuals.
- Do not invent requirements that are not in the assessment or marking guide.`;

    const userParts: LlmChatContentPart[] = [
      {
        type: 'text',
        text: [
          'ASSESSMENT TITLE / PROMPT:',
          question.prompt || '(no title)',
          '',
          'ASSESSMENT INSTRUCTIONS:',
          question.explanation || '(none provided)',
          '',
          referencePrepared?.text
            ? `ADMIN REFERENCE / MARKING GUIDE (extracted text):\n${referencePrepared.text}`
            : 'ADMIN REFERENCE / MARKING GUIDE: (none uploaded)',
          '',
          learnerPrepared.text
            ? `LEARNER SUBMISSION (extracted text):\n${learnerPrepared.text}`
            : 'LEARNER SUBMISSION: see attached image(s).',
        ].join('\n'),
      },
    ];

    if (referencePrepared?.imageDataUrl) {
      userParts.push({
        type: 'image_url',
        image_url: { url: referencePrepared.imageDataUrl },
      });
    }
    if (learnerPrepared.imageDataUrl) {
      userParts.push({
        type: 'image_url',
        image_url: { url: learnerPrepared.imageDataUrl },
      });
    }

    const response = await this.llmService.chat({
      useCase: 'default',
      temperature: 0.1,
      maxTokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userParts },
      ],
    });

    return this.parseAiResult(response.text);
  }

  private parseAiResult(text: string): AssignmentAiGradingResult {
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
      const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : null;
      const passThreshold = getAssignmentPassScoreThreshold();
      const passed = resolvePassFromScore(score);
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
        imageDataUrl: this.buildDataUrl(buffer, mimeType),
        couldRead: true,
      };
    }

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const text = await this.extractPdfText(buffer);
      return { label, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.docx' || mimeType.includes('wordprocessingml')) {
      const text = await this.extractDocxText(buffer);
      return { label, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.doc' || mimeType === 'application/msword') {
      const text = await this.extractDocText(buffer);
      return { label, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.pptx' || mimeType.includes('presentationml')) {
      const text = await this.extractPptxText(buffer);
      return { label, text: this.truncateText(text), couldRead: text.length > 0 };
    }

    if (ext === '.ppt' || mimeType.includes('powerpoint')) {
      return { label, text: '', couldRead: false };
    }

    return { label, text: '', couldRead: false };
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
    const tmp = path.join(os.tmpdir(), `assignment-${Date.now()}-${Math.random().toString(36).slice(2)}.doc`);
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
}

