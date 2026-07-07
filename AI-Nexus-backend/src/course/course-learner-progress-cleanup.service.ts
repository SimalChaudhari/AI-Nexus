import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CourseSectionWatchProgressEntity } from './course-section-watch-progress.entity';
import { CourseWatchProgressEntity } from './course-watch-progress.entity';
import { CourseQuestionBankEntity } from './course-question-bank.entity';
import { CourseQuestionBankAttemptEntity } from './course-question-bank-attempt.entity';
import { CourseQuestionAssignmentSubmissionEntity } from './course-question-assignment-submission.entity';
import { CourseCertificateEntity } from './course-certificate.entity';
import { CourseEnrollmentEntity } from './course-enrollment.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';
import { CourseCertificateService } from './course-certificate.service';

export { normalizeVideoUrlForCompare, isSectionVideoUrlChanged } from './course-video-url.util';

/**
 * Resets learner progress when admins change course content (module delete, video replace, etc.).
 */
@Injectable()
export class CourseLearnerProgressCleanupService {
  private readonly logger = new Logger(CourseLearnerProgressCleanupService.name);

  constructor(
    @InjectRepository(CourseSectionWatchProgressEntity)
    private readonly sectionProgressRepository: Repository<CourseSectionWatchProgressEntity>,
    @InjectRepository(CourseWatchProgressEntity)
    private readonly courseProgressRepository: Repository<CourseWatchProgressEntity>,
    @InjectRepository(CourseQuestionBankEntity)
    private readonly questionRepository: Repository<CourseQuestionBankEntity>,
    @InjectRepository(CourseQuestionBankAttemptEntity)
    private readonly attemptRepository: Repository<CourseQuestionBankAttemptEntity>,
    @InjectRepository(CourseQuestionAssignmentSubmissionEntity)
    private readonly submissionRepository: Repository<CourseQuestionAssignmentSubmissionEntity>,
    @InjectRepository(CourseCertificateEntity)
    private readonly certificateRepository: Repository<CourseCertificateEntity>,
    @InjectRepository(CourseEnrollmentEntity)
    private readonly enrollmentRepository: Repository<CourseEnrollmentEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly sectionRepository: Repository<CourseModuleSectionEntity>,
    @Inject(forwardRef(() => CourseCertificateService))
    private readonly certificateService: CourseCertificateService,
  ) {}

  /** Clear all learner video progress for a section (e.g. admin replaced the video). */
  async resetSectionLearnerProgress(courseId: string, sectionId: string): Promise<void> {
    const userIds = await this.collectUserIdsWithSectionProgress(courseId, sectionId);
    await this.sectionProgressRepository.delete({ courseId, sectionId });
    await this.invalidateCourseLevelProgress(courseId, userIds);
    await this.resyncCertificates(courseId, userIds);
  }

  /**
   * Reset when admin changes a section video URL (link1 → link2 → link1, etc.).
   * Scope: that section's watch progress + that module's quiz/assessment only — not other modules/sections.
   */
  async resetAfterSectionVideoUrlChange(
    courseId: string,
    sectionId: string,
    moduleId: string,
  ): Promise<void> {
    const userIdSet = new Set<string>();

    const sectionProgressUsers = await this.collectUserIdsWithSectionProgress(courseId, sectionId);
    sectionProgressUsers.forEach((userId) => userIdSet.add(userId));

    const moduleQuestions = await this.questionRepository.find({
      where: { courseId, moduleId },
      select: ['id'],
    });
    const questionIds = moduleQuestions.map((question) => question.id);
    if (questionIds.length > 0) {
      const submissionRows = await this.submissionRepository.find({
        where: { questionId: In(questionIds) },
        select: ['userId'],
      });
      submissionRows.forEach((row) => userIdSet.add(row.userId));
      await this.submissionRepository.delete({ questionId: In(questionIds) });
    }

    const attemptRows = await this.attemptRepository.find({
      where: { courseId, moduleId },
      select: ['userId'],
    });
    attemptRows.forEach((row) => userIdSet.add(row.userId));
    await this.attemptRepository.delete({ courseId, moduleId });

    await this.sectionProgressRepository.delete({ courseId, sectionId });

    const userIds = [...userIdSet];
    await this.invalidateCourseLevelProgress(courseId, userIds);
    await this.resyncCertificates(courseId, userIds);

    this.logger.log(
      `Reset section/module learner progress after video URL change (course=${courseId}, section=${sectionId}, module=${moduleId}, users=${userIds.length})`,
    );
  }

