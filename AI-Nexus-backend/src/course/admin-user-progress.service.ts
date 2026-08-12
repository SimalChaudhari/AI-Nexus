import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { CourseEntity } from './courses.entity';
import {
  CourseCertificateEntity,
  CourseCertificateStatus,
} from './course-certificate.entity';
import { CourseCertificateService } from './course-certificate.service';
import { CourseSectionWatchProgressService } from './course-section-watch-progress.service';
import { ProgramEntity, ProgramStatus } from '../program/programs.entity';
import { resolveProgramPillarIndexFromLevel } from './program-pillar.util';

export type AdminUserProgressFilter =
  | 'pillars_current'
  | 'badge_certificate'
  | 'pillars_100';

export type AdminUserProgressFlags = {
  pillarsCurrent: boolean;
  pillars100: boolean;
  hasBadgeCertificate: boolean;
  certificateNo: string;
  pillar1Percent: number;
  pillar2Percent: number;
  pillar3Percent: number;
};

const PROGRESS_CHUNK = 40;

@Injectable()
export class AdminUserProgressService {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(ProgramEntity)
    private readonly programRepository: Repository<ProgramEntity>,
    @InjectRepository(CourseCertificateEntity)
    private readonly certificateRepository: Repository<CourseCertificateEntity>,
    private readonly courseCertificateService: CourseCertificateService,
    private readonly courseSectionWatchProgressService: CourseSectionWatchProgressService,
  ) {}

  async resolveDefaultProgramId(): Promise<string | null> {
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

  async getBadgeCertificateUserIds(candidateUserIds?: string[]): Promise<Set<string>> {
    const qb = this.certificateRepository
      .createQueryBuilder('cert')
      .select('DISTINCT cert.userId', 'userId')
      .where('cert.status = :status', { status: CourseCertificateStatus.Active })
      .andWhere('cert.certificateBlocked = false')
      .andWhere('cert.badgeBlocked = false');

    if (candidateUserIds?.length) {
      qb.andWhere('cert.userId IN (:...userIds)', { userIds: candidateUserIds });
    }

    const rows = await qb.getRawMany<{ userId: string }>();
    return new Set(rows.map((row) => row.userId).filter(Boolean));
  }

  async filterUserIds(
    userIds: string[],
    filter: AdminUserProgressFilter,
  ): Promise<string[]> {
    if (!userIds.length) return [];

    if (filter === 'badge_certificate') {
      const matched = await this.getBadgeCertificateUserIds(userIds);
      return userIds.filter((id) => matched.has(id));
    }

    const programId = await this.resolveDefaultProgramId();
    if (!programId) return [];

    const pillars = await this.courseCertificateService.getProgramPillarsPublic(programId);
    if (!pillars.pillar1 || !pillars.pillar2) return [];

    const summaries =
      await this.courseSectionWatchProgressService.getProgramPillarWatchSummariesForUsers(
        userIds,
        programId,
      );

    const candidates: string[] = [];
    for (const userId of userIds) {
      const summary = summaries.get(userId);
      const byPillar = new Map(
        (summary?.pillarBreakdown || []).map((row) => [row.pillarIndex, row]),
      );
      const p1 = byPillar.get(1);
      if (!p1?.allVideosCompleted) continue;

      if (filter === 'pillars_100') {
        const p2 = byPillar.get(2);
        const p3 = byPillar.get(3);
        if (!p2?.allVideosCompleted) continue;
        if (pillars.pillar3 && !p3?.allVideosCompleted) continue;
      }

      candidates.push(userId);
    }

    if (!candidates.length) return [];

    const matched: string[] = [];
    for (let i = 0; i < candidates.length; i += PROGRESS_CHUNK) {
      const chunk = candidates.slice(i, i + PROGRESS_CHUNK);
      const flags = await Promise.all(
        chunk.map(async (userId) => {
          if (filter === 'pillars_current') {
            const ok =
              await this.courseCertificateService.checkProgramCertificateRequirementsMet(
                userId,
                programId,
              );
            return ok ? userId : null;
          }

          const p1Ok = await this.courseCertificateService.checkCourseFullyCompleted(
            userId,
            pillars.pillar1!.id,
          );
          if (!p1Ok) return null;
          const p2Ok = await this.courseCertificateService.checkCourseFullyCompleted(
            userId,
            pillars.pillar2!.id,
          );
          if (!p2Ok) return null;
          if (pillars.pillar3) {
            const p3Ok = await this.courseCertificateService.checkCourseFullyCompleted(
              userId,
              pillars.pillar3.id,
            );
            if (!p3Ok) return null;
          }
          return userId;
        }),
      );
      for (const id of flags) {
        if (id) matched.push(id);
      }
    }

    const matchedSet = new Set(matched);
    return userIds.filter((id) => matchedSet.has(id));
  }

  async buildProgressFlags(userIds: string[]): Promise<Map<string, AdminUserProgressFlags>> {
    const result = new Map<string, AdminUserProgressFlags>();
    for (const userId of userIds) {
      result.set(userId, {
        pillarsCurrent: false,
        pillars100: false,
        hasBadgeCertificate: false,
        certificateNo: '',
        pillar1Percent: 0,
        pillar2Percent: 0,
        pillar3Percent: 0,
      });
    }
    if (!userIds.length) return result;

    const [badgeIds, programId, certs] = await Promise.all([
      this.getBadgeCertificateUserIds(userIds),
      this.resolveDefaultProgramId(),
      this.certificateRepository.find({
        where: {
          userId: In(userIds),
          status: CourseCertificateStatus.Active,
          certificateBlocked: false,
          badgeBlocked: false,
        },
        select: ['userId', 'certificateNo', 'completedAt'],
        order: { completedAt: 'DESC' },
      }),
    ]);

    const certNoByUser = new Map<string, string>();
    for (const cert of certs) {
      if (!certNoByUser.has(cert.userId)) {
        certNoByUser.set(cert.userId, cert.certificateNo || '');
      }
    }

    for (const userId of userIds) {
      const flags = result.get(userId)!;
      flags.hasBadgeCertificate = badgeIds.has(userId);
      flags.certificateNo = certNoByUser.get(userId) || '';
    }

    if (!programId) return result;

    const pillars = await this.courseCertificateService.getProgramPillarsPublic(programId);
    const summaries =
      await this.courseSectionWatchProgressService.getProgramPillarWatchSummariesForUsers(
        userIds,
        programId,
      );

    const percentFromPillar = (row?: {
      watchedSeconds?: number;
      totalVideoDurationSeconds?: number;
      allVideosCompleted?: boolean;
    }) => {
      if (!row) return 0;
      if (row.allVideosCompleted) return 100;
      const total = Number(row.totalVideoDurationSeconds || 0);
      const watched = Number(row.watchedSeconds || 0);
      if (total <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round((watched / total) * 100)));
    };

    for (const userId of userIds) {
      const flags = result.get(userId)!;
      const byPillar = new Map(
        (summaries.get(userId)?.pillarBreakdown || []).map((row) => [row.pillarIndex, row]),
      );
      flags.pillar1Percent = percentFromPillar(byPillar.get(1));
      flags.pillar2Percent = percentFromPillar(byPillar.get(2));
      flags.pillar3Percent = percentFromPillar(byPillar.get(3));
    }

    for (let i = 0; i < userIds.length; i += PROGRESS_CHUNK) {
      const chunk = userIds.slice(i, i + PROGRESS_CHUNK);
      await Promise.all(
        chunk.map(async (userId) => {
          const flags = result.get(userId)!;
          const byPillar = new Map(
            (summaries.get(userId)?.pillarBreakdown || []).map((row) => [row.pillarIndex, row]),
          );
          if (byPillar.get(1)?.allVideosCompleted && pillars.pillar1 && pillars.pillar2) {
            flags.pillarsCurrent =
              await this.courseCertificateService.checkProgramCertificateRequirementsMet(
                userId,
                programId,
              );
          }

          const needsP3 = Boolean(pillars.pillar3);
          const videosOk =
            Boolean(byPillar.get(1)?.allVideosCompleted) &&
            Boolean(byPillar.get(2)?.allVideosCompleted) &&
            (!needsP3 || Boolean(byPillar.get(3)?.allVideosCompleted));
          if (videosOk && pillars.pillar1 && pillars.pillar2) {
            const p1Ok = await this.courseCertificateService.checkCourseFullyCompleted(
              userId,
              pillars.pillar1.id,
            );
            const p2Ok =
              p1Ok &&
              (await this.courseCertificateService.checkCourseFullyCompleted(
                userId,
                pillars.pillar2.id,
              ));
            const p3Ok =
              !needsP3 ||
              (p2Ok &&
                (await this.courseCertificateService.checkCourseFullyCompleted(
                  userId,
                  pillars.pillar3!.id,
                )));
            flags.pillars100 = Boolean(p1Ok && p2Ok && p3Ok);
          }
        }),
      );
    }

    return result;
  }

  /** Ensure courses have pillar indexes resolved (same rules as certificate service). */
  async ensurePillarIndexes(programId: string): Promise<void> {
    const courses = await this.courseRepository.find({
      where: { programId, isBundle: false },
      select: ['id', 'level', 'programPillarIndex'],
    });
    for (const course of courses) {
      if (course.programPillarIndex) continue;
      const derived = resolveProgramPillarIndexFromLevel(course.level);
      if (derived) {
        await this.courseRepository.update(course.id, { programPillarIndex: derived });
      }
    }
  }
}
