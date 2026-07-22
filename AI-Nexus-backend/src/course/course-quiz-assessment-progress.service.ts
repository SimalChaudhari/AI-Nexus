import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, In, Repository } from 'typeorm';

import {
  CourseQuestionBankEntity,
  CourseQuestionType,
} from './course-question-bank.entity';
import {
  CourseQuestionBankAttemptEntity,
  CourseQuestionAttemptStatus,
} from './course-question-bank-attempt.entity';
import { CourseQuestionAssignmentSubmissionEntity } from './course-question-assignment-submission.entity';
import { CourseCertificateService } from './course-certificate.service';
import { isSubmissionPassedLocked } from './course-assignment-submission-evaluation.types';

export type QuizAssessmentScopeProgress = {
  moduleId: string | null;
  quizCount: number;
  quizCompleted: boolean;
  assignmentCount: number;
  assignmentCompleted: boolean;
};

export type LearnerQuizAssessmentProgress = {
  scopes: QuizAssessmentScopeProgress[];
  allQuizzesCompleted: boolean;
  allAssignmentsCompleted: boolean;
  quizAssessmentCompleted: boolean;
};

@Injectable()
export class CourseQuizAssessmentProgressService {
  constructor(
    @InjectRepository(CourseQuestionBankEntity)
    private readonly questionRepo: Repository<CourseQuestionBankEntity>,
    @InjectRepository(CourseQuestionBankAttemptEntity)
    private readonly attemptRepo: Repository<CourseQuestionBankAttemptEntity>,
    @InjectRepository(CourseQuestionAssignmentSubmissionEntity)
    private readonly submissionRepo: Repository<CourseQuestionAssignmentSubmissionEntity>,
    @Inject(forwardRef(() => CourseCertificateService))
    private readonly certificateService: CourseCertificateService,
  ) {}

  private scopeKey(moduleId: string | null): string {
    return moduleId || '__course_end__';
  }

  private isPerfectQuizAttempt(attempt: CourseQuestionBankAttemptEntity): boolean {
    if (attempt.status !== CourseQuestionAttemptStatus.Completed) return false;
    if (attempt.isCompleted === true) return true;
    const total = Number(attempt.totalQuestions || 0);
    const correct = Number(attempt.correctAnswers || 0);
    const score = Number(attempt.scorePercent || 0);
    return total > 0 && correct >= total && score >= 100;
  }

  private isPassedSubmission(submission: CourseQuestionAssignmentSubmissionEntity | null | undefined): boolean {
    if (!submission) return false;
    if (submission.isCompleted === true) return true;
    return isSubmissionPassedLocked(submission);
  }

  private groupQuestionsByScope(questions: CourseQuestionBankEntity[]) {
    const scopes = new Map<string, { moduleId: string | null; quizIds: string[]; assignmentIds: string[] }>();
    for (const q of questions) {
      const moduleId = q.moduleId ?? null;
      const key = this.scopeKey(moduleId);
      const row = scopes.get(key) || { moduleId, quizIds: [], assignmentIds: [] };
      if (q.questionType === CourseQuestionType.Assignment) {
        row.assignmentIds.push(q.id);
      } else {
        row.quizIds.push(q.id);
      }
      scopes.set(key, row);
    }
    return [...scopes.values()];
  }

  async hasQuizPerfectScore(
    userId: string,
    courseId: string,
    moduleId: string | null,
  ): Promise<boolean> {
    const totalQuiz = await this.questionRepo
      .createQueryBuilder('q')
      .where('q.courseId = :courseId', { courseId })
      .andWhere(moduleId == null ? 'q.moduleId IS NULL' : 'q.moduleId = :moduleId', { moduleId })
      .andWhere('q.questionType != :assignment', { assignment: CourseQuestionType.Assignment })
      .getCount();

    if (totalQuiz === 0) return true;

    const passedAttempt = await this.attemptRepo.findOne({
      where: {
        userId,
        courseId,
        moduleId: moduleId == null ? IsNull() : moduleId,
        status: CourseQuestionAttemptStatus.Completed,
        isCompleted: true,
      },
      order: { completedAt: 'DESC', createdAt: 'DESC' },
    });
    if (passedAttempt) return true;

    const attempts = await this.attemptRepo.find({
      where: {
        userId,
        courseId,
        moduleId: moduleId == null ? IsNull() : moduleId,
        status: CourseQuestionAttemptStatus.Completed,
      },
      order: { completedAt: 'DESC', createdAt: 'DESC' },
    });
    return attempts.some((attempt) => this.isPerfectQuizAttempt(attempt));
  }

