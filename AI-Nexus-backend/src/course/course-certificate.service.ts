import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseCertificateEntity, CourseCertificateStatus } from './course-certificate.entity';
import { CourseSectionWatchProgressService } from './course-section-watch-progress.service';
import { CourseService } from './courses.service';
import { CourseQuizAssessmentProgressService } from './course-quiz-assessment-progress.service';

@Injectable()
export class CourseCertificateService {
  constructor(
    @InjectRepository(CourseCertificateEntity)
    private readonly certificateRepository: Repository<CourseCertificateEntity>,
    private readonly courseSectionWatchProgressService: CourseSectionWatchProgressService,
    private readonly courseService: CourseService,
    @Inject(forwardRef(() => CourseQuizAssessmentProgressService))
    private readonly quizAssessmentProgressService: CourseQuizAssessmentProgressService,
  ) {}

  private buildCertificateNo(courseId: string, userId: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const coursePart = String(courseId || '').replace(/-/g, '').slice(0, 8).toUpperCase();
    const userPart = String(userId || '').replace(/-/g, '').slice(0, 8).toUpperCase();
    return `AINX-${date}-${coursePart}-${userPart}`;
  }

  private async isCourseFullyCompleted(userId: string, courseId: string): Promise<boolean> {
    await this.courseService.getById(courseId);

    const sectionProgressMap =
      await this.courseSectionWatchProgressService.getAllSectionProgressForCourse(userId, courseId);
    const rows = Object.values(sectionProgressMap || {});
    const hasSections = rows.length > 0;
    const videosCompleted = hasSections && rows.every((row) => Boolean(row?.isCompleted));
    if (!videosCompleted) return false;

    return this.quizAssessmentProgressService.isCourseQuizAssessmentRequirementsMet(userId, courseId);
  }

  /**
   * Issue, re-activate, or revoke a learner certificate based on current course completion.
   * Auto-revoke uses Blocked status so a later pass can restore the same certificate row.
   */
  async syncCertificateWithCourseCompletion(userId: string, courseId: string) {
    const existing = await this.certificateRepository.findOne({ where: { userId, courseId } });
    const fullyComplete = await this.isCourseFullyCompleted(userId, courseId);

    if (!fullyComplete) {
      if (existing?.status === CourseCertificateStatus.Active) {
        existing.status = CourseCertificateStatus.Blocked;
        const saved = await this.certificateRepository.save(existing);
        return { action: 'revoked' as const, certificate: saved };
      }
      return { action: 'unchanged' as const, certificate: existing ?? null };
    }

    if (existing?.status === CourseCertificateStatus.Deleted) {
      return { action: 'admin_deleted' as const, certificate: existing };
    }

    if (existing?.status === CourseCertificateStatus.Active) {
      return { action: 'already_active' as const, certificate: existing };
    }

    if (existing?.status === CourseCertificateStatus.Blocked) {
      existing.status = CourseCertificateStatus.Active;
      existing.completedAt = new Date();
      existing.deletedAt = null;
      const saved = await this.certificateRepository.save(existing);
      return { action: 'reissued' as const, certificate: saved };
    }

    const certificate = this.certificateRepository.create({
      userId,
      courseId,
      certificateNo: this.buildCertificateNo(courseId, userId),
      completedAt: new Date(),
      status: CourseCertificateStatus.Active,
      deletedAt: null,
    });
    const saved = await this.certificateRepository.save(certificate);
    return { action: 'issued' as const, certificate: saved };
  }

  async issueIfCourseCompleted(userId: string, courseId: string) {
    const result = await this.syncCertificateWithCourseCompletion(userId, courseId);
    if (result.action === 'issued' || result.action === 'reissued') {
      return { issued: true, certificate: result.certificate, reason: result.action };
    }
    if (result.action === 'revoked') {
      return { issued: false, certificate: result.certificate, reason: 'revoked' as const };
    }
    if (result.action === 'admin_deleted') {
      return { issued: false, certificate: result.certificate, reason: 'deleted_by_admin' as const };
    }
    if (result.action === 'already_active') {
      return { issued: false, certificate: result.certificate, reason: 'already_exists' as const };
    }

    const fullyComplete = await this.isCourseFullyCompleted(userId, courseId);
    if (!fullyComplete) {
      const sectionProgressMap =
        await this.courseSectionWatchProgressService.getAllSectionProgressForCourse(userId, courseId);
      const rows = Object.values(sectionProgressMap || {});
      const hasSections = rows.length > 0;
      const videosCompleted = hasSections && rows.every((row) => Boolean(row?.isCompleted));
      if (!videosCompleted) {
        return { issued: false, certificate: null, reason: 'not_completed' as const };
      }
      return { issued: false, certificate: null, reason: 'quiz_assessment_incomplete' as const };
    }

    return { issued: false, certificate: null, reason: 'not_completed' as const };
  }

