import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

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

  async isCourseQuizAssessmentRequirementsMet(userId: string, courseId: string): Promise<boolean> {
    const progress = await this.getLearnerProgress(userId, courseId);
    return progress.quizAssessmentCompleted;
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
   * Module-scoped only — course-end quiz/assessment must not satisfy this rule.
   */
  async isPillar2ProgrammeModuleComplete(
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

    if (!hasQuiz || !hasAssignment) {
      return false;
    }

    const quizOk = await this.hasQuizPerfectScore(userId, courseId, moduleId);
    const assignmentOk = await this.isAssessmentScopeCompleted(userId, courseId, assignmentIds);
    return quizOk && assignmentOk;
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
      await this.certificateService.syncCertificateWithCourseCompletion(userId, courseId);
    } catch {
      // Certificate sync is best-effort after quiz/assessment updates.
    }
  }
}
