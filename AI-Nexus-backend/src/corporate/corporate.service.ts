import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';

import { UserEntity, UserRole, UserStatus } from '../user/users.entity';
import { ProgramEntity, ProgramStatus } from '../program/programs.entity';
import { CourseEntity } from '../course/courses.entity';
import {
  CourseCertificateEntity,
  CourseCertificateStatus,
} from '../course/course-certificate.entity';
import { CourseSectionWatchProgressEntity } from '../course/course-section-watch-progress.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';
import { CourseSectionWatchProgressService } from '../course/course-section-watch-progress.service';
import { CourseQuizAssessmentProgressService } from '../course/course-quiz-assessment-progress.service';
import { CourseCertificateService } from '../course/course-certificate.service';
import { EmailService } from '../service/email.service';
import {
  computeCpeHoursFromWatchSeconds,
  resolveCoursePillarIndex,
} from '../course/course-program-cpe-summary.util';
import { CorporateLearnerNudgeEntity } from './corporate-learner-nudge.entity';

// ----------------------------------------------------------------------

const AT_RISK_INACTIVE_DAYS = 7;
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type CorporateLearnerStatus = 'Completed' | 'In Progress' | 'At Risk';

export type CorporatePillarProgress = {
  /** Earned CPE hours (0.5h floor rule — same as player/certificates). */
  c: number;
  /** Total pillar CPE hours from module duration (same 0.5h floor rule). */
  t: number;
  /** Actual watch hours (wall-clock). */
  w?: number;
  q?: boolean;
  a?: boolean;
  e?: boolean;
  /** Current module title within this pillar. */
  moduleTitle?: string | null;
  /** Current section (lesson) title within this pillar. */
  lessonTitle?: string | null;
};

export type CorporateLearnerRow = {
  userId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  eligibility: string;
  profession: string;
  status: CorporateLearnerStatus;
  lastActive: string;
  lastActiveAt: string | null;
  lastLogin: string;
  lastLoginAt: string | null;
  cert: boolean;
  certificateId: string | null;
  certificateNo: string | null;
  pending: string;
  p1: CorporatePillarProgress;
  p2: CorporatePillarProgress;
  p3: CorporatePillarProgress;
  lastNudgedAt: string | null;
  canNudge: boolean;
  nextNudgeAt: string | null;
};

type PillarLessonInfo = {
  courseId: string | null;
  courseTitle: string | null;
  moduleTitle: string | null;
  lessonTitle: string | null;
};