  async getUserCertificates(userId: string) {
    const rows = await this.certificateRepository.find({
      where: { userId, status: CourseCertificateStatus.Active },
      relations: ['course', 'user'],
      order: { completedAt: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      id: row.id,
      courseId: row.courseId,
      certificateNo: row.certificateNo,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      courseTitle: row.course?.title || 'Untitled Course',
      marketData: row.course?.marketData || '',
      learnerName: `${row.user?.firstname || ''} ${row.user?.lastname || ''}`.trim() || row.user?.username || 'Learner',
    }));
  }

  async getAdminCertificates(filters: {
    userName?: string;
    courseTitle?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const qb = this.certificateRepository
      .createQueryBuilder('cert')
      .leftJoinAndSelect('cert.course', 'course')
      .leftJoinAndSelect('cert.user', 'user')
      .where('cert.status != :deletedStatus', { deletedStatus: CourseCertificateStatus.Deleted })
      .orderBy('cert.completedAt', 'DESC')
      .addOrderBy('cert.createdAt', 'DESC');

    if (filters.userName) {
      qb.andWhere(
        `LOWER(TRIM(COALESCE(user.firstname, '') || ' ' || COALESCE(user.lastname, ''))) LIKE :userName`,
        { userName: `%${String(filters.userName).trim().toLowerCase()}%` },
      );
    }

    if (filters.courseTitle) {
      qb.andWhere('LOWER(COALESCE(course.title, \'\')) LIKE :courseTitle', {
        courseTitle: `%${String(filters.courseTitle).trim().toLowerCase()}%`,
      });
    }

    if (filters.q) {
      const q = `%${String(filters.q).trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(COALESCE(course.title, '')) LIKE :q
          OR LOWER(COALESCE(user.firstname, '')) LIKE :q
          OR LOWER(COALESCE(user.lastname, '')) LIKE :q
          OR LOWER(TRIM(COALESCE(user.firstname, '') || ' ' || COALESCE(user.lastname, ''))) LIKE :q
          OR LOWER(COALESCE(user.email, '')) LIKE :q
          OR LOWER(COALESCE(cert.certificateNo, '')) LIKE :q)`,
        { q },
      );
    }

    const page = Number.isFinite(Number(filters.page)) && Number(filters.page) > 0 ? Number(filters.page) : 1;
    const limit = Number.isFinite(Number(filters.limit)) && Number(filters.limit) > 0 ? Number(filters.limit) : 10;
    const skip = (page - 1) * limit;

    const [rows, totalItems] = await qb.skip(skip).take(limit).getManyAndCount();
    const data = rows.map((row) => ({
      id: row.id,
      courseId: row.courseId,
      userId: row.userId,
      certificateNo: row.certificateNo,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      courseTitle: row.course?.title || 'Untitled Course',
      learnerName: `${row.user?.firstname || ''} ${row.user?.lastname || ''}`.trim() || row.user?.username || 'Learner',
      learnerEmail: row.user?.email || '',
      status: row.status || CourseCertificateStatus.Active,
    }));
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async deleteCertificateById(id: string) {
    const existing = await this.certificateRepository.findOne({ where: { id } });
    if (!existing) {
      return { deleted: false };
    }
    existing.status = CourseCertificateStatus.Deleted;
    existing.deletedAt = new Date();
    await this.certificateRepository.save(existing);
    return { deleted: true };
  }

  async blockCertificateById(id: string) {
    const existing = await this.certificateRepository.findOne({ where: { id } });
    if (!existing || existing.status === CourseCertificateStatus.Deleted) {
      return { blocked: false };
    }
    existing.status = CourseCertificateStatus.Blocked;
    await this.certificateRepository.save(existing);
    return { blocked: true };
  }

  async unblockCertificateById(id: string) {
    const existing = await this.certificateRepository.findOne({ where: { id } });
    if (!existing || existing.status === CourseCertificateStatus.Deleted) {
      return { unblocked: false };
    }
    existing.status = CourseCertificateStatus.Active;
    await this.certificateRepository.save(existing);
    return { unblocked: true };
  }
}
