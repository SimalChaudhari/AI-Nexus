import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CourseQuestionBankEntity,
  CourseQuestionType,
} from './course-question-bank.entity';
import {
  CreateCourseQuestionBankDto,
  UpdateCourseQuestionBankDto,
} from './course-question-bank.dto';
import { CourseService } from './courses.service';
import { CourseModuleEntity } from './course-module.entity';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from './courses.entity';
import {
  CourseQuestionBankAttemptEntity,
  CourseQuestionAttemptStatus,
} from './course-question-bank-attempt.entity';

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

@Injectable()
export class CourseQuestionBankService {
  constructor(
    @InjectRepository(CourseQuestionBankEntity)
    private readonly repo: Repository<CourseQuestionBankEntity>,
    @InjectRepository(CourseQuestionBankAttemptEntity)
    private readonly attemptRepo: Repository<CourseQuestionBankAttemptEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly moduleRepo: Repository<CourseModuleEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepo: Repository<CourseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly courseService: CourseService,
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
    }
  }

  toPublicRow(row: CourseQuestionBankEntity): CourseQuestionBankPublic {
    const { correctIndex: _c, correctAnswer: _a, explanation: _e, ...rest } = row;
    return rest;
  }

  async findByCourseId(
    courseId: string,
    includeAnswers: boolean,
  ): Promise<CourseQuestionBankEntity[] | CourseQuestionBankPublic[]> {
    await this.courseService.getById(courseId);
    const rows = await this.repo.find({
      where: { courseId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (includeAnswers) return rows;
    return rows.map((r) => this.toPublicRow(r));
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
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;

    row.options = nextType === CourseQuestionType.Mcq ? options ?? [] : null;
    row.correctIndex = nextType === CourseQuestionType.Mcq ? correctIndex ?? null : null;
    row.correctAnswer =
      nextType === CourseQuestionType.Mcq
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
    const byId = new Map(bank.map((q) => [q.id, q]));
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
    const totalQuestions = bank.length;
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
}