  async assertQuizPerfectScoreForAssignment(
    userId: string,
    courseId: string,
    question: CourseQuestionBankEntity,
  ): Promise<void> {
    const moduleId = question.moduleId ?? null;
    const passed = await this.hasQuizPerfectScore(userId, courseId, moduleId);
    if (!passed) {
      throw new BadRequestException(
        'Score 100% on the quiz before starting this assessment.',
      );
    }
  }

  async isAssessmentScopeCompleted(
    userId: string,
    courseId: string,
    assignmentQuestionIds: string[],
  ): Promise<boolean> {
    if (!assignmentQuestionIds.length) return true;
    const submissions = await this.submissionRepo.find({
      where: assignmentQuestionIds.map((questionId) => ({ userId, questionId })),
    });
    const byQuestionId = new Map(submissions.map((s) => [s.questionId, s]));
    return assignmentQuestionIds.every((questionId) =>
      this.isPassedSubmission(byQuestionId.get(questionId)),
    );
  }

  async getLearnerProgress(userId: string, courseId: string): Promise<LearnerQuizAssessmentProgress> {
    const questions = await this.questionRepo.find({
      where: { courseId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const grouped = this.groupQuestionsByScope(questions);
    const scopes: QuizAssessmentScopeProgress[] = [];

    for (const group of grouped) {
      const quizCompleted = await this.hasQuizPerfectScore(userId, courseId, group.moduleId);
      const assignmentCompleted = await this.isAssessmentScopeCompleted(
        userId,
        courseId,
        group.assignmentIds,
      );
      scopes.push({
        moduleId: group.moduleId,
        quizCount: group.quizIds.length,
        quizCompleted,
        assignmentCount: group.assignmentIds.length,
        assignmentCompleted,
      });
    }

    const quizScopes = scopes.filter((s) => s.quizCount > 0);
    const assignmentScopes = scopes.filter((s) => s.assignmentCount > 0);
    const allQuizzesCompleted =
      quizScopes.length === 0 || quizScopes.every((s) => s.quizCompleted);
    const allAssignmentsCompleted =
      assignmentScopes.length === 0 || assignmentScopes.every((s) => s.assignmentCompleted);

    return {
      scopes,
      allQuizzesCompleted,
      allAssignmentsCompleted,
      quizAssessmentCompleted: allQuizzesCompleted && allAssignmentsCompleted,
    };
  }

  /**
   * Batch quiz/assessment progress for many learners × courses.
   * Key format: `${userId}:${courseId}`
   */
  async getLearnerProgressBatch(
    userIds: string[],
    courseIds: string[],
  ): Promise<Map<string, LearnerQuizAssessmentProgress>> {
    const result = new Map<string, LearnerQuizAssessmentProgress>();
    const empty = (): LearnerQuizAssessmentProgress => ({
      scopes: [],
      allQuizzesCompleted: true,
      allAssignmentsCompleted: true,
      quizAssessmentCompleted: true,
    });

    if (!userIds.length || !courseIds.length) return result;

    const uniqueCourseIds = [...new Set(courseIds.filter(Boolean))];
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (!uniqueCourseIds.length || !uniqueUserIds.length) return result;

    const questions = await this.questionRepo.find({
      where: { courseId: In(uniqueCourseIds) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const questionsByCourse = new Map<string, CourseQuestionBankEntity[]>();
    for (const q of questions) {
      const list = questionsByCourse.get(q.courseId) || [];
      list.push(q);
      questionsByCourse.set(q.courseId, list);
    }

    const attempts = await this.attemptRepo.find({
      where: {
        userId: In(uniqueUserIds),
        courseId: In(uniqueCourseIds),
        status: CourseQuestionAttemptStatus.Completed,
      },
      order: { completedAt: 'DESC', createdAt: 'DESC' },
    });
    const attemptsByUserCourseModule = new Map<string, CourseQuestionBankAttemptEntity[]>();
    for (const attempt of attempts) {
      const moduleKey = attempt.moduleId ?? '__course_end__';
      const key = `${attempt.userId}:${attempt.courseId}:${moduleKey}`;
      const list = attemptsByUserCourseModule.get(key) || [];
      list.push(attempt);
      attemptsByUserCourseModule.set(key, list);
    }

    const allAssignmentIds = questions
      .filter((q) => q.questionType === CourseQuestionType.Assignment)
      .map((q) => q.id);
    const submissions =
      allAssignmentIds.length > 0
        ? await this.submissionRepo
            .createQueryBuilder('s')
            .where('s.userId IN (:...userIds)', { userIds: uniqueUserIds })
            .andWhere('s.questionId IN (:...questionIds)', { questionIds: allAssignmentIds })
            .getMany()
        : [];
    const submissionByUserQuestion = new Map<string, CourseQuestionAssignmentSubmissionEntity>();
    for (const submission of submissions) {
      submissionByUserQuestion.set(`${submission.userId}:${submission.questionId}`, submission);
    }

    for (const userId of uniqueUserIds) {
      for (const courseId of uniqueCourseIds) {
        const courseQuestions = questionsByCourse.get(courseId) || [];
        const grouped = this.groupQuestionsByScope(courseQuestions);
        const scopes: QuizAssessmentScopeProgress[] = [];

        for (const group of grouped) {
          const moduleKey = group.moduleId ?? '__course_end__';
          const attemptKey = `${userId}:${courseId}:${moduleKey}`;
          const scopeAttempts = attemptsByUserCourseModule.get(attemptKey) || [];
          const quizCompleted =
            group.quizIds.length === 0 ||
            scopeAttempts.some(
              (attempt) => attempt.isCompleted === true || this.isPerfectQuizAttempt(attempt),
            );

          const assignmentCompleted =
            group.assignmentIds.length === 0 ||
            group.assignmentIds.every((questionId) =>
              this.isPassedSubmission(submissionByUserQuestion.get(`${userId}:${questionId}`)),
            );

          scopes.push({
            moduleId: group.moduleId,
            quizCount: group.quizIds.length,
            quizCompleted,
            assignmentCount: group.assignmentIds.length,
            assignmentCompleted,
          });
        }

        const quizScopes = scopes.filter((s) => s.quizCount > 0);
        const assignmentScopes = scopes.filter((s) => s.assignmentCount > 0);
        const allQuizzesCompleted =
          quizScopes.length === 0 || quizScopes.every((s) => s.quizCompleted);
        const allAssignmentsCompleted =
          assignmentScopes.length === 0 || assignmentScopes.every((s) => s.assignmentCompleted);

        result.set(`${userId}:${courseId}`, {
          scopes,
          allQuizzesCompleted,
          allAssignmentsCompleted,
          quizAssessmentCompleted: allQuizzesCompleted && allAssignmentsCompleted,
        });
      }
    }

    // Ensure callers always find a key
    for (const userId of uniqueUserIds) {
      for (const courseId of uniqueCourseIds) {
        const key = `${userId}:${courseId}`;
        if (!result.has(key)) result.set(key, empty());
      }
    }

    return result;
  }

  /**
   * Match learner progress UI (`buildCourseOverallProgress`):
   * - Beginner/Advanced: only course-end quiz (+ beginner course-end assessment)
   * - Intermediate: every module scope, plus course-end assessment when present
   * Orphan module-scoped questions on beginner must not block certificates when the UI already shows 100%.
   */
  async isCourseQuizAssessmentRequirementsMet(
    userId: string,
    courseId: string,
    courseLevel?: string | null,
  ): Promise<boolean> {
    const progress = await this.getLearnerProgress(userId, courseId);
    const level = String(courseLevel || '').trim().toLowerCase();
    if (!level) {
      return progress.quizAssessmentCompleted;
    }

    const isCourseEndModel = level === 'beginner' || level === 'advanced';
    const courseEndAssignmentAllowed = level === 'beginner' || level === 'intermediate';
    const endScope = progress.scopes.find((scope) => scope.moduleId == null);

    if (isCourseEndModel) {
      const quizOk = !endScope || endScope.quizCount === 0 || endScope.quizCompleted;
      const assignmentOk =
        !courseEndAssignmentAllowed ||
        !endScope ||
        endScope.assignmentCount === 0 ||
        endScope.assignmentCompleted;
      return quizOk && assignmentOk;
    }

    const moduleScopes = progress.scopes.filter((scope) => scope.moduleId);
    const modulesOk =
      moduleScopes.length === 0 ||
      moduleScopes.every((scope) => {
        const quizOk = scope.quizCount === 0 || scope.quizCompleted;
        const assignmentOk = scope.assignmentCount === 0 || scope.assignmentCompleted;
        return quizOk && assignmentOk;
      });
    const courseEndAssignmentOk =
      !courseEndAssignmentAllowed ||
      !endScope ||
      endScope.assignmentCount === 0 ||
      endScope.assignmentCompleted;
    const courseEndQuizOk =
      !endScope || endScope.quizCount === 0 || endScope.quizCompleted;
    return modulesOk && courseEndAssignmentOk && courseEndQuizOk;
  }

  /** Pillar 2 programme rule: one module with its quiz + assessment passed (when they exist). */
  async isModuleQuizAndAssessmentComplete(
    userId: string,
    courseId: string,
    moduleId: string,
  ): Promise<boolean> {
    const questions = await this.questionRepo.find({
      where: { courseId, moduleId },
    });
    const assignmentIds = questions
      .filter((q) => q.questionType === CourseQuestionType.Assignment)
      .map((q) => q.id);
    const quizCount = questions.length - assignmentIds.length;
    const hasQuiz = quizCount > 0;
    const hasAssignment = assignmentIds.length > 0;

    if (!hasQuiz && !hasAssignment) {
      return false;
    }

    const quizOk = !hasQuiz || (await this.hasQuizPerfectScore(userId, courseId, moduleId));
    const assignmentOk =
      !hasAssignment || (await this.isAssessmentScopeCompleted(userId, courseId, assignmentIds));
    return quizOk && assignmentOk;
  }

  /**
   * Pillar 2 programme badge: qualifying module must include quiz and assessment, both passed.
   * Uses the same learner-progress scopes as the course player outline (quizCompleted / assignmentCompleted).
   * Module-scoped only — course-end quiz/assessment must not satisfy this rule.
   */
  async isPillar2ProgrammeModuleComplete(
    userId: string,
    courseId: string,
    moduleId: string,
  ): Promise<boolean> {
    const progress = await this.getLearnerProgress(userId, courseId);
    const scope = progress.scopes.find((row) => row.moduleId === moduleId);
    if (!scope || scope.quizCount <= 0 || scope.assignmentCount <= 0) {
      return false;
    }
    return Boolean(scope.quizCompleted && scope.assignmentCompleted);
  }

  /**
   * True when quiz/assessment that existed on or before certificate issue is still incomplete.
   * Used to hide wrongly issued badges while grandfathering admin-added content after issue.
   */
  async hasIncompleteQuizAssessmentBefore(
    userId: string,
    courseId: string,
    issuedAt: Date,
  ): Promise<boolean> {
    const issuedTime = issuedAt instanceof Date ? issuedAt.getTime() : new Date(issuedAt).getTime();
    if (!Number.isFinite(issuedTime)) return true;

    const questions = await this.questionRepo.find({
      where: { courseId },
      select: ['id', 'moduleId', 'questionType', 'createdAt'],
    });
    if (!questions.length) return false;

    const progress = await this.getLearnerProgress(userId, courseId);

    for (const scope of progress.scopes) {
      const scopeQuestions = questions.filter((q) =>
        scope.moduleId == null ? q.moduleId == null : q.moduleId === scope.moduleId,
      );
      const preIssueQuizzes = scopeQuestions.filter(
        (q) =>
          q.questionType !== CourseQuestionType.Assignment &&
          this.isCreatedOnOrBefore(q.createdAt, issuedAt),
      );
      const preIssueAssignments = scopeQuestions.filter(
        (q) =>
          q.questionType === CourseQuestionType.Assignment &&
          this.isCreatedOnOrBefore(q.createdAt, issuedAt),
      );

      if (preIssueQuizzes.length > 0 && !scope.quizCompleted) {
        return true;
      }
      if (preIssueAssignments.length > 0) {
        const completed = await this.isAssessmentScopeCompleted(
          userId,
          courseId,
          preIssueAssignments.map((q) => q.id),
        );
        if (!completed) return true;
      }
    }
    return false;
  }

  private isCreatedOnOrBefore(createdAt: Date, issuedAt: Date): boolean {
    const createdTime =
      createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
    const issuedTime = issuedAt instanceof Date ? issuedAt.getTime() : new Date(issuedAt).getTime();
    return Number.isFinite(createdTime) && Number.isFinite(issuedTime) && createdTime <= issuedTime;
  }

  markQuizAttemptCompleted(attempt: CourseQuestionBankAttemptEntity): void {
    const total = Number(attempt.totalQuestions || 0);
    const correct = Number(attempt.correctAnswers || 0);
    const score = Number(attempt.scorePercent || 0);
    attempt.isCompleted = total > 0 && correct >= total && score >= 100;
  }

  markSubmissionCompleted(
    submission: CourseQuestionAssignmentSubmissionEntity,
    passed: boolean | null,
  ): void {
    submission.isCompleted = passed === true;
  }

  async notifyLearnerProgressUpdate(userId: string, courseId: string): Promise<void> {
    if (!userId || !courseId) return;
    try {
      await this.certificateService.issueIfCourseCompleted(userId, courseId);
    } catch (error) {
      // Certificate sync is best-effort after quiz/assessment updates.
      console.error(
        `[certificate-sync] failed for user=${userId} course=${courseId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  async revokeCredentialAfterAssessmentFail(userId: string, courseId: string): Promise<void> {
    if (!userId || !courseId) return;
    try {
      await this.certificateService.revokeCredentialAfterAssessmentFail(userId, courseId);
    } catch (error) {
      console.error(
        `[certificate-revoke] failed for user=${userId} course=${courseId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  async restoreCredentialAfterAssessmentPass(
    userId: string,
    courseId: string,
    options?: { force?: boolean },
  ): Promise<void> {
    if (!userId || !courseId) return;
    try {
      await this.certificateService.restoreCredentialAfterAssessmentPass(userId, courseId, options);
    } catch (error) {
      console.error(
        `[certificate-restore] failed for user=${userId} course=${courseId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}
