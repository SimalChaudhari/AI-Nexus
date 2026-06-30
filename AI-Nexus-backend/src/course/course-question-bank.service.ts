import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CourseQuestionBankEntity,
  CourseQuestionType,
} from './course-question-bank.entity';
import {
  CreateCourseQuestionBankDto,
  UpdateCourseQuestionBankDto,
} from './course-question-bank.dto';
import { CourseService } from './courses.service';
import { CourseEnrollmentService } from './course-enrollment.service';
import { CourseModuleEntity } from './course-module.entity';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from './courses.entity';
import {
  CourseQuestionBankAttemptEntity,
  CourseQuestionAttemptStatus,
} from './course-question-bank-attempt.entity';
import { CourseQuestionAssignmentSubmissionEntity } from './course-question-assignment-submission.entity';
import { UserRole } from '../user/users.entity';

function normalizeTrueFalse(value: string): 'true' | 'false' {
  const v = String(value).trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return 'true';
  if (v === 'false' || v === '0' || v === 'no') return 'false';
  throw new BadRequestException('correctAnswer must be true or false for true_false questions');
}

export type CourseQuestionBankPublic = Omit<
  CourseQuestionBankEntity,
  'correctIndex' | 'correctAnswer' | 'explanation'
>;
export type CourseQuestionAttemptAdminReportRow = {
  attemptId: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  moduleId: string | null;
  moduleTitle: string | null;
  attemptNumber: number;
  status: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
export type CourseQuestionAttemptAdminUserOption = {
  userId: string;
  userName: string;
  userEmail: string;
  attempts: number;
};
export type CourseQuestionAttemptAdminReportResponse = {
  items: CourseQuestionAttemptAdminReportRow[];
  users: CourseQuestionAttemptAdminUserOption[];
  total: number;
  page: number;
  limit: number;
};
export type CourseQuestionAssignmentSubmissionRow = {
  id: string;
  questionId: string;
  courseId: string;
  userId: string;
  userName: string;
  userEmail: string;
  questionPrompt: string;
  moduleId: string | null;
  moduleTitle: string | null;
  fileUrl: string;
  originalFileName: string;
  uploadedAt: Date;
};
export type CourseAssignmentSummaryRow = {
  courseId: string;
  totalAssignments: number;
  submittedCount: number;
  pendingCount: number;
};

@Injectable()
export class CourseQuestionBankService {
  constructor(
    @InjectRepository(CourseQuestionBankEntity)
    private readonly repo: Repository<CourseQuestionBankEntity>,
    @InjectRepository(CourseQuestionBankAttemptEntity)
    private readonly attemptRepo: Repository<CourseQuestionBankAttemptEntity>,
    @InjectRepository(CourseQuestionAssignmentSubmissionEntity)
    private readonly assignmentSubmissionRepo: Repository<CourseQuestionAssignmentSubmissionEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly moduleRepo: Repository<CourseModuleEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepo: Repository<CourseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly courseService: CourseService,
    private readonly courseEnrollmentService: CourseEnrollmentService,
  ) {}

  private async assertModuleBelongsToCourse(
    moduleId: string,
    courseId: string,
  ): Promise<void> {
    const mod = await this.moduleRepo.findOne({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Course module not found');
    if (mod.courseId !== courseId) {
      throw new BadRequestException('Module does not belong to this course');
    }
  }

  private normalizeAssignedUserIds(value?: string[] | null): string[] | null {
    if (!Array.isArray(value)) return null;
    const ids = [...new Set(value.map((id) => String(id).trim()).filter(Boolean))];
    return ids.length ? ids : null;
  }

  isAssignmentVisibleToUser(
    row: Pick<CourseQuestionBankEntity, 'questionType' | 'assignedUserIds'>,
    userId?: string | null,
  ): boolean {
    if (row.questionType !== CourseQuestionType.Assignment) return true;
    const assigned = this.normalizeAssignedUserIds(row.assignedUserIds);
    if (!assigned?.length) return true;
    if (!userId) return false;
    return assigned.includes(userId);
  }

  private validatePayload(
    questionType: CourseQuestionType,
    options?: string[] | null,
    correctIndex?: number | null,
    correctAnswer?: string | null,
  ): void {
    if (questionType === CourseQuestionType.Mcq) {
      const opts = Array.isArray(options) ? options : [];
      if (opts.length < 2) {
        throw new BadRequestException('MCQ requires at least two options');
      }
      if (correctIndex == null || correctIndex < 0 || correctIndex >= opts.length) {
        throw new BadRequestException('MCQ requires correctIndex within options range');
      }
      return;
    }
    if (questionType === CourseQuestionType.TrueFalse) {
      if (correctAnswer == null || correctAnswer === '') {
        throw new BadRequestException('true_false requires correctAnswer');
      }
      normalizeTrueFalse(correctAnswer);
      return;
    }
    if (questionType === CourseQuestionType.ShortText) {
      if (correctAnswer == null || !String(correctAnswer).trim()) {
        throw new BadRequestException('short_text requires correctAnswer');
      }
      return;
    }
    if (questionType === CourseQuestionType.Assignment) {
      return;
    }
  }

  toPublicRow(row: CourseQuestionBankEntity): CourseQuestionBankPublic {
    const {
      correctIndex: _c,
      correctAnswer: _a,
      explanation: _e,
      assignedUserIds: _u,
      ...rest
    } = row;
    return rest;
  }

  async findByCourseId(
    courseId: string,
    includeAnswers: boolean,
    userId?: string | null,
  ): Promise<CourseQuestionBankEntity[] | CourseQuestionBankPublic[]> {
    await this.courseService.getById(courseId);
    const rows = await this.repo.find({
      where: { courseId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    let visibleRows = rows;
    if (!includeAnswers && userId) {
      visibleRows = rows.filter((r) => this.isAssignmentVisibleToUser(r, userId));
    } else if (!includeAnswers && !userId) {
      visibleRows = rows.filter(
        (r) => r.questionType !== CourseQuestionType.Assignment || !this.normalizeAssignedUserIds(r.assignedUserIds)?.length,
      );
    }

    const submissionByQuestionId = new Map<string, CourseQuestionAssignmentSubmissionEntity>();
    if (userId) {
      const assignmentIds = visibleRows
        .filter((r) => r.questionType === CourseQuestionType.Assignment)
        .map((r) => r.id);
      if (assignmentIds.length) {
        const submissions = await this.assignmentSubmissionRepo.find({
          where: { userId, questionId: In(assignmentIds) },
        });
        submissions.forEach((s) => submissionByQuestionId.set(s.questionId, s));
      }
    }

    if (includeAnswers) return visibleRows;

    return visibleRows.map((r) => {
      const publicRow = this.toPublicRow(r) as CourseQuestionBankPublic & {
        mySubmission?: {
          id: string;
          fileUrl: string;
          originalFileName: string;
          uploadedAt: Date;
        } | null;
      };
      if (r.questionType === CourseQuestionType.Assignment) {
        const sub = submissionByQuestionId.get(r.id);
        publicRow.mySubmission = sub
          ? {
              id: sub.id,
              fileUrl: sub.fileUrl,
              originalFileName: sub.originalFileName,
              uploadedAt: sub.uploadedAt,
            }
          : null;
      }
      return publicRow;
    });
  }

  async create(
    courseId: string,
    dto: CreateCourseQuestionBankDto,
  ): Promise<CourseQuestionBankEntity> {
    await this.courseService.getById(courseId);
    if (dto.moduleId) {
      await this.assertModuleBelongsToCourse(dto.moduleId, courseId);
    }

    const questionType = dto.questionType ?? CourseQuestionType.Mcq;
    let options: string[] | null =
      questionType === CourseQuestionType.Mcq ? dto.options ?? [] : null;
    let correctIndex: number | null =
      questionType === CourseQuestionType.Mcq ? dto.correctIndex ?? null : null;
    let correctAnswer: string | null = null;

    if (questionType === CourseQuestionType.TrueFalse) {
      correctAnswer = normalizeTrueFalse(dto.correctAnswer!);
    } else if (questionType === CourseQuestionType.ShortText) {
      correctAnswer = String(dto.correctAnswer).trim();
    }

    this.validatePayload(questionType, options, correctIndex, correctAnswer);

    const maxOrder = await this.repo
      .createQueryBuilder('q')
      .select('MAX(q.sortOrder)', 'max')
      .where('q.courseId = :courseId', { courseId })
      .getRawOne();
    const nextOrder = maxOrder?.max != null ? Number(maxOrder.max) + 1 : 0;
    const sortOrder = dto.sortOrder ?? nextOrder;

    const entity = this.repo.create({
      courseId,
      moduleId: dto.moduleId ?? null,
      prompt: dto.prompt,
      questionType,
      options,
      correctIndex,
      correctAnswer,
      explanation: dto.explanation ?? null,
      assignedUserIds:
        questionType === CourseQuestionType.Assignment
          ? this.normalizeAssignedUserIds(dto.assignedUserIds)
          : null,
      referenceFileUrl: questionType === CourseQuestionType.Assignment ? (dto as any).referenceFileUrl ?? null : null,
      referenceFileName: questionType === CourseQuestionType.Assignment ? (dto as any).referenceFileName ?? null : null,
      sortOrder,
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    dto: UpdateCourseQuestionBankDto,
  ): Promise<CourseQuestionBankEntity> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Question not found');

    if (dto.moduleId !== undefined) {
      if (dto.moduleId === null) {
        row.moduleId = null;
      } else {
        await this.assertModuleBelongsToCourse(dto.moduleId, row.courseId);
        row.moduleId = dto.moduleId;
      }
    }

    const nextType = (dto.questionType ?? row.questionType) as CourseQuestionType;
    let options = dto.options !== undefined ? dto.options : row.options;
    let correctIndex =
      dto.correctIndex !== undefined ? dto.correctIndex : row.correctIndex;
    let correctAnswer =
      dto.correctAnswer !== undefined ? dto.correctAnswer : row.correctAnswer;

    if (dto.questionType !== undefined && dto.questionType !== CourseQuestionType.Mcq) {
      if (dto.options === undefined) options = null;
      if (dto.correctIndex === undefined) correctIndex = null;
    }
    if (
      dto.questionType !== undefined &&
      dto.questionType !== CourseQuestionType.TrueFalse &&
      dto.questionType !== CourseQuestionType.ShortText
    ) {
      if (dto.correctAnswer === undefined && nextType !== CourseQuestionType.Mcq) {
        correctAnswer = null;
      }
    }
    if (dto.questionType === CourseQuestionType.Mcq && dto.options !== undefined) {
      options = dto.options;
    }

    if (nextType === CourseQuestionType.TrueFalse && dto.correctAnswer !== undefined) {
      correctAnswer = normalizeTrueFalse(dto.correctAnswer);
    } else if (nextType === CourseQuestionType.ShortText && dto.correctAnswer !== undefined) {
      correctAnswer = String(dto.correctAnswer).trim();
    }

    if (dto.prompt !== undefined) row.prompt = dto.prompt;
    if (dto.questionType !== undefined) row.questionType = dto.questionType;
    if (dto.explanation !== undefined) row.explanation = dto.explanation ?? null;
    if (dto.referenceFileUrl !== undefined) row.referenceFileUrl = dto.referenceFileUrl ?? null;
    if (dto.referenceFileName !== undefined) row.referenceFileName = dto.referenceFileName ?? null;
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    if (dto.assignedUserIds !== undefined) {
      row.assignedUserIds =
        nextType === CourseQuestionType.Assignment
          ? this.normalizeAssignedUserIds(dto.assignedUserIds)
          : null;
    } else if (nextType !== CourseQuestionType.Assignment) {
      row.assignedUserIds = null;
    }

    row.options = nextType === CourseQuestionType.Mcq ? options ?? [] : null;
    row.correctIndex = nextType === CourseQuestionType.Mcq ? correctIndex ?? null : null;
    row.correctAnswer =
      nextType === CourseQuestionType.Mcq || nextType === CourseQuestionType.Assignment
        ? null
        : nextType === CourseQuestionType.TrueFalse && correctAnswer != null
          ? normalizeTrueFalse(correctAnswer)
          : correctAnswer;

    this.validatePayload(
      nextType,
      row.options,
      row.correctIndex,
      row.correctAnswer,
    );

    return this.repo.save(row);
  }

  async delete(id: string): Promise<{ message: string }> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Question not found');
    await this.repo.remove(row);
    return { message: 'Question deleted successfully' };
  }

  async checkAnswer(
    courseId: string,
    questionId: string,
    payload: { selectedIndex?: number; answer?: string },
  ): Promise<{ correct: boolean; explanation: string | null }> {
    await this.courseService.getById(courseId);
    const row = await this.repo.findOne({ where: { id: questionId, courseId } });
    if (!row) throw new NotFoundException('Question not found');

    const correct = this.evaluateQuestionAnswer(row, payload);

    return {
      correct,
      explanation: row.explanation ?? null,
    };
  }

  private evaluateQuestionAnswer(
    row: CourseQuestionBankEntity,
    payload: { selectedIndex?: number; answer?: string },
  ): boolean {
    const type = row.questionType as CourseQuestionType;
    if (type === CourseQuestionType.Assignment) {
      throw new BadRequestException('Assignment questions cannot be auto-checked');
    }
    if (type === CourseQuestionType.Mcq) {
      if (payload.selectedIndex == null || Number.isNaN(Number(payload.selectedIndex))) {
        throw new BadRequestException('selectedIndex is required for MCQ');
      }
      return Number(payload.selectedIndex) === Number(row.correctIndex);
    }
    if (type === CourseQuestionType.TrueFalse) {
      if (payload.answer == null || payload.answer === '') {
        throw new BadRequestException('answer is required');
      }
      return normalizeTrueFalse(payload.answer) === row.correctAnswer;
    }
    if (payload.answer == null || payload.answer === '') {
      throw new BadRequestException('answer is required');
    }
    const a = String(payload.answer).trim().toLowerCase();
    const b = String(row.correctAnswer || '').trim().toLowerCase();
    return a === b;
  }

  async startAttempt(
    userId: string,
    courseId: string,
    moduleId?: string,
  ): Promise<CourseQuestionBankAttemptEntity> {
    await this.courseService.getById(courseId);
    if (moduleId) {
      await this.assertModuleBelongsToCourse(moduleId, courseId);
    }
    const nextRaw = await this.attemptRepo
      .createQueryBuilder('a')
      .select('MAX(a.attemptNumber)', 'max')
      .where('a.userId = :userId', { userId })
      .andWhere('a.courseId = :courseId', { courseId })
      .andWhere(moduleId ? 'a.moduleId = :moduleId' : 'a.moduleId IS NULL', { moduleId })
      .getRawOne();
    const nextAttemptNumber = Number(nextRaw?.max ?? 0) + 1;
    const now = new Date();
    const row = this.attemptRepo.create({
      userId,
      courseId,
      moduleId: moduleId ?? null,
      attemptNumber: nextAttemptNumber,
      status: CourseQuestionAttemptStatus.Started,
      startedAt: now,
      completedAt: null,
      totalQuestions: 0,
      answeredQuestions: 0,
      correctAnswers: 0,
      scorePercent: 0,
      answers: [],
    });
    return this.attemptRepo.save(row);
  }

  async completeAttempt(
    userId: string,
    courseId: string,
    attemptId: string,
    answers: { questionId: string; selectedIndex?: number; answer?: string }[],
  ): Promise<CourseQuestionBankAttemptEntity> {
    await this.courseService.getById(courseId);
    const attempt = await this.attemptRepo.findOne({
      where: {
        id: attemptId,
        userId,
        courseId,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    const where = attempt.moduleId
      ? { courseId, moduleId: attempt.moduleId }
      : { courseId };
    const bank = await this.repo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const scorableBank = bank.filter((q) => q.questionType !== CourseQuestionType.Assignment);
    const byId = new Map(scorableBank.map((q) => [q.id, q]));
    const answerRows: Record<string, unknown>[] = [];
    let correctAnswers = 0;
    for (const item of answers || []) {
      const q = byId.get(item.questionId);
      if (!q) continue;
      const correct = this.evaluateQuestionAnswer(q, item);
      if (correct) correctAnswers += 1;
      answerRows.push({
        questionId: q.id,
        questionType: q.questionType,
        prompt: q.prompt,
        selectedIndex: item.selectedIndex ?? null,
        answer: item.answer ?? null,
        correct,
        explanation: q.explanation ?? null,
      });
    }
    const answeredQuestions = answerRows.length;
    const totalQuestions = scorableBank.length;
    const scorePercent = totalQuestions > 0 ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2)) : 0;
    attempt.status = CourseQuestionAttemptStatus.Completed;
    attempt.completedAt = new Date();
    attempt.totalQuestions = totalQuestions;
    attempt.answeredQuestions = answeredQuestions;
    attempt.correctAnswers = correctAnswers;
    attempt.scorePercent = scorePercent;
    attempt.answers = answerRows;
    return this.attemptRepo.save(attempt);
  }

  async listAttemptsForAdmin(
    opts?: { courseId?: string; page?: number; limit?: number; userId?: string },
  ): Promise<CourseQuestionAttemptAdminReportResponse> {
    if (opts?.courseId) {
      await this.courseService.getById(opts.courseId);
    }
    const page = Math.max(1, Number(opts?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(opts?.limit || 10)));
    const attempts = await this.attemptRepo.find({
      where: opts?.courseId ? { courseId: opts.courseId } : {},
      order: { createdAt: 'DESC' },
    });
    if (attempts.length === 0) {
      return { items: [], users: [], total: 0, page, limit };
    }
    const userIds = [...new Set(attempts.map((a) => a.userId).filter(Boolean))];
    const moduleIds = [...new Set(attempts.map((a) => a.moduleId).filter(Boolean))] as string[];
    const users = userIds.length
      ? await this.userRepo.find({
          where: userIds.map((id) => ({ id })),
          select: ['id', 'firstname', 'lastname', 'email', 'username'],
        })
      : [];
    const courseIds = [...new Set(attempts.map((a) => a.courseId).filter(Boolean))];
    const courses = courseIds.length
      ? await this.courseRepo.find({
          where: courseIds.map((id) => ({ id })),
          select: ['id', 'title'],
        })
      : [];
    const modules = moduleIds.length
      ? await this.moduleRepo.find({
          where: moduleIds.map((id) => ({ id })),
          select: ['id', 'title'],
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const moduleById = new Map(modules.map((m) => [m.id, m]));
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const toRow = (a: CourseQuestionBankAttemptEntity): CourseQuestionAttemptAdminReportRow => {
      const u = userById.get(a.userId);
      const m = a.moduleId ? moduleById.get(a.moduleId) : null;
      const c = courseById.get(a.courseId);
      const first = String(u?.firstname || '').trim();
      const last = String(u?.lastname || '').trim();
      const full = `${first} ${last}`.trim();
      return {
        attemptId: a.id,
        courseId: a.courseId,
        courseTitle: c?.title || a.courseId,
        userId: a.userId,
        userName: full || u?.username || 'Unknown user',
        userEmail: u?.email || '',
        moduleId: a.moduleId ?? null,
        moduleTitle: m?.title || null,
        attemptNumber: Number(a.attemptNumber || 0),
        status: a.status,
        totalQuestions: Number(a.totalQuestions || 0),
        answeredQuestions: Number(a.answeredQuestions || 0),
        correctAnswers: Number(a.correctAnswers || 0),
        scorePercent: Number(a.scorePercent || 0),
        startedAt: a.startedAt ?? null,
        completedAt: a.completedAt ?? null,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    };
    const usersOptions: CourseQuestionAttemptAdminUserOption[] = userIds.map((id) => {
      const u = userById.get(id);
      const first = String(u?.firstname || '').trim();
      const last = String(u?.lastname || '').trim();
      const full = `${first} ${last}`.trim();
      return {
        userId: id,
        userName: full || u?.username || 'Unknown user',
        userEmail: u?.email || '',
        attempts: attempts.filter((a) => a.userId === id).length,
      };
    });
    let source: CourseQuestionBankAttemptEntity[] = [];
    if (opts?.userId) {
      source = attempts.filter((a) => a.userId === opts.userId);
    } else {
      // Default list: latest completed attempt for top learners.
      const completed = attempts.filter((a) => a.status === CourseQuestionAttemptStatus.Completed);
      completed.sort(
        (a, b) =>
          new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime(),
      );
      const seen = new Set<string>();
      source = [];
      completed.forEach((a) => {
        if (seen.has(a.userId)) return;
        seen.add(a.userId);
        source.push(a);
      });
    }
    const total = source.length;
    const start = (page - 1) * limit;
    const items = source.slice(start, start + limit).map(toRow);
    return {
      items,
      users: usersOptions.sort((a, b) => a.userName.localeCompare(b.userName)),
      total,
      page,
      limit,
    };
  }

  async deleteAttemptById(attemptId: string): Promise<{ message: string }> {
    const row = await this.attemptRepo.findOne({ where: { id: attemptId } });
    if (!row) throw new NotFoundException('Attempt not found');
    await this.attemptRepo.remove(row);
    return { message: 'Attempt deleted successfully' };
  }

  async deleteAttemptsBulk(opts?: {
    courseId?: string;
    userId?: string;
  }): Promise<{ message: string; deletedCount: number }> {
    const qb = this.attemptRepo.createQueryBuilder().delete().from(CourseQuestionBankAttemptEntity);
    if (opts?.courseId) {
      qb.andWhere('"courseId" = :courseId', { courseId: opts.courseId });
    }
    if (opts?.userId) {
      qb.andWhere('"userId" = :userId', { userId: opts.userId });
    }
    const result = await qb.execute();
    const deletedCount = Number(result.affected || 0);
    return {
      message: deletedCount > 0 ? 'Attempts deleted successfully' : 'No attempts matched filters',
      deletedCount,
    };
  }

  async uploadAssignmentSubmission(
    userId: string,
    courseId: string,
    questionId: string,
    file: Express.Multer.File,
    saveFile: (file: Express.Multer.File, folder: string) => Promise<string>,
  ): Promise<CourseQuestionAssignmentSubmissionEntity> {
    await this.courseService.getById(courseId);
    const question = await this.repo.findOne({ where: { id: questionId, courseId } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.questionType !== CourseQuestionType.Assignment) {
      throw new BadRequestException('This question is not an assignment');
    }
    if (!this.isAssignmentVisibleToUser(question, userId)) {
      throw new ForbiddenException('This assignment is not assigned to you');
    }
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileUrl = await saveFile(file, 'course-assignment-submissions');
    const originalFileName = String(file.originalname || 'submission').trim();

    const existing = await this.assignmentSubmissionRepo.findOne({
      where: { questionId, userId },
    });
    if (existing) {
      existing.fileUrl = fileUrl;
      existing.originalFileName = originalFileName;
      return this.assignmentSubmissionRepo.save(existing);
    }

    const row = this.assignmentSubmissionRepo.create({
      questionId,
      courseId,
      userId,
      fileUrl,
      originalFileName,
    });
    return this.assignmentSubmissionRepo.save(row);
  }

  async deleteAssignmentSubmission(
    requesterId: string,
    requesterRole: string | undefined,
    courseId: string,
    questionId: string,
    targetUserId?: string,
    deleteFile?: (fileUrl: string) => Promise<void>,
  ): Promise<{ message: string }> {
    await this.courseService.getById(courseId);
    const question = await this.repo.findOne({ where: { id: questionId, courseId } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.questionType !== CourseQuestionType.Assignment) {
      throw new BadRequestException('This question is not an assignment');
    }

    const isAdmin = requesterRole === UserRole.Admin;
    const effectiveUserId = isAdmin && targetUserId ? targetUserId : requesterId;

    if (!isAdmin && targetUserId && targetUserId !== requesterId) {
      throw new ForbiddenException('You can only delete your own submission');
    }
    if (!isAdmin && !this.isAssignmentVisibleToUser(question, requesterId)) {
      throw new ForbiddenException('This assignment is not assigned to you');
    }

    const existing = await this.assignmentSubmissionRepo.findOne({
      where: { questionId, userId: effectiveUserId, courseId },
    });
    if (!existing) throw new NotFoundException('Submission not found');

    const fileUrl = existing.fileUrl;
    await this.assignmentSubmissionRepo.remove(existing);
    if (deleteFile && fileUrl) {
      await deleteFile(fileUrl).catch(() => undefined);
    }

    return { message: 'Assignment submission deleted successfully' };
  }

  async listAssignmentSubmissions(
    requesterId: string,
    requesterRole: string | undefined,
    courseId: string,
    filterUserId?: string,
  ): Promise<CourseQuestionAssignmentSubmissionRow[]> {
    await this.courseService.getById(courseId);
    const isAdmin = requesterRole === UserRole.Admin;
    const effectiveUserId = isAdmin ? filterUserId || undefined : requesterId;

    const where: { courseId: string; userId?: string } = { courseId };
    if (effectiveUserId) {
      where.userId = effectiveUserId;
    } else if (!isAdmin) {
      where.userId = requesterId;
    }

    const submissions = await this.assignmentSubmissionRepo.find({
      where,
      order: { uploadedAt: 'DESC' },
    });
    if (!submissions.length) return [];

    const questionIds = [...new Set(submissions.map((s) => s.questionId))];
    const userIds = [...new Set(submissions.map((s) => s.userId))];
    const questions = await this.repo.find({
      where: questionIds.map((id) => ({ id })),
    });
    const users = await this.userRepo.find({
      where: userIds.map((id) => ({ id })),
      select: ['id', 'firstname', 'lastname', 'email', 'username'],
    });
    const moduleIds = [
      ...new Set(questions.map((q) => q.moduleId).filter(Boolean)),
    ] as string[];
    const modules = moduleIds.length
      ? await this.moduleRepo.find({
          where: moduleIds.map((id) => ({ id })),
          select: ['id', 'title'],
        })
      : [];
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const moduleById = new Map(modules.map((m) => [m.id, m]));

    return submissions.map((s) => {
      const q = questionById.get(s.questionId);
      const u = userById.get(s.userId);
      const first = String(u?.firstname || '').trim();
      const last = String(u?.lastname || '').trim();
      const full = `${first} ${last}`.trim();
      const mod = q?.moduleId ? moduleById.get(q.moduleId) : null;
      return {
        id: s.id,
        questionId: s.questionId,
        courseId: s.courseId,
        userId: s.userId,
        userName: full || u?.username || 'Unknown user',
        userEmail: u?.email || '',
        questionPrompt: q?.prompt || '',
        moduleId: q?.moduleId ?? null,
        moduleTitle: mod?.title ?? null,
        fileUrl: s.fileUrl,
        originalFileName: s.originalFileName,
        uploadedAt: s.uploadedAt,
      };
    });
  }

  async getMyAssignmentSummary(userId: string): Promise<CourseAssignmentSummaryRow[]> {
    const enrolledIds = await this.courseEnrollmentService.getEffectiveEnrolledCourseIdSet(userId);
    if (!enrolledIds.size) return [];

    const courseIds = [...enrolledIds];
    const assignmentQuestions = await this.repo.find({
      where: { courseId: In(courseIds), questionType: CourseQuestionType.Assignment },
    });
    const visibleByCourse = new Map<string, CourseQuestionBankEntity[]>();
    assignmentQuestions.forEach((q) => {
      if (!this.isAssignmentVisibleToUser(q, userId)) return;
      const list = visibleByCourse.get(q.courseId) || [];
      list.push(q);
      visibleByCourse.set(q.courseId, list);
    });

    const visibleQuestionIds = [...visibleByCourse.values()].flat().map((q) => q.id);
    const submissions = visibleQuestionIds.length
      ? await this.assignmentSubmissionRepo.find({
          where: { userId, questionId: In(visibleQuestionIds) },
        })
      : [];
    const submittedQuestionIds = new Set(submissions.map((s) => s.questionId));

    return courseIds
      .map((courseId) => {
        const assignments = visibleByCourse.get(courseId) || [];
        const totalAssignments = assignments.length;
        if (!totalAssignments) return null;
        const submittedCount = assignments.filter((q) => submittedQuestionIds.has(q.id)).length;
        return {
          courseId,
          totalAssignments,
          submittedCount,
          pendingCount: totalAssignments - submittedCount,
        };
      })
      .filter((row): row is CourseAssignmentSummaryRow => Boolean(row));
  }
}