@Injectable()
export class CorporateService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProgramEntity)
    private readonly programRepository: Repository<ProgramEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(CourseCertificateEntity)
    private readonly certificateRepository: Repository<CourseCertificateEntity>,
    @InjectRepository(CourseSectionWatchProgressEntity)
    private readonly sectionWatchRepository: Repository<CourseSectionWatchProgressEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly courseModuleRepository: Repository<CourseModuleEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly courseModuleSectionRepository: Repository<CourseModuleSectionEntity>,
    @InjectRepository(CorporateLearnerNudgeEntity)
    private readonly nudgeRepository: Repository<CorporateLearnerNudgeEntity>,
    private readonly courseSectionWatchProgressService: CourseSectionWatchProgressService,
    private readonly courseQuizAssessmentProgressService: CourseQuizAssessmentProgressService,
    private readonly courseCertificateService: CourseCertificateService,
    private readonly emailService: EmailService,
  ) {}

  private buildNudgeState(lastNudgedAt: Date | null | undefined): {
    lastNudgedAt: string | null;
    canNudge: boolean;
    nextNudgeAt: string | null;
  } {
    if (!lastNudgedAt) {
      return { lastNudgedAt: null, canNudge: true, nextNudgeAt: null };
    }
    const nextAt = new Date(lastNudgedAt.getTime() + NUDGE_COOLDOWN_MS);
    const canNudge = Date.now() >= nextAt.getTime();
    return {
      lastNudgedAt: lastNudgedAt.toISOString(),
      canNudge,
      nextNudgeAt: canNudge ? null : nextAt.toISOString(),
    };
  }

  /** Prefer explicit code / env; never guess another company's UEN from the DB. */
  async resolveCompanyCode(requested?: string | null): Promise<string> {
    const trimmed = String(requested || '').trim();
    if (trimmed) return trimmed;

    return String(process.env.CORPORATE_PUBLIC_COMPANY_CODE || '').trim();
  }

  async getOverview(companyCodeRaw?: string) {
    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    const learners = await this.buildLearners(companyCode);
    const completed = learners.filter((l) => l.status === 'Completed').length;
    const atRisk = learners.filter((l) => l.status === 'At Risk').length;
    const certificatesReady = learners.filter((l) => l.cert).length;
    const total = learners.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      companyCode,
      metrics: {
        totalLearners: total,
        completed,
        atRisk,
        certificatesReady,
        completionRate,
      },
      actions: this.buildActions(learners),
      learnersPreview: learners.slice(0, 5),
    };
  }

  async getLearners(params: {
    companyCode?: string;
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const companyCode = await this.resolveCompanyCode(params.companyCode);
    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const limit = Number(params.limit) > 0 ? Math.min(Number(params.limit), 100) : 5;

    const users = await this.listCompanyUsers(companyCode, params.q);
    if (!users.length) {
      return {
        companyCode,
        data: [],
        pagination: { page: 1, limit, totalItems: 0, totalPages: 1 },
      };
    }

    const userIds = users.map((u) => u.id);
    const [certs, lastAccessMap] = await Promise.all([
      this.certificateRepository.find({
        where: {
          userId: In(userIds),
          status: CourseCertificateStatus.Active,
        },
        select: ['id', 'userId', 'programId', 'certificateNo', 'completedAt'],
      }),
      this.getLastAccessByUserIds(userIds),
    ]);

    const programId = await this.resolveDefaultProgramId();
    const certByUser = new Map<string, CourseCertificateEntity>();
    for (const cert of certs) {
      if (programId && cert.programId && cert.programId !== programId) continue;
      if (!certByUser.has(cert.userId)) certByUser.set(cert.userId, cert);
    }

    const statusFilter = String(params.status || '').trim();
    const filteredUsers = users.filter((user) => {
      if (!statusFilter || statusFilter === 'All statuses') return true;
      const status = this.resolveLightStatus(
        Boolean(certByUser.get(user.id)),
        lastAccessMap.get(user.id) || null,
      );
      return status === statusFilter;
    });

    const totalItems = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const pageUsers = filteredUsers.slice(start, start + limit);

    const data = await this.buildLearnersForUsers(pageUsers, {
      programId,
      certByUser,
      lastAccessMap,
    });

    return {
      companyCode,
      data,
      pagination: { page: safePage, limit, totalItems, totalPages },
    };
  }

  async getLearner(userId: string, companyCodeRaw?: string) {
    const id = String(userId || '').trim();
    if (!id) throw new NotFoundException('Learner not found');

    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    if (!companyCode) throw new NotFoundException('Learner not found for this company');

    const user = await this.userRepository
      .createQueryBuilder('u')
      .where('u.id = :id', { id })
      .andWhere('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code: companyCode })
      .andWhere('u.role = :role', { role: UserRole.User })
      .andWhere('u.isDraft = false')
      .andWhere('u.status = :status', { status: UserStatus.Active })
      .getOne();

    if (!user) throw new NotFoundException('Learner not found for this company');

    const rows = await this.buildLearnersForUsers([user]);
    const learner = rows[0];
    if (!learner) throw new NotFoundException('Learner not found for this company');

    return { companyCode, data: learner };
  }

  async nudgeLearner(userId: string, companyCodeRaw?: string) {
    const id = String(userId || '').trim();
    if (!id) throw new NotFoundException('Learner not found');

    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    if (!companyCode) throw new ForbiddenException('Company code is required');

    const user = await this.userRepository
      .createQueryBuilder('u')
      .where('u.id = :id', { id })
      .andWhere('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code: companyCode })
      .andWhere('u.role = :role', { role: UserRole.User })
      .andWhere('u.isDraft = false')
      .andWhere('u.status = :status', { status: UserStatus.Active })
      .getOne();

    if (!user) throw new NotFoundException('Learner not found for this company');
    const toEmail = String(user.email || '').trim();
    if (!toEmail) {
      throw new BadRequestException('Learner does not have an email address');
    }

    const existing = await this.nudgeRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId: id })
      .andWhere('LOWER(TRIM(n.companyCode)) = LOWER(:code)', { code: companyCode })
      .getOne();

    const nudgeState = this.buildNudgeState(existing?.lastNudgedAt);
    if (!nudgeState.canNudge) {
      throw new BadRequestException(
        `Nudge already sent. You can resend after ${nudgeState.nextNudgeAt}`,
      );
    }

    const rows = await this.buildLearnersForUsers([user]);
    const learner = rows[0];
    const learnerName =
      `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || 'Learner';

    await this.emailService.sendCorporateLearnerNudgeEmail({
      toEmail,
      learnerName,
      companyLabel: companyCode,
      pendingMessage: learner?.pending || '',
    });

    const now = new Date();
    if (existing) {
      existing.lastNudgedAt = now;
      existing.nudgeCount = Number(existing.nudgeCount || 0) + 1;
      existing.companyCode = companyCode;
      await this.nudgeRepository.save(existing);
    } else {
      await this.nudgeRepository.save(
        this.nudgeRepository.create({
          companyCode,
          userId: id,
          lastNudgedAt: now,
          nudgeCount: 1,
        }),
      );
    }

    const nextState = this.buildNudgeState(now);
    return {
      companyCode,
      message: 'Nudge email sent successfully',
      data: {
        userId: id,
        email: toEmail,
        ...nextState,
      },
    };
  }

  async exportLearnersCsv(params: {
    companyCode?: string;
    q?: string;
    status?: string;
  }): Promise<{ filename: string; csv: string }> {
    const companyCode = await this.resolveCompanyCode(params.companyCode);
    const learners = this.filterLearners(await this.buildLearners(companyCode), params);

    const formatPillarHours = (pillar?: CorporatePillarProgress) => {
      const earned = Number(pillar?.c) || 0;
      const total = Number(pillar?.t) || 0;
      const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
      return `${fmt(earned)}hr / ${fmt(total)}hr`;
    };

    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'Name',
      'Email',
      'Role',
      'Eligibility',
      'Status',
      'Pillar 1 Foundations',
      'Pillar 1 Module',
      'Pillar 1 Section',
      'Pillar 1 Quiz',
      'Pillar 1 Assessment',
      'Pillar 2 Specialisation',
      'Pillar 2 Module',
      'Pillar 2 Section',
      'Pillar 2 Quiz',
      'Pillar 2 Assessment',
      'Pillar 3 Leadership',
      'Pillar 3 Module',
      'Pillar 3 Section',
      'Pillar 3 Quiz',
      'Pillar 3 Assessment',
      'Certificate',
      'Certificate No',
      'Pending item',
      'Last Active',
    ];

    const formatQa = (ok?: boolean) => (ok ? 'Passed' : 'Pending');

    const lines = learners.map((s) =>
      [
        s.name,
        s.email,
        s.role,
        s.eligibility,
        s.status,
        formatPillarHours(s.p1),
        s.p1?.moduleTitle || '',
        s.p1?.lessonTitle || '',
        formatQa(s.p1?.q),
        formatQa(s.p1?.a),
        formatPillarHours(s.p2),
        s.p2?.moduleTitle || '',
        s.p2?.lessonTitle || '',
        formatQa(s.p2?.q),
        formatQa(s.p2?.a),
        formatPillarHours(s.p3),
        s.p3?.moduleTitle || '',
        s.p3?.lessonTitle || '',
        formatQa(s.p3?.q),
        formatQa(s.p3?.a),
        s.cert ? 'Yes' : 'No',
        s.certificateNo || '',
        s.pending,
        s.lastActive,
      ]
        .map(escape)
        .join(','),
    );

    const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`;
    const code = companyCode || 'corporate';
    const filename = `corporate-learner-progress-${code.replace(/[^a-z0-9_-]+/gi, '-')}.csv`;
    return { filename, csv };
  }

  private filterLearners(
    learners: CorporateLearnerRow[],
    params: { q?: string; status?: string },
  ): CorporateLearnerRow[] {
    let result = learners;
    const q = String(params.q || '').trim().toLowerCase();
    if (q) {
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.role.toLowerCase().includes(q) ||
          l.department.toLowerCase().includes(q),
      );
    }
    const statusFilter = String(params.status || '').trim();
    if (statusFilter && statusFilter !== 'All statuses') {
      result = result.filter((l) => l.status === statusFilter);
    }
    return result;
  }

  async getCertificates(params: {
    companyCode?: string;
    page?: number;
    limit?: number;
    availableOnly?: boolean;
  }) {
    const companyCode = await this.resolveCompanyCode(params.companyCode);
    const learners = await this.buildLearners(companyCode);
    let rows = learners.map((l) => ({
      userId: l.userId,
      name: l.name,
      email: l.email,
      status: l.status,
      certificateAvailable: l.cert,
      certificateId: l.certificateId,
      certificateNo: l.certificateNo,
      pending: l.pending,
      nextAction: l.cert ? 'No pending item' : l.pending,
    }));

    const availableTotal = rows.filter((r) => r.certificateAvailable && r.certificateId).length;
    if (params.availableOnly) {
      rows = rows.filter((r) => r.certificateAvailable && r.certificateId);
    }

    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const limit = Number(params.limit) > 0 ? Math.min(Number(params.limit), 100) : 5;
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const data = rows.slice(start, start + limit);

    return {
      companyCode,
      data,
      availableTotal,
      pagination: { page: safePage, limit, totalItems, totalPages },
    };
  }

  async downloadCertificatePdf(companyCodeRaw: string | undefined, certificateId: string) {
    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    if (!companyCode) {
      throw new ForbiddenException('Company code required');
    }
    const id = String(certificateId || '').trim();
    if (!id) {
      throw new NotFoundException('Certificate not found');
    }

    const cert = await this.certificateRepository.findOne({
      where: { id, status: CourseCertificateStatus.Active },
      select: ['id', 'userId', 'certificateNo', 'status'],
    });
    if (!cert) {
      throw new NotFoundException('Certificate not found');
    }

    const learner = await this.userRepository.findOne({
      where: { id: cert.userId, role: UserRole.User, isDraft: false },
      select: ['id', 'companyCode'],
    });
    const learnerCode = String(learner?.companyCode || '').trim().toLowerCase();
    if (!learner || learnerCode !== companyCode.toLowerCase()) {
      throw new ForbiddenException('Certificate is outside your company scope');
    }

    return this.courseCertificateService.getCertificatePdfBuffer(cert.id);
  }

  // ----------------------------------------------------------------------

  private async listCompanyUsers(companyCode: string, q?: string): Promise<UserEntity[]> {
    if (!companyCode) return [];

    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code: companyCode })
      .andWhere('u.role = :role', { role: UserRole.User })
      .andWhere('u.isDraft = false')
      .andWhere('u.status = :status', { status: UserStatus.Active })
      .orderBy('u.firstname', 'ASC')
      .addOrderBy('u.lastname', 'ASC');

    const search = String(q || '').trim().toLowerCase();
    if (search) {
      qb.andWhere(
        `(
          LOWER(CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, ''))) LIKE :q
          OR LOWER(COALESCE(u.email, '')) LIKE :q
          OR LOWER(COALESCE(u.username, '')) LIKE :q
          OR LOWER(COALESCE(u.financeRole, '')) LIKE :q
          OR LOWER(COALESCE(u.persona, '')) LIKE :q
        )`,
        { q: `%${search}%` },
      );
    }

    return qb.getMany();
  }

  private resolveLightStatus(
    hasCert: boolean,
    lastActiveAt: Date | null,
  ): CorporateLearnerStatus {
    if (hasCert) return 'Completed';
    const inactiveDays = lastActiveAt
      ? Math.floor((Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isInactive = inactiveDays == null || inactiveDays >= AT_RISK_INACTIVE_DAYS;
    if (isInactive) return 'At Risk';
    return 'In Progress';
  }

  private async buildLearners(companyCode: string): Promise<CorporateLearnerRow[]> {
    const users = await this.listCompanyUsers(companyCode);
    return this.buildLearnersForUsers(users);
  }

  private async buildLearnersForUsers(
    users: UserEntity[],
    preloaded?: {
      programId?: string | null;
      certByUser?: Map<string, CourseCertificateEntity>;
      lastAccessMap?: Map<string, Date>;
    },
  ): Promise<CorporateLearnerRow[]> {
    if (!users.length) return [];

    const programId =
      preloaded?.programId !== undefined
        ? preloaded.programId
        : await this.resolveDefaultProgramId();
    const pillarCourses = programId
      ? await this.getPillarCourses(programId)
      : new Map<number, CourseEntity>();
    const pillarCourseLists = programId
      ? await this.getPillarCourseLists(programId)
      : new Map<number, CourseEntity[]>();

    const userIds = users.map((u) => u.id);

    const [certs, lastAccessMap, lessonContext, summariesByUser] = await Promise.all([
      preloaded?.certByUser
        ? Promise.resolve([...preloaded.certByUser.values()])
        : this.certificateRepository.find({
            where: {
              userId: In(userIds),
              status: CourseCertificateStatus.Active,
            },
            select: ['id', 'userId', 'programId', 'certificateNo', 'completedAt'],
          }),
      preloaded?.lastAccessMap
        ? Promise.resolve(preloaded.lastAccessMap)
        : this.getLastAccessByUserIds(userIds),
      this.getLearnerLessonContext(userIds, pillarCourseLists),
      programId
        ? this.courseSectionWatchProgressService.getProgramPillarWatchSummariesForUsers(
            userIds,
            programId,
          )
        : Promise.resolve(new Map()),
    ]);

    const certByUser =
      preloaded?.certByUser ||
      (() => {
        const map = new Map<string, CourseCertificateEntity>();
        for (const cert of certs as CourseCertificateEntity[]) {
          if (programId && cert.programId && cert.programId !== programId) continue;
          if (!map.has(cert.userId)) map.set(cert.userId, cert);
        }
        return map;
      })();

    const qaCourseIds = new Set<string>();
    for (const course of pillarCourses.values()) qaCourseIds.add(course.id);
    for (const ctx of lessonContext.values()) {
      for (const lesson of ctx.byPillar.values()) {
        if (lesson.courseId) qaCourseIds.add(lesson.courseId);
      }
    }

    const qaByUserCourse = qaCourseIds.size
      ? await this.courseQuizAssessmentProgressService.getLearnerProgressBatch(
          userIds,
          [...qaCourseIds],
        )
      : new Map();

    const companyCode = String(users[0]?.companyCode || '').trim();
    const nudgeByUser = new Map<string, CorporateLearnerNudgeEntity>();
    if (companyCode && userIds.length) {
      const nudges = await this.nudgeRepository
        .createQueryBuilder('n')
        .where('n.userId IN (:...userIds)', { userIds })
        .andWhere('LOWER(TRIM(n.companyCode)) = LOWER(:code)', { code: companyCode })
        .getMany();
      for (const row of nudges) nudgeByUser.set(row.userId, row);
    }

    return Promise.all(
      users.map(async (user) => {
        const row = this.composeLearnerRow(
          user,
          pillarCourses,
          certByUser.get(user.id),
          lastAccessMap.get(user.id) || null,
          lessonContext.get(user.id) || { byPillar: new Map() },
          summariesByUser.get(user.id),
          qaByUserCourse,
        );
        const nudge = this.buildNudgeState(nudgeByUser.get(user.id)?.lastNudgedAt);
        return { ...row, ...nudge };
      }),
    );
  }

  private composeLearnerRow(
    user: UserEntity,
    pillarCourses: Map<number, CourseEntity>,
    cert: CourseCertificateEntity | undefined,
    lastActiveAt: Date | null,
    lessonContext: { byPillar: Map<number, PillarLessonInfo> },
    summary:
      | {
          pillarBreakdown?: Array<{
            pillarIndex: number;
            earnedCpeHours?: number;
            watchedHours?: number;
            totalVideoDurationSeconds?: number;
          }>;
        }
      | undefined,
    qaByUserCourse: Map<
      string,
      {
        allQuizzesCompleted: boolean;
        allAssignmentsCompleted: boolean;
        quizAssessmentCompleted: boolean;
      }
    >,
  ): CorporateLearnerRow {
    const emptyPillar = (): CorporatePillarProgress => ({
      c: 0,
      t: 0,
      w: 0,
      q: false,
      a: false,
      e: false,
      moduleTitle: null,
      lessonTitle: null,
    });
    let p1 = emptyPillar();
    let p2 = emptyPillar();
    let p3 = emptyPillar();

    for (const pillar of summary?.pillarBreakdown || []) {
      const durationSeconds = Number(pillar.totalVideoDurationSeconds ?? 0);
      const earned = Number(pillar.earnedCpeHours ?? 0);
      const watched = Number(pillar.watchedHours ?? 0);
      const totalCpe = computeCpeHoursFromWatchSeconds(durationSeconds);
      const progress: CorporatePillarProgress = {
        c: Math.round(earned * 100) / 100,
        t: Math.round(totalCpe * 100) / 100,
        w: Math.round(watched * 100) / 100,
        q: false,
        a: false,
        e: false,
        moduleTitle: null,
        lessonTitle: null,
      };

      const lesson = lessonContext.byPillar.get(pillar.pillarIndex);
      const fallbackCourse = pillarCourses.get(pillar.pillarIndex);
      const qaCourseId = lesson?.courseId || fallbackCourse?.id || null;
      if (qaCourseId) {
        const qa = qaByUserCourse.get(`${user.id}:${qaCourseId}`);
        progress.q = Boolean(qa?.allQuizzesCompleted);
        progress.a = Boolean(qa?.allAssignmentsCompleted);
        if (pillar.pillarIndex === 2) {
          progress.e = Boolean(qa?.quizAssessmentCompleted);
        }
      }

      if (pillar.pillarIndex === 1) p1 = progress;
      if (pillar.pillarIndex === 2) p2 = progress;
      if (pillar.pillarIndex === 3) p3 = progress;
    }

    const attachLesson = (
      pillar: CorporatePillarProgress,
      lesson?: PillarLessonInfo,
    ): CorporatePillarProgress => ({
      ...pillar,
      moduleTitle: lesson?.moduleTitle || null,
      lessonTitle: lesson?.lessonTitle || null,
    });

    p1 = attachLesson(p1, lessonContext.byPillar.get(1));
    p2 = attachLesson(p2, lessonContext.byPillar.get(2));
    p3 = attachLesson(p3, lessonContext.byPillar.get(3));

    const hasCert = Boolean(cert);
    const inactiveDays = lastActiveAt
      ? Math.floor((Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isInactive = inactiveDays == null || inactiveDays >= AT_RISK_INACTIVE_DAYS;

    let status: CorporateLearnerStatus = 'In Progress';
    if (hasCert) status = 'Completed';
    else if (isInactive) status = 'At Risk';

    const pending = this.buildPendingMessage({ hasCert, p1, p2, isInactive });
    const lastActiveLabel = this.formatLastActive(lastActiveAt);

    return {
      userId: user.id,
      name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || 'Learner',
      email: user.email || '',
      department: '—',
      role: user.financeRole || user.persona || '—',
      eligibility: this.formatEligibility(user),
      profession: user.financeRole ? 'Yes' : '—',
      status,
      lastActive: lastActiveLabel,
      lastActiveAt: lastActiveAt ? lastActiveAt.toISOString() : null,
      lastLogin: lastActiveLabel,
      lastLoginAt: lastActiveAt ? lastActiveAt.toISOString() : null,
      cert: hasCert,
      certificateId: cert?.id || null,
      certificateNo: cert?.certificateNo || null,
      pending,
      p1,
      p2,
      p3,
      lastNudgedAt: null,
      canNudge: true,
      nextNudgeAt: null,
    };
  }

  /**
   * Resolve each learner's current module + section per pillar
   * (latest lastAccessedAt within that pillar's courses).
   */
  private async getLearnerLessonContext(
    userIds: string[],
    pillarCourseLists: Map<number, CourseEntity[]>,
  ): Promise<Map<string, { byPillar: Map<number, PillarLessonInfo> }>> {
    const result = new Map<string, { byPillar: Map<number, PillarLessonInfo> }>();
    for (const userId of userIds) {
      result.set(userId, { byPillar: new Map() });
    }
    if (!userIds.length) return result;

    const courseById = new Map<string, { pillarIndex: number; title: string }>();
    for (const [pillarIndex, courses] of pillarCourseLists.entries()) {
      for (const course of courses) {
        courseById.set(course.id, {
          pillarIndex,
          title: String(course.title || '').trim() || 'Untitled course',
        });
      }
    }
    const courseIds = [...courseById.keys()];
    if (!courseIds.length) return result;

    const progressRows = await this.sectionWatchRepository
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.userId',
        'p.courseId',
        'p.sectionId',
        'p.lastAccessedAt',
        'p.completionPercent',
      ])
      .where('p.userId IN (:...userIds)', { userIds })
      .andWhere('p.courseId IN (:...courseIds)', { courseIds })
      .getMany();

    if (!progressRows.length) return result;

    // Pick best progress row per user+pillar (latest access, else highest completion).
    type BestRow = {
      userId: string;
      pillarIndex: number;
      courseId: string;
      sectionId: string;
      lastAccessedAt: number;
      completionPercent: number;
      courseTitle: string;
    };
    const bestByUserPillar = new Map<string, BestRow>();

    for (const row of progressRows) {
      const courseMeta = courseById.get(row.courseId);
      if (!courseMeta) continue;
      const accessedAt = row.lastAccessedAt ? new Date(row.lastAccessedAt).getTime() : 0;
      const completion = Number(row.completionPercent ?? 0) || 0;
      if (!accessedAt && completion <= 0) continue;

      const key = `${row.userId}:${courseMeta.pillarIndex}`;
      const candidate: BestRow = {
        userId: row.userId,
        pillarIndex: courseMeta.pillarIndex,
        courseId: row.courseId,
        sectionId: row.sectionId,
        lastAccessedAt: accessedAt,
        completionPercent: completion,
        courseTitle: courseMeta.title,
      };
      const existing = bestByUserPillar.get(key);
      if (!existing) {
        bestByUserPillar.set(key, candidate);
        continue;
      }
      if (candidate.lastAccessedAt !== existing.lastAccessedAt) {
        if (candidate.lastAccessedAt > existing.lastAccessedAt) bestByUserPillar.set(key, candidate);
        continue;
      }
      if (candidate.completionPercent > existing.completionPercent) {
        bestByUserPillar.set(key, candidate);
      }
    }

    const sectionIds = [...new Set([...bestByUserPillar.values()].map((r) => r.sectionId))];
    if (!sectionIds.length) return result;

    const sections = await this.courseModuleSectionRepository.find({
      where: { id: In(sectionIds) },
      select: ['id', 'moduleId', 'title', 'sortOrder'],
    });
    const sectionById = new Map(sections.map((s) => [s.id, s]));
    const moduleIds = [...new Set(sections.map((s) => s.moduleId))];
    const modules = moduleIds.length
      ? await this.courseModuleRepository.find({
          where: { id: In(moduleIds) },
          select: ['id', 'sortOrder', 'title'],
        })
      : [];
    const moduleById = new Map(modules.map((m) => [m.id, m]));

    for (const best of bestByUserPillar.values()) {
      const entry = result.get(best.userId);
      if (!entry) continue;

      const section = sectionById.get(best.sectionId);
      const module = section ? moduleById.get(section.moduleId) : undefined;
      const moduleTitle = String(module?.title || '').trim() || null;
      const lessonTitle = String(section?.title || '').trim() || best.courseTitle || null;

      entry.byPillar.set(best.pillarIndex, {
        courseId: best.courseId,
        courseTitle: best.courseTitle,
        moduleTitle,
        lessonTitle,
      });
    }

    return result;
  }

  private async resolveDefaultProgramId(): Promise<string | null> {
    const programs = await this.programRepository.find({
      where: { status: ProgramStatus.Active },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });
    for (const program of programs) {
      const count = await this.courseRepository.count({
        where: { programId: program.id, isBundle: false },
      });
      if (count > 0) return program.id;
    }
    const any = await this.courseRepository.findOne({
      where: { programId: Not(IsNull()), isBundle: false },
      select: ['programId'],
    });
    return any?.programId || null;
  }

  private async getPillarCourses(programId: string): Promise<Map<number, CourseEntity>> {
    const lists = await this.getPillarCourseLists(programId);
    const map = new Map<number, CourseEntity>();
    for (const [idx, courses] of lists.entries()) {
      if (courses[0]) map.set(idx, courses[0]);
    }
    return map;
  }

  private async getPillarCourseLists(programId: string): Promise<Map<number, CourseEntity[]>> {
    const courses = await this.courseRepository.find({
      where: { programId, isBundle: false },
      select: ['id', 'title', 'programPillarIndex', 'level', 'marketData', 'createdAt'],
      order: { programPillarIndex: 'ASC', createdAt: 'ASC' },
    });
    const map = new Map<number, CourseEntity[]>();
    for (const course of courses) {
      const idx = resolveCoursePillarIndex(course);
      if (!idx) continue;
      const list = map.get(idx) || [];
      list.push(course);
      map.set(idx, list);
    }
    return map;
  }

  private async getLastAccessByUserIds(userIds: string[]): Promise<Map<string, Date>> {
    const map = new Map<string, Date>();
    if (!userIds.length) return map;

    const rows = await this.sectionWatchRepository
      .createQueryBuilder('p')
      .select('p.userId', 'userId')
      .addSelect('MAX(p.lastAccessedAt)', 'lastAccessedAt')
      .where('p.userId IN (:...userIds)', { userIds })
      .andWhere('p.lastAccessedAt IS NOT NULL')
      .groupBy('p.userId')
      .getRawMany<{ userId: string; lastAccessedAt: Date | string }>();

    for (const row of rows) {
      const d = row.lastAccessedAt ? new Date(row.lastAccessedAt) : null;
      if (d && !Number.isNaN(d.getTime())) map.set(row.userId, d);
    }
    return map;
  }

  private formatEligibility(user: UserEntity): string {
    if (user.eligibilityIsSingaporePr === true) return 'Singaporean/PR';
    if (user.eligibilityIsIscaMember === true) return 'ISCA Member';
    if (user.eligibilityType) return String(user.eligibilityType);
    return '—';
  }

  private formatLastActive(date: Date | null): string {
    if (!date) return 'Never';
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${days} days ago`;
    return date.toLocaleDateString('en-SG');
  }

  private buildPendingMessage(input: {
    hasCert: boolean;
    p1: CorporatePillarProgress;
    p2: CorporatePillarProgress;
    isInactive: boolean;
  }): string {
    if (input.hasCert) return 'No pending items. Programme completion criteria met.';
    if (input.isInactive) {
      return 'Learner inactive. Nudge learner to continue Pillar 1 modules before starting an eligible specialisation.';
    }
    const p1Done = input.p1.t > 0 && input.p1.c >= input.p1.t && input.p1.q && input.p1.a;
    if (!p1Done) {
      const remaining = Math.max(0, Math.round((input.p1.t - input.p1.c) * 10) / 10);
      return `Complete ${remaining}h in Pillar 1, pass Pillar 1 quiz and assessment, then complete one eligible Pillar 2 specialisation with quiz and assessment.`;
    }
    if (!input.p2.e) {
      return 'Pillar 1 completed. Pending one eligible Pillar 2 specialisation module and its quiz/assessment.';
    }
    return 'Pending programme completion criteria.';
  }

  private buildActions(learners: CorporateLearnerRow[]): string[] {
    const inactive = learners.filter((l) => l.status === 'At Risk').length;
    const certs = learners.filter((l) => l.cert).length;
    const p1QuizDone = learners.filter((l) => Boolean(l.p1?.q)).length;
    const foreign = learners.filter((l) => {
      const e = String(l.eligibility || '').toLowerCase();
      return e.includes('foreign') || e === 'foreigner';
    }).length;

    return [
      `${p1QuizDone} learner${p1QuizDone === 1 ? '' : 's'} completed a Pillar 1 quiz`,
      `${certs} certificate${certs === 1 ? '' : 's'} became available for download`,
      foreign > 0
        ? `${foreign} foreign non-member learner${foreign === 1 ? '' : 's'} pending review`
        : 'No foreign non-member quotation request pending',
      `${inactive} learner${inactive === 1 ? ' has' : 's have'} been inactive for more than ${AT_RISK_INACTIVE_DAYS} days`,
    ];
  }
}
