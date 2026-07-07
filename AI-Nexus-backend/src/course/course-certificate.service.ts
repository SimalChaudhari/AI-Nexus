import { forwardRef, Inject, Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CourseCertificateEntity, CourseCertificateStatus } from './course-certificate.entity';
import { CourseSectionWatchProgressService } from './course-section-watch-progress.service';
import { CourseService } from './courses.service';
import { CourseQuizAssessmentProgressService } from './course-quiz-assessment-progress.service';
import { CourseEntity } from './courses.entity';
import { ProgramEntity } from '../program/programs.entity';
import { CourseModuleEntity } from './course-module.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';
import { resolveProgramPillarIndexFromLevel } from './program-pillar.util';
import { resolveCoursePillarIndex } from './course-program-cpe-summary.util';
import {
  isSectionVideoUrlChanged,
  normalizeVideoUrlForCompare,
} from './course-video-url.util';
import { UpdateCourseModuleSectionDto } from './course-module-section.dto';

type CertificateSyncResult = {
  action: 'issued' | 'reissued' | 'revoked' | 'unchanged' | 'already_active' | 'admin_deleted';
  certificate: CourseCertificateEntity | null;
};

export type CourseContentDeletionGuard = {
  locked: boolean;
  activeCertificateCount: number;
  completedSectionIds: string[];
  reason: string | null;
};

const COURSE_CONTENT_DELETION_BLOCKED_MESSAGE =
  'Learners have been issued certificates for this course or programme. You cannot delete modules/sections, change video URLs, or change custom watchtime. Revoke or remove certificates first.';

const SECTION_VIDEO_COMPLETED_LOCK_MESSAGE =
  'Learners have already completed this lesson video. You cannot delete it or change its video URL and watchtime.';

const COURSE_HAS_COMPLETED_LESSONS_MESSAGE =
  'Learners have completed lessons in this course. You cannot delete the course until that progress is cleared.';

export type CertificateTranscriptSection = {
  sectionId: string;
  sectionTitle: string;
  isCompleted: boolean;
  completedAt: string | null;
};

export type CertificateTranscriptModule = {
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  pillarIndex?: number | null;
  completedSections: number;
  totalSections: number;
  isModuleComplete: boolean;
  sections: CertificateTranscriptSection[];
};

@Injectable()
export class CourseCertificateService {
  constructor(
    @InjectRepository(CourseCertificateEntity)
    private readonly certificateRepository: Repository<CourseCertificateEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(ProgramEntity)
    private readonly programRepository: Repository<ProgramEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly courseModuleRepository: Repository<CourseModuleEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly courseModuleSectionRepository: Repository<CourseModuleSectionEntity>,
    private readonly courseSectionWatchProgressService: CourseSectionWatchProgressService,
    @Inject(forwardRef(() => CourseService))
    private readonly courseService: CourseService,
    @Inject(forwardRef(() => CourseQuizAssessmentProgressService))
    private readonly quizAssessmentProgressService: CourseQuizAssessmentProgressService,
  ) {}

  private async buildCertificateNo(completedAt: Date = new Date()): Promise<string> {
    const safeDate = completedAt instanceof Date && !Number.isNaN(completedAt.getTime())
      ? completedAt
      : new Date();
    const datePart = safeDate.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `AINX-${datePart}-`;
    const existingCount = await this.certificateRepository
      .createQueryBuilder('cert')
      .where('cert.certificateNo LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    const sequence = String(existingCount + 1).padStart(5, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Active certificate row exists (used to grandfather quiz/assessment unlock after admin adds content).
   */
  async hasCredentialRecordForLearner(userId: string, courseId: string): Promise<boolean> {
    const direct = await this.certificateRepository.findOne({
      where: { userId, courseId, status: CourseCertificateStatus.Active },
      select: ['id'],
    });
    if (direct) return true;

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'programId'],
    });
    if (!course?.programId) return false;