  /** Remove quiz/assessment learner data tied to a module before the module row is deleted. */
  async cleanupModuleBeforeDelete(courseId: string, moduleId: string): Promise<void> {
    const sections = await this.sectionRepository.find({
      where: { moduleId },
      select: ['id'],
    });
    const sectionIds = sections.map((section) => section.id);

    const userIdSet = new Set<string>();
    if (sectionIds.length > 0) {
      const sectionProgressRows = await this.sectionProgressRepository.find({
        where: { courseId, sectionId: In(sectionIds) },
        select: ['userId'],
      });
      sectionProgressRows.forEach((row) => userIdSet.add(row.userId));
    }

    const questionRows = await this.questionRepository.find({
      where: { moduleId },
      select: ['id'],
    });
    const questionIds = questionRows.map((question) => question.id);
    if (questionIds.length > 0) {
      await this.submissionRepository.delete({ questionId: In(questionIds) });
      await this.questionRepository.delete({ id: In(questionIds) });
    }

    const attemptRows = await this.attemptRepository.find({
      where: { courseId, moduleId },
      select: ['userId'],
    });
    attemptRows.forEach((row) => userIdSet.add(row.userId));
    await this.attemptRepository.delete({ courseId, moduleId });

    const activityUserIds = await this.collectUserIdsWithCourseActivity(courseId);
    activityUserIds.forEach((userId) => userIdSet.add(userId));

    const userIds = [...userIdSet];
    await this.invalidateCourseLevelProgress(courseId, userIds);
    await this.resyncCertificates(courseId, userIds);
  }

  private async collectUserIdsWithSectionProgress(
    courseId: string,
    sectionId: string,
  ): Promise<string[]> {
    const rows = await this.sectionProgressRepository.find({
      where: { courseId, sectionId },
      select: ['userId'],
    });
    return [...new Set(rows.map((row) => row.userId))];
  }

  private async collectUserIdsWithCourseActivity(courseId: string): Promise<string[]> {
    const [enrolled, sectionRows, attemptRows, certRows] = await Promise.all([
      this.enrollmentRepository.find({ where: { courseId }, select: ['userId'] }),
      this.sectionProgressRepository.find({ where: { courseId }, select: ['userId'] }),
      this.attemptRepository.find({ where: { courseId }, select: ['userId'] }),
      this.certificateRepository.find({ where: { courseId }, select: ['userId'] }),
    ]);
    return [
      ...new Set([
        ...enrolled.map((row) => row.userId),
        ...sectionRows.map((row) => row.userId),
        ...attemptRows.map((row) => row.userId),
        ...certRows.map((row) => row.userId),
      ]),
    ];
  }

  private async invalidateCourseLevelProgress(courseId: string, userIds: string[]): Promise<void> {
    if (userIds.length > 0) {
      await this.courseProgressRepository.delete({ courseId, userId: In(userIds) });
      return;
    }
    await this.courseProgressRepository.delete({ courseId });
  }

  private async resyncCertificates(courseId: string, userIds: string[]): Promise<void> {
    const ids =
      userIds.length > 0 ? userIds : await this.collectUserIdsWithCourseActivity(courseId);
    await Promise.all(
      ids.map((userId) =>
        this.certificateService.syncCertificateWithCourseCompletion(userId, courseId).catch((error) => {
          this.logger.warn(
            `Certificate resync failed for user ${userId} course ${courseId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }),
      ),
    );
  }
}
