import { forwardRef, Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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
import {
  computeCpeHoursFromWatchSeconds,
  resolveCoursePillarIndex,
} from './course-program-cpe-summary.util';
import { UpdateCourseModuleSectionDto } from './course-module-section.dto';
import { LocalStorageService } from '../service/local-storage.service';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { SalesforceBadgeService } from '../auth/salesforce-badge.service';
import { UserEntity } from '../user/users.entity';
import { buildCourseCertificatePdf } from './utils/certificate-pdf.util';
import {
  CERTIFICATE_PROGRAMME_DISPLAY_TITLE,
  mergeCertificateTemplateIntoInput,
  resolveCertificateProgrammeLevel,
} from './utils/certificate-pdf-shared.util';

/** LinkedIn share text cannot use HTML/markdown — approximate bold with Mathematical Bold Unicode. */
function toLinkedInBoldText(value: string): string {
  return Array.from(String(value || ''))
    .map((ch) => {
      if (ch >= 'A' && ch <= 'Z') {
        return String.fromCodePoint(0x1d400 + (ch.charCodeAt(0) - 65));
      }
      if (ch >= 'a' && ch <= 'z') {
        return String.fromCodePoint(0x1d41a + (ch.charCodeAt(0) - 97));
      }
      if (ch >= '0' && ch <= '9') {
        return String.fromCodePoint(0x1d7ce + (ch.charCodeAt(0) - 48));
      }
      return ch;
    })
    .join('');
}

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
  /** Earned CPE for this module (from verified watch time). */
  cpeHours: number;
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
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly courseSectionWatchProgressService: CourseSectionWatchProgressService,
    @Inject(forwardRef(() => CourseService))
    private readonly courseService: CourseService,
    @Inject(forwardRef(() => CourseQuizAssessmentProgressService))
    private readonly quizAssessmentProgressService: CourseQuizAssessmentProgressService,
    private readonly localStorageService: LocalStorageService,
    private readonly appSettingsService: AppSettingsService,
    private readonly salesforceBadgeService: SalesforceBadgeService,
  ) {}

  private async buildCertificateNo(completedAt: Date = new Date()): Promise<string> {
    const safeDate = completedAt instanceof Date && !Number.isNaN(completedAt.getTime())
      ? completedAt
      : new Date();
    const datePart = safeDate.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `AINX-${datePart}-`;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const existingCount = await this.certificateRepository
        .createQueryBuilder('cert')
        .where('cert.certificateNo LIKE :prefix', { prefix: `${prefix}%` })
        .getCount();
      const sequence = String(existingCount + 1 + attempt).padStart(5, '0');
      const candidate = `${prefix}${sequence}`;
      const clash = await this.certificateRepository.findOne({
        where: { certificateNo: candidate },
        select: ['id'],
      });
      if (!clash) return candidate;
    }
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}${suffix}`;
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

  async checkCourseFullyCompleted(userId: string, courseId: string): Promise<boolean> {
    return this.isCourseFullyCompleted(userId, courseId);
  }

  async checkProgramCertificateRequirementsMet(
    userId: string,
    programId: string,
  ): Promise<boolean> {
    return this.isProgramCertificateRequirementsMet(userId, programId);
  }

  async getProgramPillarsPublic(programId: string) {
    return this.getProgramPillarCourses(programId);
  }

  private async isCourseFullyCompleted(userId: string, courseId: string): Promise<boolean> {
    const course = await this.courseService.getById(courseId);

    const sectionProgressMap =
      await this.courseSectionWatchProgressService.getAllSectionProgressForCourse(userId, courseId);
    const rows = Object.values(sectionProgressMap || {});
    const hasSections = rows.length > 0;
    const videosCompleted =
      hasSections &&
      rows.every((row) => Boolean(row?.isCompleted || row?.isWatched));
    if (!videosCompleted) return false;

    return this.quizAssessmentProgressService.isCourseQuizAssessmentRequirementsMet(
      userId,
      courseId,
      course?.level,
    );
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

      const allSectionsComplete = moduleSections.every((section) => {
        const row = sectionProgressMap?.[section.id];
        return Boolean(row?.isCompleted || row?.isWatched);
      });
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
      existing.certificateBlocked = true;
      existing.badgeBlocked = true;
      existing.status = CourseCertificateStatus.Blocked;
      await this.certificateRepository.save(existing);
    }
  }

  private syncCredentialBlockStatus(row: CourseCertificateEntity): void {
    if (row.status === CourseCertificateStatus.Deleted) return;
    row.status =
      row.certificateBlocked && row.badgeBlocked
        ? CourseCertificateStatus.Blocked
        : CourseCertificateStatus.Active;
  }

  private clearCredentialBlocks(row: CourseCertificateEntity): void {
    row.certificateBlocked = false;
    row.badgeBlocked = false;
    if (row.status !== CourseCertificateStatus.Deleted) {
      row.status = CourseCertificateStatus.Active;
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
      this.clearCredentialBlocks(existing);
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
      this.clearCredentialBlocks(existing);
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
      certificateBlocked: false,
      badgeBlocked: false,
      certificateNo: await this.buildCertificateNo(completedAt),
      completedAt,
      status: CourseCertificateStatus.Active,
      deletedAt: null,
    });
    try {
      const saved = await this.certificateRepository.save(certificate);
      return { action: 'issued', certificate: saved };
    } catch {
      // Concurrent backfill (Pillar 1 + Pillar 2) can race on the unique (userId, courseId) row.
      const raced = await this.certificateRepository.findOne({ where: { userId, courseId } });
      if (raced?.status === CourseCertificateStatus.Active) {
        if (programId && raced.programId !== programId) {
          raced.programId = programId;
          await this.certificateRepository.save(raced);
        }
        return { action: 'already_active', certificate: raced };
      }
      if (raced) {
        raced.status = CourseCertificateStatus.Active;
        this.clearCredentialBlocks(raced);
        raced.completedAt = new Date();
        raced.deletedAt = null;
        raced.programId = programId || null;
        raced.certificateNo = await this.buildCertificateNo(raced.completedAt);
        const saved = await this.certificateRepository.save(raced);
        return { action: 'reissued', certificate: saved };
      }
      throw new Error('Failed to issue certificate after concurrent write');
    }
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
      this.clearCredentialBlocks(existing);
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
      this.clearCredentialBlocks(existing);
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
      certificateBlocked: false,
      badgeBlocked: false,
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
    if (
      result.certificate &&
      (result.action === 'issued' ||
        result.action === 'reissued' ||
        (result.action === 'already_active' && !result.certificate.pdfUrl))
    ) {
      try {
        const withPdf = await this.ensureCertificatePdfStored(result.certificate.id);
        result.certificate = withPdf;
      } catch (error) {
        console.error(
          `[certificate-pdf] failed for cert=${result.certificate.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    if (result.action === 'issued' || result.action === 'reissued') {
      // Sync digital badge to Salesforce (createbadgeforainexus) — non-fatal.
      try {
        await this.salesforceBadgeService.createBadgeForUser(userId);
      } catch (error) {
        console.error(
          `[Salesforce Badge] createbadgeforainexus after cert ${result.action} failed for user=${userId}:`,
          error instanceof Error ? error.message : error,
        );
      }
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
      const videosCompleted =
        hasSections && rows.every((row) => Boolean(row?.isCompleted || row?.isWatched));
      if (!videosCompleted) {
        return { issued: false, certificate: null, reason: 'not_completed' as const };
      }
      return { issued: false, certificate: null, reason: 'quiz_assessment_incomplete' as const };
    }

    return { issued: false, certificate: null, reason: 'not_completed' as const };
  }

  /**
   * One-time / admin backfill: push Salesforce badges for learners who already have
   * an active local certificate/badge but were never synced via createbadgeforainexus.
   * Dedupes by salesforceAccountId (SF stores one badge per Account).
   */
  async backfillSalesforceBadgesForExistingLearners(options?: {
    dryRun?: boolean;
    limit?: number;
    delayMs?: number;
  }) {
    const dryRun = Boolean(options?.dryRun);
    const limitRaw = Number(options?.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 0;
    const delayRaw = Number(options?.delayMs);
    const delayMs =
      Number.isFinite(delayRaw) && delayRaw >= 0 ? Math.floor(delayRaw) : 250;

    const activeUserRows = await this.certificateRepository
      .createQueryBuilder('cert')
      .select('DISTINCT cert.userId', 'userId')
      .where('cert.status = :status', { status: CourseCertificateStatus.Active })
      .andWhere('cert.badgeBlocked = :badgeBlocked', { badgeBlocked: false })
      .getRawMany<{ userId: string }>();

    const userIds = activeUserRows
      .map((row) => String(row.userId || '').trim())
      .filter(Boolean);

    if (!userIds.length) {
      return {
        dryRun,
        totalActiveBadgeUsers: 0,
        eligible: 0,
        processed: 0,
        created: 0,
        alreadyExists: 0,
        failed: 0,
        skippedNoAccountId: 0,
        results: [] as Array<Record<string, unknown>>,
      };
    }

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'email', 'salesforceAccountId'],
    });

    const byAccountId = new Map<
      string,
      { userId: string; email: string | null; salesforceAccountId: string }
    >();
    let skippedNoAccountId = 0;

    for (const user of users) {
      const accountId = String(user.salesforceAccountId || '').trim();
      if (!accountId) {
        skippedNoAccountId += 1;
        continue;
      }
      if (!byAccountId.has(accountId)) {
        byAccountId.set(accountId, {
          userId: user.id,
          email: user.email ?? null,
          salesforceAccountId: accountId,
        });
      }
    }

    let candidates = Array.from(byAccountId.values());
    if (limit > 0) {
      candidates = candidates.slice(0, limit);
    }

    const results: Array<Record<string, unknown>> = [];
    let created = 0;
    let alreadyExists = 0;
    let failed = 0;

    console.log('[Salesforce Badge] Backfill start:', {
      dryRun,
      totalActiveBadgeUsers: userIds.length,
      eligible: candidates.length,
      skippedNoAccountId,
      limit: limit || null,
      delayMs,
    });

    for (let i = 0; i < candidates.length; i += 1) {
      const row = candidates[i];
      if (dryRun) {
        results.push({
          userId: row.userId,
          email: row.email,
          salesforceAccountId: row.salesforceAccountId,
          status: 'dry_run',
        });
        continue;
      }

      const outcome = await this.salesforceBadgeService.createBadgeForAccount(
        row.salesforceAccountId,
      );

      if (outcome.success && outcome.alreadyExists) {
        alreadyExists += 1;
        results.push({
          userId: row.userId,
          email: row.email,
          salesforceAccountId: row.salesforceAccountId,
          status: 'already_exists',
          message: outcome.message,
        });
      } else if (outcome.success) {
        created += 1;
        results.push({
          userId: row.userId,
          email: row.email,
          salesforceAccountId: row.salesforceAccountId,
          status: 'created',
          message: outcome.message,
        });
      } else {
        failed += 1;
        results.push({
          userId: row.userId,
          email: row.email,
          salesforceAccountId: row.salesforceAccountId,
          status: outcome.skipped ? 'skipped' : 'failed',
          message: outcome.message,
        });
      }

      if (delayMs > 0 && i < candidates.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const summary = {
      dryRun,
      totalActiveBadgeUsers: userIds.length,
      eligible: candidates.length,
      processed: dryRun ? 0 : results.length,
      created,
      alreadyExists,
      failed,
      skippedNoAccountId,
      results,
    };

    console.log('[Salesforce Badge] Backfill complete:', {
      dryRun: summary.dryRun,
      totalActiveBadgeUsers: summary.totalActiveBadgeUsers,
      eligible: summary.eligible,
      processed: summary.processed,
      created: summary.created,
      alreadyExists: summary.alreadyExists,
      failed: summary.failed,
      skippedNoAccountId: summary.skippedNoAccountId,
    });

    return summary;
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
      const watchedSeconds = moduleSections.reduce((sum, section) => {
        const progress = progressMap[section.id];
        return sum + Math.max(0, Number(progress?.watchedSeconds || 0));
      }, 0);
      return {
        moduleId: module.id,
        moduleTitle: module.title || 'Module',
        courseId,
        courseTitle,
        completedSections,
        totalSections: sectionRows.length,
        isModuleComplete: sectionRows.length > 0 && completedSections === sectionRows.length,
        cpeHours: computeCpeHoursFromWatchSeconds(watchedSeconds),
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
      const courseModules = await this.buildCourseTranscript(
        userId,
        course.id,
        CERTIFICATE_PROGRAMME_DISPLAY_TITLE,
      );
      transcript.push(
        ...courseModules
          .filter((module) => module.completedSections > 0)
          .map((module) => ({
            ...module,
            pillarIndex,
            courseTitle: CERTIFICATE_PROGRAMME_DISPLAY_TITLE,
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
        pillarCpeHours: [1, 2, 3].map((pillarIndex) => {
          const pillar = summary.pillarBreakdown.find((item) => item.pillarIndex === pillarIndex);
          return {
            pillarIndex,
            earnedCpeHours: pillar?.earnedCpeHours ?? 0,
          };
        }),
      };
    }
    const courseCpe = await this.courseSectionWatchProgressService.getCourseEarnedCpeHours(
      userId,
      row.courseId,
    );
    return {
      ...courseCpe,
      pillarCpeHours: [
        { pillarIndex: 1, earnedCpeHours: courseCpe.earnedCpeHours ?? 0 },
      ],
    };
  }

  async getUserCertificates(userId: string) {
    const rows = await this.certificateRepository.find({
      where: [
        { userId, status: CourseCertificateStatus.Active },
        { userId, status: CourseCertificateStatus.Blocked },
      ],
      relations: ['course', 'user'],
      order: { completedAt: 'DESC', createdAt: 'DESC' },
    });

    const visibleRows: CourseCertificateEntity[] = [];
    for (const row of rows) {
      // Always include rows with any block so learners see a proper message.
      if (row.certificateBlocked || row.badgeBlocked || row.status === CourseCertificateStatus.Blocked) {
        visibleRows.push(row);
        continue;
      }
      if (await this.shouldDisplayCredentialToLearner(userId, row)) {
        visibleRows.push(row);
      }
    }

    const bothBlockedMessage =
      'This certificate and digital badge are no longer available. Access has been revoked by an administrator.';
    const certificateBlockedMessage =
      'This certificate is no longer available. Access has been revoked by an administrator.';
    const badgeBlockedMessage =
      'This digital badge is no longer available. Access has been revoked by an administrator.';
    const allCertificatesHiddenMessage =
      'Certificates are temporarily unavailable. Please check back later.';
    const allBadgesHiddenMessage =
      'Digital badges are temporarily unavailable. Please check back later.';

    const visibility = await this.appSettingsService.getCredentialVisibilitySettings();
    const hideAllCertificates = Boolean(visibility.hideAllCertificates);
    const hideAllBadges = Boolean(visibility.hideAllBadges);

    return Promise.all(
      visibleRows.map(async (row) => {
        const courseTitle = row.programId
          ? CERTIFICATE_PROGRAMME_DISPLAY_TITLE
          : row.course?.title || 'Untitled Course';
        const learnerName =
          `${row.user?.firstname || ''} ${row.user?.lastname || ''}`.trim() ||
          row.user?.username ||
          'Learner';
        const perCertBlocked =
          !!row.certificateBlocked || row.status === CourseCertificateStatus.Blocked;
        const perBadgeBlocked =
          !!row.badgeBlocked || row.status === CourseCertificateStatus.Blocked;
        const certificateBlocked = hideAllCertificates || perCertBlocked;
        const badgeBlocked = hideAllBadges || perBadgeBlocked;
        const bothBlocked = certificateBlocked && badgeBlocked;

        let message: string | null = null;
        if (hideAllCertificates && hideAllBadges) {
          message =
            'Certificates and digital badges are temporarily unavailable. Please check back later.';
        } else if (certificateBlocked && badgeBlocked) {
          message = bothBlockedMessage;
        } else if (certificateBlocked) {
          message = hideAllCertificates
            ? allCertificatesHiddenMessage
            : certificateBlockedMessage;
        } else if (badgeBlocked) {
          message = hideAllBadges ? allBadgesHiddenMessage : badgeBlockedMessage;
        }

        const base = {
          id: row.id,
          courseId: row.courseId,
          programId: row.programId || null,
          certificateNo: row.certificateNo,
          completedAt: row.completedAt,
          createdAt: row.createdAt,
          courseTitle,
          programTitle: row.programId
            ? CERTIFICATE_PROGRAMME_DISPLAY_TITLE.replace(/\s+/g, ' ')
            : '',
          marketData: row.course?.marketData || '',
          learnerName,
          certificateBlocked,
          badgeBlocked,
          status: bothBlocked
            ? CourseCertificateStatus.Blocked
            : certificateBlocked || badgeBlocked
              ? 'partially_blocked'
              : CourseCertificateStatus.Active,
          message,
        };

        if (bothBlocked) {
          return {
            ...base,
            earnedCpeHours: 0,
            allocatedCpeHours: null,
            watchedTime: '',
            transcript: [],
            completedModules: [],
            pdfUrl: null,
          };
        }

        const [cpe, transcript] = await Promise.all([
          this.resolveCertificateCpeHours(userId, row),
          row.programId
            ? this.buildProgrammeTranscript(userId, row.programId)
            : this.buildCourseTranscript(userId, row.courseId, courseTitle),
        ]);
        const completedModules = transcript.filter((module) => module.isModuleComplete);

        return {
          ...base,
          earnedCpeHours: cpe.earnedCpeHours,
          allocatedCpeHours: cpe.allocatedCpeHours,
          watchedTime: cpe.watchedTime,
          transcript: certificateBlocked ? [] : transcript,
          completedModules: certificateBlocked ? [] : completedModules,
          pdfUrl: certificateBlocked ? null : row.pdfUrl || null,
        };
      }),
    );
  }

  private async buildCertificatePdfPayload(certificateId: string) {
    const row = await this.certificateRepository.findOne({
      where: { id: certificateId },
      relations: ['course', 'user'],
    });
    if (!row) {
      throw new NotFoundException('Certificate not found');
    }

    const courseTitle = row.programId
      ? CERTIFICATE_PROGRAMME_DISPLAY_TITLE
      : row.course?.title || 'Untitled Course';

    const [cpe, transcript, publicSettings, certTemplate] = await Promise.all([
      this.resolveCertificateCpeHours(row.userId, row),
      row.programId
        ? this.buildProgrammeTranscript(row.userId, row.programId)
        : this.buildCourseTranscript(row.userId, row.courseId, courseTitle),
      this.appSettingsService.getPublicSettings(),
      this.appSettingsService.getCertificateTemplateForPdf(),
    ]);

    const learnerName =
      `${row.user?.firstname || ''} ${row.user?.lastname || ''}`.trim() ||
      row.user?.username ||
      'Learner';

    return {
      row,
      payload: mergeCertificateTemplateIntoInput(
        {
          certificateNo: row.certificateNo,
          learnerName,
          courseTitle,
          programmeLevel: row.programId
            ? resolveCertificateProgrammeLevel(cpe.earnedCpeHours)
            : undefined,
          completedAt: row.completedAt,
          earnedCpeHours: cpe.earnedCpeHours,
          allocatedCpeHours: cpe.allocatedCpeHours,
          pillarCpeHours: cpe.pillarCpeHours,
          logoUrl: publicSettings?.logoUrl || null,
          transcript,
        },
        certTemplate,
      ),
    };
  }

  async ensureCertificatePdfStored(certificateId: string): Promise<CourseCertificateEntity> {
    const { row, payload } = await this.buildCertificatePdfPayload(certificateId);
    const { filename, buffer } = await buildCourseCertificatePdf(payload);

    if (row.pdfUrl) {
      await this.localStorageService.deleteFileByUrl(row.pdfUrl);
    }

    const pdfUrl = await this.localStorageService.saveBuffer(
      buffer,
      'course-certificates',
      `${row.certificateNo}-${row.id.slice(0, 8)}`,
      '.pdf',
    );
    row.pdfUrl = pdfUrl;
    return this.certificateRepository.save(row);
  }

  async getCertificatePdfForUser(
    userId: string,
    certificateId: string,
  ): Promise<{ filename: string; buffer: Buffer }> {
    const existing = await this.certificateRepository.findOne({
      where: { id: certificateId, userId },
    });
    if (!existing || existing.status === CourseCertificateStatus.Deleted) {
      throw new NotFoundException('Certificate not found');
    }
    const visibility = await this.appSettingsService.getCredentialVisibilitySettings();
    if (
      visibility.hideAllCertificates ||
      existing.certificateBlocked ||
      existing.status === CourseCertificateStatus.Blocked
    ) {
      throw new ForbiddenException(
        visibility.hideAllCertificates
          ? 'Certificates are temporarily unavailable. Please check back later.'
          : 'This certificate is no longer available. Access has been revoked by an administrator.',
      );
    }
    if (!(await this.shouldDisplayCredentialToLearner(userId, existing))) {
      throw new NotFoundException('Certificate not available');
    }

    return this.getCertificatePdfBuffer(certificateId);
  }

  /**
   * Build LinkedIn feed share text + URL for a learner credential (certificate or digital badge).
   */
  async getLinkedInShareForUser(
    userId: string,
    certificateId: string,
    kind: 'certificate' | 'badge' = 'certificate',
  ): Promise<{ kind: 'certificate' | 'badge'; text: string; url: string }> {
    const row = await this.certificateRepository.findOne({
      where: { id: certificateId, userId },
      relations: ['course'],
    });
    if (!row || row.status === CourseCertificateStatus.Deleted) {
      throw new NotFoundException('Certificate not found');
    }
    const visibility = await this.appSettingsService.getCredentialVisibilitySettings();
    const targetBlocked =
      kind === 'badge'
        ? visibility.hideAllBadges ||
          !!row.badgeBlocked ||
          row.status === CourseCertificateStatus.Blocked
        : visibility.hideAllCertificates ||
          !!row.certificateBlocked ||
          row.status === CourseCertificateStatus.Blocked;
    if (targetBlocked) {
      throw new ForbiddenException(
        kind === 'badge'
          ? visibility.hideAllBadges
            ? 'Digital badges are temporarily unavailable. Please check back later.'
            : 'This digital badge is no longer available. Access has been revoked by an administrator.'
          : visibility.hideAllCertificates
            ? 'Certificates are temporarily unavailable. Please check back later.'
            : 'This certificate is no longer available. Access has been revoked by an administrator.',
      );
    }
    if (!(await this.shouldDisplayCredentialToLearner(userId, row))) {
      throw new NotFoundException('Certificate not available');
    }

    const websiteUrl = 'https://ainexus.isca.org.sg/';
    // LinkedIn share text is plain text — use Unicode bold (HTML/markdown not supported).
    const boldProgramme = toLinkedInBoldText('AIxACCOUNTANCY');

    const text =
      kind === 'badge'
        ? [
            `I'm proud to have earned the ${boldProgramme} digital badge on AI Nexus. Another milestone in my professional learning journey.`,
            '',
            'I encourage you to join me on this learning journey and strengthen your AI skills for the future of accountancy.',
            '',
            'Issued by AI Nexus',
            row.certificateNo ? `Credential No.:  ${row.certificateNo}` : null,
          ]
            .filter((line) => line !== null)
            .join('\n')
        : [
            `I'm proud to have earned the ${boldProgramme} certificate on AI Nexus. Another milestone in my professional learning journey.`,
            '',
            'I encourage you to join me on this learning journey and strengthen your AI skills for the future of accountancy.',
            '',
            'Issued by AI Nexus',
            row.certificateNo ? `Certificate No.:  ${row.certificateNo}` : null,
          ]
            .filter((line) => line !== null)
            .join('\n');

    // Attach site as share preview so AI Nexus is reachable without printing the URL in the post body.
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}&url=${encodeURIComponent(websiteUrl)}`;

    return { kind, text, url };
  }

  /** PDF by certificate id (caller must enforce authz, e.g. corporate company scope). */
  async getCertificatePdfBuffer(
    certificateId: string,
  ): Promise<{ filename: string; buffer: Buffer }> {
    const existing = await this.certificateRepository.findOne({
      where: { id: certificateId },
    });
    if (!existing || existing.status === CourseCertificateStatus.Deleted) {
      throw new NotFoundException('Certificate not found');
    }

    // Always regenerate so font/layout design updates appear on download.
    const saved = await this.ensureCertificatePdfStored(certificateId);
    const stored = await this.localStorageService.readFileByUrl(saved.pdfUrl);
    if (!stored?.buffer?.length) {
      const { payload } = await this.buildCertificatePdfPayload(certificateId);
      return buildCourseCertificatePdf(payload);
    }
    return {
      filename: stored.fileName || `Certificate-${saved.certificateNo}.pdf`,
      buffer: stored.buffer,
    };
  }

  async getAdminCertificates(filters: {
    userName?: string;
    userId?: string;
    courseTitle?: string;
    courseId?: string;
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

    if (filters.courseId) {
      qb.andWhere('cert.courseId = :courseId', { courseId: String(filters.courseId).trim() });
    }

    if (filters.userId) {
      qb.andWhere('cert.userId = :userId', { userId: String(filters.userId).trim() });
    }

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
      certificateBlocked:
        !!row.certificateBlocked || row.status === CourseCertificateStatus.Blocked,
      badgeBlocked: !!row.badgeBlocked || row.status === CourseCertificateStatus.Blocked,
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

  async assertCourseContentDeletionAllowed(_courseId: string): Promise<void> {
    // Admin course content edits (delete modules/sections, video URL, watchtime) stay enabled.
  }

  async assertSectionDeletionAllowed(_courseId: string, _sectionId: string): Promise<void> {
    // Admin section delete stays enabled even when learners have completed the lesson.
  }

  async assertModuleDeletionAllowed(_courseId: string, _moduleId: string): Promise<void> {
    // Admin module delete stays enabled even when learners have completed lessons.
  }

  async assertSectionVideoSettingsEditAllowed(
    _courseId: string,
    _sectionId: string,
    _section: Pick<
      CourseModuleSectionEntity,
      'videoUrl' | 'watchtime' | 'durationTime' | 'completionPercentage'
    >,
    _dto: UpdateCourseModuleSectionDto,
  ): Promise<void> {
    // Admin video URL / watchtime / completion percentage edits stay enabled.
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
    if (existing.pdfUrl) {
      await this.localStorageService.deleteFileByUrl(existing.pdfUrl);
      existing.pdfUrl = null;
    }
    existing.status = CourseCertificateStatus.Deleted;
    existing.deletedAt = new Date();
    await this.certificateRepository.save(existing);
    return { deleted: true };
  }

  async blockCertificateById(
    id: string,
    targets: { certificate?: boolean; badge?: boolean } = {},
  ) {
    const existing = await this.certificateRepository.findOne({ where: { id } });
    if (!existing || existing.status === CourseCertificateStatus.Deleted) {
      return { blocked: false, certificateBlocked: false, badgeBlocked: false };
    }

    const blockBoth =
      targets.certificate === undefined && targets.badge === undefined;
    if (blockBoth || targets.certificate === true) {
      existing.certificateBlocked = true;
    }
    if (blockBoth || targets.badge === true) {
      existing.badgeBlocked = true;
    }

    this.syncCredentialBlockStatus(existing);
    await this.certificateRepository.save(existing);
    return {
      blocked: true,
      certificateBlocked: !!existing.certificateBlocked,
      badgeBlocked: !!existing.badgeBlocked,
    };
  }

  /**
   * Admin failed an assessment after provisional pass — hide cert/badge until
   * the learner passes again (re-submit auto-pass restores them before admin verify).
   */
  async revokeCredentialAfterAssessmentFail(
    userId: string,
    courseId: string,
  ): Promise<{ blocked: boolean }> {
    if (!userId || !courseId) return { blocked: false };

    let blocked = false;
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'programId'],
    });

    const blockIfActive = async (cert: CourseCertificateEntity | null) => {
      if (!cert || cert.status === CourseCertificateStatus.Deleted) return;
      if (cert.certificateBlocked && cert.badgeBlocked) return;
      cert.certificateBlocked = true;
      cert.badgeBlocked = true;
      this.syncCredentialBlockStatus(cert);
      await this.certificateRepository.save(cert);
      blocked = true;
    };

    await blockIfActive(
      await this.certificateRepository.findOne({ where: { userId, courseId } }),
    );

    // Always hide programme credential when any linked assessment is failed by admin.
    if (course?.programId) {
      const pillars = await this.getProgramPillarCourses(course.programId);
      if (pillars.pillar1) {
        const programCert = await this.certificateRepository.findOne({
          where: { userId, courseId: pillars.pillar1.id },
        });
        if (programCert?.programId === course.programId) {
          await blockIfActive(programCert);
        }
      }
    }

    return { blocked };
  }

  /**
   * Restore cert/badge after assessment is passed again (admin verify pass or learner resubmit).
   * `force` is used after admin manual pass so a previously blocked credential comes back.
   */
  async restoreCredentialAfterAssessmentPass(
    userId: string,
    courseId: string,
    options?: { force?: boolean },
  ): Promise<{ restored: boolean }> {
    if (!userId || !courseId) return { restored: false };

    const force = options?.force === true;
    let restored = false;

    // Normal sync/issue path (also regenerates PDF when reissued).
    try {
      const issued = await this.issueIfCourseCompleted(userId, courseId);
      if (issued.issued) restored = true;
    } catch (error) {
      console.error(
        `[certificate-restore] issueIfCourseCompleted failed for user=${userId} course=${courseId}:`,
        error instanceof Error ? error.message : error,
      );
    }

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'programId'],
    });

    const candidates: CourseCertificateEntity[] = [];
    const direct = await this.certificateRepository.findOne({ where: { userId, courseId } });
    if (direct) candidates.push(direct);

    if (course?.programId) {
      const pillars = await this.getProgramPillarCourses(course.programId);
      if (pillars.pillar1) {
        const programCert = await this.certificateRepository.findOne({
          where: { userId, courseId: pillars.pillar1.id },
        });
        if (programCert?.programId === course.programId) {
          candidates.push(programCert);
        }
      }
    }

    const seen = new Set<string>();
    for (const cert of candidates) {
      if (!cert?.id || seen.has(cert.id)) continue;
      seen.add(cert.id);
    // Restore when fully blocked, or when force is used for any blocked credential channel.
    const needsRestore =
      cert.status === CourseCertificateStatus.Blocked ||
      !!cert.certificateBlocked ||
      !!cert.badgeBlocked;
    if (!needsRestore) continue;

    let canRestore = force;
    if (!canRestore) {
      if (cert.programId) {
        canRestore = await this.isProgramCertificateRequirementsMet(userId, cert.programId);
      } else {
        canRestore = await this.isCourseFullyCompleted(userId, cert.courseId);
      }
    }
    if (!canRestore) continue;

    cert.status = CourseCertificateStatus.Active;
    this.clearCredentialBlocks(cert);
    cert.completedAt = new Date();
    cert.deletedAt = null;
    await this.certificateRepository.save(cert);
    restored = true;

      try {
        await this.ensureCertificatePdfStored(cert.id);
      } catch (error) {
        console.error(
          `[certificate-restore-pdf] failed for cert=${cert.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    return { restored };
  }

  async unblockCertificateById(
    id: string,
    targets: { certificate?: boolean; badge?: boolean } = {},
  ) {
    const existing = await this.certificateRepository.findOne({ where: { id } });
    if (!existing || existing.status === CourseCertificateStatus.Deleted) {
      return { unblocked: false, certificateBlocked: false, badgeBlocked: false };
    }

    const unblockBoth =
      targets.certificate === undefined && targets.badge === undefined;
    if (unblockBoth || targets.certificate === true) {
      existing.certificateBlocked = false;
    }
    if (unblockBoth || targets.badge === true) {
      existing.badgeBlocked = false;
    }

    this.syncCredentialBlockStatus(existing);
    await this.certificateRepository.save(existing);
    return {
      unblocked: true,
      certificateBlocked: !!existing.certificateBlocked,
      badgeBlocked: !!existing.badgeBlocked,
    };
  }
}