    const programCert = await this.certificateRepository.findOne({
      where: { userId, programId: course.programId, status: CourseCertificateStatus.Active },
      select: ['id'],
    });
    return Boolean(programCert);
  }

  /** Badge/CPE display — respects completion rules; grandfathers only admin-added content after issue. */
  async hasDisplayableCredentialForLearner(userId: string, courseId: string): Promise<boolean> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'programId'],
    });
    if (!course) return false;

    if (course.programId) {
      const programCert = await this.certificateRepository.findOne({
        where: { userId, programId: course.programId, status: CourseCertificateStatus.Active },
        select: ['id', 'courseId', 'programId'],
      });
      if (!programCert) return false;
      return this.shouldDisplayCredentialToLearner(userId, programCert);
    }

    const direct = await this.certificateRepository.findOne({
      where: { userId, courseId, status: CourseCertificateStatus.Active },
      select: ['id', 'courseId', 'programId'],
    });
    if (!direct) return false;
    return this.shouldDisplayCredentialToLearner(userId, direct);
  }

  /** @deprecated Use hasDisplayableCredentialForLearner or hasCredentialRecordForLearner */
  async hasActiveCredentialForLearner(userId: string, courseId: string): Promise<boolean> {
    return this.hasDisplayableCredentialForLearner(userId, courseId);
  }

  /**
   * Learner-facing certificate/badge visibility.
   * Programme: requires full rules OR grandfather when only post-issue content is incomplete.
   */
  private async shouldDisplayCredentialToLearner(
    userId: string,
    row: Pick<CourseCertificateEntity, 'courseId' | 'programId'>,
  ): Promise<boolean> {
    if (row.programId) {
      if (await this.isProgramCertificateRequirementsMet(userId, row.programId)) {
        return true;
      }
      const cert = await this.certificateRepository.findOne({
        where: { userId, programId: row.programId, status: CourseCertificateStatus.Active },
        select: ['id', 'completedAt'],
      });
      if (!cert?.completedAt) return false;
      return this.isGrandfatheredProgrammeCredential(userId, row.programId, cert.completedAt);
    }
    return Boolean(
      await this.certificateRepository.findOne({
        where: { userId, courseId: row.courseId, status: CourseCertificateStatus.Active },
        select: ['id'],
      }),
    );
  }

  /** Keep programme badge when admin added content after issue; hide if pre-issue quiz/assessment still owed. */
  private async isGrandfatheredProgrammeCredential(
    userId: string,
    programId: string,
    issuedAt: Date,
  ): Promise<boolean> {
    const pillars = await this.getProgramPillarCourses(programId);
    const pillarCourses = [pillars.pillar1, pillars.pillar2].filter(Boolean) as CourseEntity[];
    for (const course of pillarCourses) {
      const hasPreIssueGap =
        await this.quizAssessmentProgressService.hasIncompleteQuizAssessmentBefore(
          userId,
          course.id,
          issuedAt,
        );
      if (hasPreIssueGap) return false;
    }
    return true;
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

  private async isPillar2PartialRequirementsMet(userId: string, courseId: string): Promise<boolean> {
    const modules = await this.courseModuleRepository.find({
      where: { courseId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (!modules.length) return false;

    const sections = await this.courseModuleSectionRepository.find({
      where: { moduleId: In(modules.map((module) => module.id)) },
      select: ['id', 'moduleId'],
    });
    if (!sections.length) return false;

    const sectionProgressMap =
      await this.courseSectionWatchProgressService.getAllSectionProgressForCourse(userId, courseId);

    for (const module of modules) {
      const moduleSections = sections.filter((section) => section.moduleId === module.id);
      if (!moduleSections.length) continue;

      const allSectionsComplete = moduleSections.every((section) =>
        Boolean(sectionProgressMap?.[section.id]?.isCompleted),
      );
      if (!allSectionsComplete) continue;

      const moduleQuizAssessmentComplete =
        await this.quizAssessmentProgressService.isPillar2ProgrammeModuleComplete(
          userId,
          courseId,
          module.id,
        );
      if (moduleQuizAssessmentComplete) {
        return true;
      }
    }

    return false;
  }

  private async resolvePillarIndex(course: Pick<CourseEntity, 'id' | 'level' | 'programPillarIndex'>): Promise<number | null> {
    if (course.programPillarIndex) {
      return course.programPillarIndex;
    }
    const derived = resolveProgramPillarIndexFromLevel(course.level);
    if (derived) {
      await this.courseRepository.update(course.id, { programPillarIndex: derived });
    }
    return derived;
  }

  private async getProgramPillarCourses(programId: string) {
    const courses = await this.courseRepository.find({
      where: { programId, isBundle: false },
      select: ['id', 'title', 'programPillarIndex', 'level'],
    });
    const byPillar = new Map<number, CourseEntity>();
    for (const course of courses) {
      const pillarIndex = await this.resolvePillarIndex(course);
      if (pillarIndex) {
        byPillar.set(pillarIndex, course);
      }
    }
    return {
      pillar1: byPillar.get(1) || null,
      pillar2: byPillar.get(2) || null,
      pillar3: byPillar.get(3) || null,
      hasPillar1And2: byPillar.has(1) && byPillar.has(2),
    };
  }

  private async isProgramCertificateRequirementsMet(userId: string, programId: string): Promise<boolean> {
    const pillars = await this.getProgramPillarCourses(programId);
    if (!pillars.hasPillar1And2 || !pillars.pillar1 || !pillars.pillar2) {
      return false;
    }

    const pillar1Complete = await this.isCourseFullyCompleted(userId, pillars.pillar1.id);
    const pillar2Partial = await this.isPillar2PartialRequirementsMet(userId, pillars.pillar2.id);
    return pillar1Complete && pillar2Partial;
  }

  private async blockStandaloneCertificate(userId: string, courseId: string): Promise<void> {
    const existing = await this.certificateRepository.findOne({ where: { userId, courseId } });
    if (existing?.status === CourseCertificateStatus.Active && !existing.programId) {
      existing.status = CourseCertificateStatus.Blocked;
      await this.certificateRepository.save(existing);
    }
  }

  private async upsertActiveCertificate(
    userId: string,
    courseId: string,
    programId?: string | null,
  ): Promise<CertificateSyncResult> {
    const existing = await this.certificateRepository.findOne({ where: { userId, courseId } });

    if (existing?.status === CourseCertificateStatus.Deleted) {
      existing.status = CourseCertificateStatus.Active;
      existing.completedAt = new Date();
      existing.deletedAt = null;
      existing.programId = programId || null;
      existing.certificateNo = await this.buildCertificateNo(existing.completedAt);
      const saved = await this.certificateRepository.save(existing);
      return { action: 'reissued', certificate: saved };
    }

    if (existing?.status === CourseCertificateStatus.Active) {
      if (programId && existing.programId !== programId) {
        existing.programId = programId;
        await this.certificateRepository.save(existing);
      }
      return { action: 'already_active', certificate: existing };
    }

    if (existing?.status === CourseCertificateStatus.Blocked) {
      existing.status = CourseCertificateStatus.Active;
      existing.completedAt = new Date();
      existing.deletedAt = null;
      existing.programId = programId || null;
      existing.certificateNo = await this.buildCertificateNo(existing.completedAt);
      const saved = await this.certificateRepository.save(existing);
      return { action: 'reissued', certificate: saved };
    }

    const completedAt = new Date();
    const certificate = this.certificateRepository.create({
      userId,
      courseId,
      programId: programId || null,
      certificateNo: await this.buildCertificateNo(completedAt),
      completedAt,
      status: CourseCertificateStatus.Active,
      deletedAt: null,
    });
    const saved = await this.certificateRepository.save(certificate);
    return { action: 'issued', certificate: saved };
  }

  private async syncProgramCertificate(userId: string, programId: string): Promise<CertificateSyncResult> {
    const pillars = await this.getProgramPillarCourses(programId);
    if (!pillars.pillar1) {
      return { action: 'unchanged', certificate: null };
    }

    const pillar1CourseId = pillars.pillar1.id;

    if (pillars.pillar2) {
      await this.blockStandaloneCertificate(userId, pillars.pillar2.id);
    }
    if (pillars.pillar3) {
      await this.blockStandaloneCertificate(userId, pillars.pillar3.id);
    }

    const requirementsMet = await this.isProgramCertificateRequirementsMet(userId, programId);
    if (!requirementsMet) {
      await this.blockStandaloneCertificate(userId, pillar1CourseId);

      const existing = await this.certificateRepository.findOne({
        where: { userId, courseId: pillar1CourseId },
      });
      // Keep programme certificates once issued — new sections must not revoke them.
      if (existing?.status === CourseCertificateStatus.Active && existing.programId === programId) {
        return { action: 'already_active', certificate: existing };
      }
      return { action: 'unchanged', certificate: existing ?? null };
    }

    return this.upsertActiveCertificate(userId, pillar1CourseId, programId);
  }

  /**
   * Issue, re-activate, or revoke a learner certificate based on current course completion.
   * Program-linked courses issue one shared certificate (Pillar 1 course row) when programme rules are met.
   */
  async syncCertificateWithCourseCompletion(userId: string, courseId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'programId', 'programPillarIndex', 'level'],
    });

    if (course?.programId) {
      const pillarIndex = await this.resolvePillarIndex(course);
      if (pillarIndex === 2 || pillarIndex === 3) {
        await this.blockStandaloneCertificate(userId, courseId);
      }
      return this.syncProgramCertificate(userId, course.programId);
    }

    const existing = await this.certificateRepository.findOne({ where: { userId, courseId } });
    const fullyComplete = await this.isCourseFullyCompleted(userId, courseId);

    if (!fullyComplete) {
      // Keep certificates once issued — admins may add sections after learners earn a badge.
      if (existing?.status === CourseCertificateStatus.Active) {
        return { action: 'already_active' as const, certificate: existing };
      }
      return { action: 'unchanged' as const, certificate: existing ?? null };
    }

    if (existing?.status === CourseCertificateStatus.Deleted) {
      existing.status = CourseCertificateStatus.Active;
      existing.completedAt = new Date();
      existing.deletedAt = null;
      existing.programId = null;
      existing.certificateNo = await this.buildCertificateNo(existing.completedAt);
      const saved = await this.certificateRepository.save(existing);
      return { action: 'reissued' as const, certificate: saved };
    }

    if (existing?.status === CourseCertificateStatus.Active) {
      return { action: 'already_active' as const, certificate: existing };
    }

    if (existing?.status === CourseCertificateStatus.Blocked) {
      existing.status = CourseCertificateStatus.Active;
      existing.completedAt = new Date();
      existing.deletedAt = null;
      existing.programId = null;
      existing.certificateNo = await this.buildCertificateNo(existing.completedAt);
      const saved = await this.certificateRepository.save(existing);
      return { action: 'reissued' as const, certificate: saved };
    }

    const completedAt = new Date();
    const certificate = this.certificateRepository.create({
      userId,
      courseId,
      programId: null,
      certificateNo: await this.buildCertificateNo(completedAt),
      completedAt,
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
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
        select: ['programId'],
      });
      if (course?.programId && result.certificate?.programId) {
        return { issued: true, certificate: result.certificate, reason: 'already_exists' as const };
      }
      return { issued: false, certificate: result.certificate, reason: 'already_exists' as const };
    }

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['programId'],
    });
    if (course?.programId) {
      return { issued: false, certificate: result.certificate, reason: 'program_requirements_pending' as const };
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

  private async buildCourseTranscript(
    userId: string,
    courseId: string,
    courseTitle = '',
  ): Promise<CertificateTranscriptModule[]> {
    const modules = await this.courseModuleRepository.find({
      where: { courseId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (!modules.length) return [];

    const sections = await this.courseModuleSectionRepository.find({
      where: { moduleId: In(modules.map((module) => module.id)) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const progressMap =
      await this.courseSectionWatchProgressService.getAllSectionProgressForCourse(userId, courseId);

    return modules.map((module) => {
      const moduleSections = sections.filter((section) => section.moduleId === module.id);
      const sectionRows: CertificateTranscriptSection[] = moduleSections.map((section) => {
        const progress = progressMap[section.id];
        return {
          sectionId: section.id,
          sectionTitle: section.title || 'Lesson',
          isCompleted: Boolean(progress?.isCompleted),
          completedAt: progress?.lastAccessedAt ? new Date(progress.lastAccessedAt).toISOString() : null,
        };
      });
      const completedSections = sectionRows.filter((row) => row.isCompleted).length;
      return {
        moduleId: module.id,
        moduleTitle: module.title || 'Module',
        courseId,
        courseTitle,
        completedSections,
        totalSections: sectionRows.length,
        isModuleComplete: sectionRows.length > 0 && completedSections === sectionRows.length,
        sections: sectionRows,
      };
    });
  }

  private async buildProgrammeTranscript(
    userId: string,
    programId: string,
  ): Promise<CertificateTranscriptModule[]> {
    const courses = await this.courseRepository.find({
      where: { programId, isBundle: false },
      select: ['id', 'title', 'programPillarIndex', 'level'],
      order: { programPillarIndex: 'ASC', createdAt: 'ASC' },
    });
    const courseByPillar = new Map<number, CourseEntity>();
    for (const course of courses) {
      const pillarIndex = resolveCoursePillarIndex(course);
      if (!pillarIndex || courseByPillar.has(pillarIndex)) continue;
      courseByPillar.set(pillarIndex, course);
    }

    const transcript: CertificateTranscriptModule[] = [];
    for (const pillarIndex of [1, 2, 3]) {
      const course = courseByPillar.get(pillarIndex);
      if (!course) continue;
      const courseModules = await this.buildCourseTranscript(userId, course.id, course.title);
      transcript.push(
        ...courseModules
          .filter((module) => module.completedSections > 0)
          .map((module) => ({
            ...module,
            pillarIndex,
            courseTitle: course.title,
          })),
      );
    }
    return transcript;
  }

  private async resolveCertificateCpeHours(
    userId: string,
    row: Pick<CourseCertificateEntity, 'courseId' | 'programId'>,
  ) {
    if (row.programId) {
      const summary = await this.courseSectionWatchProgressService.getProgramPillarWatchSummary(
        userId,
        row.programId,
      );
      return {
        earnedCpeHours: summary.totalEarnedCpeHours,
        allocatedCpeHours: summary.totalAllocatedCpeHours,
        watchedTime: summary.totalWatchedTime,
      };
    }
    return this.courseSectionWatchProgressService.getCourseEarnedCpeHours(userId, row.courseId);
  }

  async getUserCertificates(userId: string) {
    const rows = await this.certificateRepository.find({
      where: { userId, status: CourseCertificateStatus.Active },
      relations: ['course', 'user'],
      order: { completedAt: 'DESC', createdAt: 'DESC' },
    });

    const visibleRows: CourseCertificateEntity[] = [];
    for (const row of rows) {
      if (await this.shouldDisplayCredentialToLearner(userId, row)) {
        visibleRows.push(row);
      }
    }

    const programIds = [...new Set(visibleRows.map((row) => row.programId).filter(Boolean))] as string[];
    const programs = programIds.length
      ? await this.programRepository.find({ where: { id: In(programIds) }, select: ['id', 'title'] })
      : [];
    const programTitleById = new Map(programs.map((program) => [program.id, program.title]));

    return Promise.all(
      visibleRows.map(async (row) => {
        const courseTitle = row.programId
          ? programTitleById.get(row.programId) || row.course?.title || 'Programme'
          : row.course?.title || 'Untitled Course';
        const [cpe, transcript] = await Promise.all([
          this.resolveCertificateCpeHours(userId, row),
          row.programId
            ? this.buildProgrammeTranscript(userId, row.programId)
            : this.buildCourseTranscript(userId, row.courseId, courseTitle),
        ]);
        const completedModules = transcript.filter((module) => module.isModuleComplete);

        return {
          id: row.id,
          courseId: row.courseId,
          programId: row.programId || null,
          certificateNo: row.certificateNo,
          completedAt: row.completedAt,
          createdAt: row.createdAt,
          courseTitle,
          programTitle: row.programId ? programTitleById.get(row.programId) || '' : '',
          marketData: row.course?.marketData || '',
          learnerName:
            `${row.user?.firstname || ''} ${row.user?.lastname || ''}`.trim() ||
            row.user?.username ||
            'Learner',
          earnedCpeHours: cpe.earnedCpeHours,
          allocatedCpeHours: cpe.allocatedCpeHours,
          watchedTime: cpe.watchedTime,
          transcript,
          completedModules,
        };
      }),
    );
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
    const programIds = [...new Set(rows.map((row) => row.programId).filter(Boolean))] as string[];
    const programs = programIds.length
      ? await this.programRepository.find({ where: { id: In(programIds) }, select: ['id', 'title'] })
      : [];
    const programTitleById = new Map(programs.map((program) => [program.id, program.title]));

    const data = rows.map((row) => ({
      id: row.id,
      courseId: row.courseId,
      userId: row.userId,
      programId: row.programId || null,
      certificateNo: row.certificateNo,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      courseTitle: row.programId
        ? programTitleById.get(row.programId) || row.course?.title || 'Programme'
        : row.course?.title || 'Untitled Course',
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

  async getCourseContentDeletionGuard(courseId: string): Promise<CourseContentDeletionGuard> {
    const [activeCertificateCount, completedSectionIds] = await Promise.all([
      this.countActiveCertificatesBlockingCourseDeletion(courseId),
      this.courseSectionWatchProgressService.getCompletedSectionIdsForCourse(courseId),
    ]);
    return {
      locked: activeCertificateCount > 0,
      activeCertificateCount,
      completedSectionIds,
      reason:
        activeCertificateCount > 0 ? COURSE_CONTENT_DELETION_BLOCKED_MESSAGE : null,
    };
  }

  async assertCourseContentDeletionAllowed(courseId: string): Promise<void> {
    const guard = await this.getCourseContentDeletionGuard(courseId);
    if (guard.locked) {
      throw new BadRequestException(guard.reason || COURSE_CONTENT_DELETION_BLOCKED_MESSAGE);
    }
    if (guard.completedSectionIds.length > 0) {
      throw new BadRequestException(COURSE_HAS_COMPLETED_LESSONS_MESSAGE);
    }
  }

  async assertSectionDeletionAllowed(courseId: string, sectionId: string): Promise<void> {
    const guard = await this.getCourseContentDeletionGuard(courseId);
    if (guard.locked) {
      throw new BadRequestException(guard.reason || COURSE_CONTENT_DELETION_BLOCKED_MESSAGE);
    }
    if (guard.completedSectionIds.includes(sectionId)) {
      throw new BadRequestException(SECTION_VIDEO_COMPLETED_LOCK_MESSAGE);
    }
  }

  async assertModuleDeletionAllowed(courseId: string, moduleId: string): Promise<void> {
    const guard = await this.getCourseContentDeletionGuard(courseId);
    if (guard.locked) {
      throw new BadRequestException(guard.reason || COURSE_CONTENT_DELETION_BLOCKED_MESSAGE);
    }
    const sections = await this.courseModuleSectionRepository.find({
      where: { moduleId },
      select: ['id'],
    });
    const sectionIds = new Set(sections.map((section) => section.id));
    const hasCompletedLesson = guard.completedSectionIds.some((id) => sectionIds.has(id));
    if (hasCompletedLesson) {
      throw new BadRequestException(SECTION_VIDEO_COMPLETED_LOCK_MESSAGE);
    }
  }

  async assertSectionVideoSettingsEditAllowed(
    courseId: string,
    sectionId: string,
    section: Pick<CourseModuleSectionEntity, 'videoUrl' | 'watchtime' | 'durationTime'>,
    dto: UpdateCourseModuleSectionDto,
  ): Promise<void> {
    const guard = await this.getCourseContentDeletionGuard(courseId);
    const hadVideo = Boolean(normalizeVideoUrlForCompare(section.videoUrl));
    if (!hadVideo) return;

    const sectionCompleted = guard.completedSectionIds.includes(sectionId);
    const certificateLocked = guard.locked;
    if (!certificateLocked && !sectionCompleted) return;

    const message = certificateLocked
      ? guard.reason || COURSE_CONTENT_DELETION_BLOCKED_MESSAGE
      : SECTION_VIDEO_COMPLETED_LOCK_MESSAGE;

    if (dto.videoUrl !== undefined && isSectionVideoUrlChanged(section.videoUrl, dto.videoUrl)) {
      throw new BadRequestException(message);
    }

    if (dto.watchtime !== undefined) {
      const prev = String(section.watchtime || '').trim();
      const next = String(dto.watchtime || '').trim();
      if (prev !== next) {
        throw new BadRequestException(message);
      }
    }

    if (dto.durationTime !== undefined) {
      const prev = String(section.durationTime || '').trim();
      const next = String(dto.durationTime || '').trim();
      if (prev !== next) {
        throw new BadRequestException(message);
      }
    }

    if (dto.images !== undefined || dto.attachments !== undefined) {
      throw new BadRequestException(message);
    }

    if (dto.content !== undefined && String(dto.content || '').trim()) {
      throw new BadRequestException(message);
    }
  }

  private async countActiveCertificatesBlockingCourseDeletion(courseId: string): Promise<number> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'programId'],
    });
    if (!course) return 0;

    const qb = this.certificateRepository
      .createQueryBuilder('cert')
      .where('cert.status = :status', { status: CourseCertificateStatus.Active });

    if (course.programId) {
      qb.andWhere('(cert.courseId = :courseId OR cert.programId = :programId)', {
        courseId,
        programId: course.programId,
      });
    } else {
      qb.andWhere('cert.courseId = :courseId', { courseId });
    }

    return qb.getCount();
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
