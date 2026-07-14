import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { CourseSectionWatchProgressService } from '../course/course-section-watch-progress.service';
import { CourseQuizAssessmentProgressService } from '../course/course-quiz-assessment-progress.service';
import { CourseCertificateService } from '../course/course-certificate.service';
import {
  computeCpeHoursFromWatchSeconds,
  resolveCoursePillarIndex,
} from '../course/course-program-cpe-summary.util';

// ----------------------------------------------------------------------

const AT_RISK_INACTIVE_DAYS = 7;

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
  cert: boolean;
  certificateId: string | null;
  certificateNo: string | null;
  pending: string;
  p1: CorporatePillarProgress;
  p2: CorporatePillarProgress;
  p3: CorporatePillarProgress;
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
    private readonly courseSectionWatchProgressService: CourseSectionWatchProgressService,
    private readonly courseQuizAssessmentProgressService: CourseQuizAssessmentProgressService,
    private readonly courseCertificateService: CourseCertificateService,
  ) {}

  /** Public for now — later restrict to Corporate role. */
  async resolveCompanyCode(requested?: string | null): Promise<string> {
    const trimmed = String(requested || '').trim();
    if (trimmed) return trimmed;

    const envDefault = String(process.env.CORPORATE_PUBLIC_COMPANY_CODE || '').trim();
    if (envDefault) return envDefault;

    const row = await this.userRepository
      .createQueryBuilder('u')
      .select('u.companyCode', 'companyCode')
      .addSelect('COUNT(*)', 'cnt')
      .where('u.companyCode IS NOT NULL')
      .andWhere("TRIM(u.companyCode) <> ''")
      .andWhere('u.role = :role', { role: UserRole.User })
      .andWhere('u.isDraft = false')
      .groupBy('u.companyCode')
      .orderBy('cnt', 'DESC')
      .limit(1)
      .getRawOne<{ companyCode: string }>();

    return String(row?.companyCode || '').trim();
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
      learnersPreview: learners.slice(0, 8),
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
    const learners = this.filterLearners(await this.buildLearners(companyCode), params);

    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const limit = Number(params.limit) > 0 ? Math.min(Number(params.limit), 100) : 5;
    const totalItems = learners.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const data = learners.slice(start, start + limit);

    return {
      companyCode,
      data,
      pagination: { page: safePage, limit, totalItems, totalPages },
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
      'Pillar 2 Specialisation',
      'Pillar 3 Leadership',
      'Certificate',
      'Certificate No',
      'Pending item',
      'Last Active',
    ];

    const lines = learners.map((s) =>
      [
        s.name,
        s.email,
        s.role,
        s.eligibility,
        s.status,
        formatPillarHours(s.p1),
        formatPillarHours(s.p2),
        formatPillarHours(s.p3),
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

  async getCertificates(companyCodeRaw?: string) {
    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    const learners = await this.buildLearners(companyCode);

    return {
      companyCode,
      data: learners.map((l) => ({
        userId: l.userId,
        name: l.name,
        email: l.email,
        status: l.status,
        certificateAvailable: l.cert,
        certificateId: l.certificateId,
        certificateNo: l.certificateNo,
        pending: l.pending,
        nextAction: l.cert ? 'No pending item' : l.pending,
      })),
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

  private async buildLearners(companyCode: string): Promise<CorporateLearnerRow[]> {
    if (!companyCode) return [];

    const users = await this.userRepository
      .createQueryBuilder('u')
      .where('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code: companyCode })
      .andWhere('u.role = :role', { role: UserRole.User })
      .andWhere('u.isDraft = false')
      .andWhere('u.status = :status', { status: UserStatus.Active })
      .orderBy('u.firstname', 'ASC')
      .addOrderBy('u.lastname', 'ASC')
      .getMany();

    if (!users.length) return [];

    const programId = await this.resolveDefaultProgramId();
    const pillarCourses = programId ? await this.getPillarCourses(programId) : new Map<number, CourseEntity>();

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

    const certByUser = new Map<string, CourseCertificateEntity>();
    for (const cert of certs) {
      if (programId && cert.programId && cert.programId !== programId) continue;
      if (!certByUser.has(cert.userId)) certByUser.set(cert.userId, cert);
    }

    const rows: CorporateLearnerRow[] = [];
    for (const user of users) {
      rows.push(
        await this.buildLearnerRow(user, programId, pillarCourses, certByUser.get(user.id), lastAccessMap.get(user.id) || null),
      );
    }
    return rows;
  }

  private async buildLearnerRow(
    user: UserEntity,
    programId: string | null,
    pillarCourses: Map<number, CourseEntity>,
    cert: CourseCertificateEntity | undefined,
    lastActiveAt: Date | null,
  ): Promise<CorporateLearnerRow> {
    const emptyPillar = (): CorporatePillarProgress => ({ c: 0, t: 0, w: 0, q: false, a: false, e: false });
    let p1 = emptyPillar();
    let p2 = emptyPillar();
    let p3 = emptyPillar();

    if (programId) {
      const summary = await this.courseSectionWatchProgressService.getProgramPillarWatchSummary(
        user.id,
        programId,
      );
      for (const pillar of summary.pillarBreakdown || []) {
        // Both sides use CPE 0.5h floor on seconds (same as player/certificates):
        // c = earned from watch, t = total from all module durations.
        // w = raw wall-clock watch hours (exports / debugging).
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
        };

        const course = pillarCourses.get(pillar.pillarIndex);
        if (course) {
          const qa = await this.courseQuizAssessmentProgressService.getLearnerProgress(user.id, course.id);
          progress.q = Boolean(qa.allQuizzesCompleted);
          progress.a = Boolean(qa.allAssignmentsCompleted);
          if (pillar.pillarIndex === 2) {
            progress.e = Boolean(qa.quizAssessmentCompleted);
          }
        }

        if (pillar.pillarIndex === 1) p1 = progress;
        if (pillar.pillarIndex === 2) p2 = progress;
        if (pillar.pillarIndex === 3) p3 = { c: progress.c, t: progress.t, w: progress.w };
      }
    }

    const hasCert = Boolean(cert);
    const inactiveDays = lastActiveAt
      ? Math.floor((Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isInactive = inactiveDays == null || inactiveDays >= AT_RISK_INACTIVE_DAYS;

    let status: CorporateLearnerStatus = 'In Progress';
    if (hasCert) status = 'Completed';
    else if (isInactive) status = 'At Risk';

    const pending = this.buildPendingMessage({ hasCert, p1, p2, isInactive });

    return {
      userId: user.id,
      name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || 'Learner',
      email: user.email || '',
      department: '—',
      role: user.financeRole || user.persona || '—',
      eligibility: this.formatEligibility(user),
      profession: user.financeRole ? 'Yes' : '—',
      status,
      lastActive: this.formatLastActive(lastActiveAt),
      lastActiveAt: lastActiveAt ? lastActiveAt.toISOString() : null,
      cert: hasCert,
      certificateId: cert?.id || null,
      certificateNo: cert?.certificateNo || null,
      pending,
      p1,
      p2,
      p3,
    };
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
    const courses = await this.courseRepository.find({
      where: { programId, isBundle: false },
      select: ['id', 'title', 'programPillarIndex', 'level', 'marketData', 'createdAt'],
      order: { programPillarIndex: 'ASC', createdAt: 'ASC' },
    });
    const map = new Map<number, CourseEntity>();
    for (const course of courses) {
      const idx = resolveCoursePillarIndex(course);
      if (!idx || map.has(idx)) continue;
      map.set(idx, course);
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
