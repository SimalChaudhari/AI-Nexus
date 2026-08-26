import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';
import { computeCpeHoursFromWatchSeconds } from '../course/course-program-cpe-summary.util';
import { buildCourseCertificatePdf } from '../course/utils/certificate-pdf.util';
import {
  CERTIFICATE_PROGRAMME_DISPLAY_TITLE,
  mergeCertificateTemplateIntoInput,
} from '../course/utils/certificate-pdf-shared.util';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { InternationalMembershipType } from '../intl-auth/international-user.entity';
import { InternationalUserEntity } from '../intl-auth/international-user.entity';
import { IntlPathwayCertificateEntity, IntlPathwayCertificateStatus } from './intl-pathway-certificate.entity';
import { IntlPathwayModuleEntity } from './intl-pathway-module.entity';
import { INTL_PATHWAY_MODULE_SEED } from './intl-pathway-seed';
import { UpdateIntlPathwayWatchProgressDto } from './intl-pathway-watch-progress.dto';
import { IntlPathwayWatchProgressEntity } from './intl-pathway-watch-progress.entity';

function parseCoverageRangePairs(raw: unknown): [number, number][] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: [number, number][] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const a = Number(item[0]);
    const b = Number(item[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    out.push([a, b]);
  }
  return out;
}

function mergeCoverageRanges(ranges: [number, number][]): [number, number][] {
  if (!ranges.length) return [];
  // Close tiny holes from client play/pause / poll jitter (same as Fort).
  const GAP_FILL_SEC = 0.75;
  const sorted = ranges
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number])
    .filter(([s, e]) => e > s && Number.isFinite(s) && Number.isFinite(e))
    .sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (!last || s > last[1] + GAP_FILL_SEC) out.push([s, e]);
    else last[1] = Math.max(last[1], e);
  }
  return out;
}

function clipCoverageRangesToDuration(ranges: [number, number][], duration: number): [number, number][] {
  if (duration <= 0) return mergeCoverageRanges(ranges);
  const clipped: [number, number][] = [];
  for (const [s0, e0] of ranges) {
    const lo = Math.min(s0, e0);
    const hi = Math.max(s0, e0);
    const s = Math.max(0, lo);
    const e = Math.min(duration, hi);
    if (e > s) clipped.push([s, e]);
  }
  return mergeCoverageRanges(clipped);
}

function roundedVideoDurationSeconds(duration: number): number {
  return Math.max(0, Math.round(Number(duration) || 0));
}

function isPlaybackAtVideoEnd(position: number, duration: number, ended = false): boolean {
  if (ended) return true;
  const totalSec = roundedVideoDurationSeconds(duration);
  if (totalSec <= 0) return false;
  const positionSec = Math.max(0, Number(position) || 0);
  return Math.ceil(positionSec) >= totalSec;
}

function computeUnwatchedGapSeconds(ranges: [number, number][], duration: number): number {
  const dur = roundedVideoDurationSeconds(duration);
  if (dur <= 0) return 0;
  const watched = clipCoverageRangesToDuration(ranges, dur);
  if (!watched.length) return dur;
  let cursor = 0;
  let gapTotal = 0;
  for (const [start, end] of watched) {
    if (start > cursor + 0.25) gapTotal += start - cursor;
    cursor = Math.max(cursor, end);
  }
  if (cursor < dur - 0.25) gapTotal += dur - cursor;
  return gapTotal;
}

function sealCoverageRangesToVideoEnd(ranges: [number, number][], duration: number): [number, number][] {
  const dur = roundedVideoDurationSeconds(duration);
  if (dur <= 0) return mergeCoverageRanges(ranges);
  const merged = clipCoverageRangesToDuration(ranges, dur);
  if (!merged.length) return merged;
  const last = merged[merged.length - 1];
  if (Math.ceil(last[1]) >= dur - 1) last[1] = dur;
  return merged;
}

function sealCoverageRangesWhenComplete(ranges: [number, number][], duration: number): [number, number][] {
  const dur = roundedVideoDurationSeconds(duration);
  if (dur <= 0) return mergeCoverageRanges(ranges);
  const clipped = clipCoverageRangesToDuration(ranges, dur);
  if (computeUnwatchedGapSeconds(clipped, dur) >= 1) return clipped;
  return [[0, dur]];
}

function coverageMeasureSeconds(ranges: [number, number][], maxDuration: number): number {
  const duration = roundedVideoDurationSeconds(maxDuration);
  const merged = duration > 0 ? clipCoverageRangesToDuration(ranges, duration) : mergeCoverageRanges(ranges);
  if (duration > 0 && computeUnwatchedGapSeconds(merged, duration) < 1) {
    return duration;
  }
  let total = 0;
  for (const [s, e] of merged) total += e - s;
  // Keep fractional unique coverage (2dp) — do not Math.round away real watch time.
  const measured = Number(Math.max(0, total).toFixed(2));
  return duration > 0 ? Math.min(duration, measured) : measured;
}

function normalizeVideoUrl(url?: string | null): string {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '')
    .split('?')[0]
    .split('#')[0]
    .toLowerCase();
}

/** Fort: catalog watchtime ∩ real duration — but ignore short catalog placeholders. */
function resolveRequiredSeconds(moduleMinutes: number, durationSeconds: number): number {
  const full = Math.max(0, Math.floor(durationSeconds || 0));
  const fromMinutes = Math.max(0, Math.floor(Number(moduleMinutes) || 0) * 60);
  if (fromMinutes > 0 && full > 0) {
    // Catalog minutes often under-report Spotlightr length (e.g. 8m catalog vs ~29m file).
    // Do not mark Complete until unique coverage reaches the real timeline.
    if (full > fromMinutes + 120) return full;
    return Math.min(fromMinutes, full);
  }
  if (full > 0) return full;
  return fromMinutes;
}

function buildComputed(lastPositionSeconds: number, watchedSeconds: number, durationSeconds: number) {
  const duration = Math.max(0, Math.round(Number(durationSeconds) || 0));
  const watchedRaw = Math.max(0, Number(watchedSeconds) || 0);
  const watched = duration > 0 ? Math.min(duration, watchedRaw) : watchedRaw;
  // Fort: lastPosition stays float — never Math.round / Math.floor the playhead.
  const lastPositionRaw = Math.max(0, Number(lastPositionSeconds) || 0);
  const lastPosition = duration > 0 ? Math.min(duration, lastPositionRaw) : lastPositionRaw;
  const remaining = Math.max(0, Number((duration - watched).toFixed(2)));
  const percent = duration > 0 ? Number(((watched / duration) * 100).toFixed(2)) : 0;
  return { duration, watched, lastPosition, remaining, percent };
}

@Injectable()
export class IntlPathwayWatchProgressService {
  constructor(
    @InjectRepository(IntlPathwayWatchProgressEntity)
    private readonly progressRepository: Repository<IntlPathwayWatchProgressEntity>,
    @InjectRepository(IntlPathwayModuleEntity)
    private readonly moduleRepository: Repository<IntlPathwayModuleEntity>,
    @InjectRepository(IntlPathwayCertificateEntity)
    private readonly certificateRepository: Repository<IntlPathwayCertificateEntity>,
    @InjectRepository(InternationalUserEntity)
    private readonly userRepository: Repository<InternationalUserEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly sectionRepository: Repository<CourseModuleSectionEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly courseModuleRepository: Repository<CourseModuleEntity>,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  toPublic(row: IntlPathwayWatchProgressEntity | null) {
    if (!row) return null;
    const duration = Math.max(
      0,
      Number(row.durationSeconds) || 0,
      Number(row.videoDurationSeconds) || 0,
    );
    const ranges = parseCoverageRangePairs(row.watchedCoverageRanges);
    const lastPos = Number(row.lastPositionSeconds) || 0;
    const sealedRanges = isPlaybackAtVideoEnd(lastPos, duration)
      ? sealCoverageRangesToVideoEnd(ranges, duration)
      : ranges;
    const watchedFromCoverage =
      sealedRanges.length > 0
        ? coverageMeasureSeconds(sealedRanges, duration)
        : Math.max(0, Number(row.watchedSeconds) || 0);
    const watched = row.isCompleted
      ? Math.max(watchedFromCoverage, Number(row.watchedSeconds) || 0)
      : sealedRanges.length > 0
        ? watchedFromCoverage
        : Math.max(0, Number(row.watchedSeconds) || 0);
    const computed = buildComputed(lastPos, watched, duration);
    const required =
      Number(row.requiredSeconds) > 0
        ? Number(row.requiredSeconds)
        : resolveRequiredSeconds(0, duration);
    return {
      id: row.id,
      code: row.pathwayCode,
      pathwayCode: row.pathwayCode,
      courseId: row.courseId,
      moduleId: row.moduleId,
      sectionId: row.sectionId,
      lastPositionSeconds: computed.lastPosition,
      watchedSeconds: computed.watched,
      watchedCoverageRanges: sealedRanges.length
        ? sealedRanges
        : watched > 0 && duration > 0
          ? ([[0, Math.min(watched, duration)]] as [number, number][])
          : [],
      durationSeconds: computed.duration,
      videoDurationSeconds: Number(row.videoDurationSeconds) || computed.duration,
      remainingSeconds: computed.remaining,
      requiredSeconds: required,
      completionPercent: computed.percent,
      isCompleted: Boolean(row.isCompleted),
      isWatched: Boolean(row.isCompleted),
      sourceVideoUrl: row.sourceVideoUrl || null,
      lastAccessedAt: row.lastAccessedAt,
    };
  }

  private async dropStaleProgressIfVideoUrlChanged(
    row: IntlPathwayWatchProgressEntity | undefined,
    moduleVideoUrl?: string | null,
  ): Promise<IntlPathwayWatchProgressEntity | undefined> {
    if (!row) return undefined;
    const currentUrl = normalizeVideoUrl(moduleVideoUrl);
    const storedUrl = normalizeVideoUrl(row.sourceVideoUrl);
    if (storedUrl && currentUrl && storedUrl !== currentUrl) {
      await this.progressRepository.delete({ id: row.id });
      return undefined;
    }
    if (!storedUrl && currentUrl) {
      row.sourceVideoUrl = currentUrl.slice(0, 500);
      await this.progressRepository.update({ id: row.id }, { sourceVideoUrl: row.sourceVideoUrl });
    }
    return row;
  }

  async getByModuleCode(userId: string, code: string) {
    const pathway = await this.requireModule(code);
    const pathwayCode = String(pathway.code || '').trim();
    let row = await this.progressRepository.findOne({
      where: { userId, pathwayCode },
    });
    // Legacy rows keyed only by LMS section before pathwayCode existed.
    // Never reuse another pathway module's row (shared/mis-mapped sectionId).
    if (!row && pathway.courseId && pathway.sectionId) {
      const legacy = await this.progressRepository.findOne({
        where: {
          userId,
          courseId: String(pathway.courseId),
          sectionId: String(pathway.sectionId),
        },
      });
      const legacyCode = String(legacy?.pathwayCode || '').trim();
      if (legacy && (!legacyCode || legacyCode === pathwayCode)) {
        if (!legacyCode) {
          legacy.pathwayCode = pathwayCode;
          row = await this.progressRepository.save(legacy);
        } else {
          row = legacy;
        }
      }
    }
    row =
      (await this.dropStaleProgressIfVideoUrlChanged(row ?? undefined, pathway.videoUrl)) ?? null;
    return this.toPublic(row);
  }

  async listByUser(userId: string) {
    const rows = await this.progressRepository.find({ where: { userId } });
    const pathwayModules = await this.moduleRepository.find({ where: { deleted: false } });
    const validCodes = new Set(pathwayModules.map((m) => String(m.code)));
    const byCode: Record<string, ReturnType<IntlPathwayWatchProgressService['toPublic']>> = {};

    // Primary: one row per pathway code (Fort: one row per section id).
    rows.forEach((row) => {
      const code = String(row.pathwayCode || '').trim();
      if (!code || !validCodes.has(code)) return;
      byCode[code] = this.toPublic(row);
    });

    // Legacy fallback: map by unique sectionId only when pathwayCode missing.
    const codeBySection = new Map<string, string>();
    pathwayModules.forEach((m) => {
      if (!m.sectionId || byCode[m.code]) return;
      const sid = String(m.sectionId);
      if (codeBySection.has(sid)) {
        codeBySection.delete(sid); // collision — do not share progress across modules
        return;
      }
      codeBySection.set(sid, String(m.code));
    });
    rows.forEach((row) => {
      if (row.pathwayCode) return;
      const code = codeBySection.get(String(row.sectionId));
      if (code && !byCode[code]) byCode[code] = this.toPublic(row);
    });

    return byCode;
  }

  /**
   * Fort `upsertSectionProgress` port — keyed by pathway code (one module card = one progress row).
   * LMS course/module/section ids are optional linkage; missing ids must never block a save
   * (that caused "only appears after page refresh" via the pending queue).
   */
  async upsertByModuleCode(userId: string, code: string, dto: UpdateIntlPathwayWatchProgressDto) {
    let pathway = await this.requireModule(code);
    pathway = await this.applyClientLmsHints(pathway, dto);
    const ids = await this.resolveLmsIdsOptional(pathway);
    const pathwayCode = String(pathway.code || '').trim();
    let existing = await this.progressRepository.findOne({
      where: { userId, pathwayCode },
    });
    if (!existing && ids.courseId && ids.sectionId) {
      const legacy = await this.progressRepository.findOne({
        where: { userId, courseId: ids.courseId, sectionId: ids.sectionId },
      });
      const legacyCode = String(legacy?.pathwayCode || '').trim();
      // Shared LMS section across pathway cards must not merge progress into the wrong code.
      if (legacy && (!legacyCode || legacyCode === pathwayCode)) {
        existing = legacy;
      }
    }
    existing =
      (await this.dropStaleProgressIfVideoUrlChanged(existing ?? undefined, pathway.videoUrl)) ??
      null;

    const dtoHasRanges = Array.isArray(dto.watchedCoverageRanges);
    const incomingPos =
      typeof dto.lastPositionSeconds === 'number' ? Math.max(0, Number(dto.lastPositionSeconds) || 0) : null;
    const incomingEmpty =
      !dtoHasRanges &&
      !(Number(dto.watchedSeconds) > 0) &&
      !(Number(dto.watchedDeltaSeconds) > 0) &&
      (incomingPos == null || incomingPos < 1) &&
      !dto.markCompleted;
    if (incomingEmpty) {
      return this.toPublic(existing);
    }

    const sourceVideoUrl = (normalizeVideoUrl(pathway.videoUrl) || null)?.slice(0, 500) || null;
    const catalogSeconds = Math.max(0, Math.floor((Number(pathway.minutes) || 0) * 60));
    const incomingDuration = typeof dto.durationSeconds === 'number' ? dto.durationSeconds : 0;
    const observedDuration = Math.max(
      existing?.durationSeconds ?? 0,
      existing?.videoDurationSeconds ?? 0,
      Math.floor(Number(incomingDuration) || 0),
    );
    const incomingRangesPeek = dtoHasRanges
      ? parseCoverageRangePairs(dto.watchedCoverageRanges)
      : [];
    const existingRangesPeek = parseCoverageRangePairs(existing?.watchedCoverageRanges);
    const rangeEnd = [...incomingRangesPeek, ...existingRangesPeek].reduce(
      (max, [s, e]) => Math.max(max, Number(s) || 0, Number(e) || 0),
      0,
    );
    const playheadHint = incomingPos ?? (Number(existing?.lastPositionSeconds) || 0);
    let duration = Math.max(observedDuration, catalogSeconds, Math.floor(playheadHint), Math.floor(rangeEnd), 0);
    if (
      catalogSeconds > 0 &&
      duration <= catalogSeconds + 90 &&
      Math.max(playheadHint, rangeEnd) > catalogSeconds + 30
    ) {
      duration = Math.max(duration, Math.floor(playheadHint), Math.floor(rangeEnd), observedDuration);
    }
    duration = roundedVideoDurationSeconds(duration);
    const requiredForCompletion = resolveRequiredSeconds(pathway.minutes, duration);

    const lastPos =
      incomingPos != null ? incomingPos : Number(existing?.lastPositionSeconds) || 0;

    const storedRangesRaw = clipCoverageRangesToDuration(
      parseCoverageRangePairs(existing?.watchedCoverageRanges),
      duration,
    );

    let mergedRanges = storedRangesRaw;
    let watchedWithDelta: number;
    let nextCoverageColumn: [number, number][] | null = existing?.watchedCoverageRanges
      ? clipCoverageRangesToDuration(parseCoverageRangePairs(existing.watchedCoverageRanges), duration)
      : null;

    if (dtoHasRanges) {
      if (mergedRanges.length === 0 && (existing?.watchedSeconds ?? 0) > 0 && duration > 0) {
        mergedRanges = [[0, Math.min(existing!.watchedSeconds, duration)]];
      }
      const incoming = clipCoverageRangesToDuration(
        parseCoverageRangePairs(dto.watchedCoverageRanges),
        duration,
      );
      mergedRanges = clipCoverageRangesToDuration(
        mergeCoverageRanges([...mergedRanges, ...incoming]),
        duration,
      );
      if (isPlaybackAtVideoEnd(lastPos, duration)) {
        mergedRanges = sealCoverageRangesToVideoEnd(mergedRanges, duration);
      }
      mergedRanges = sealCoverageRangesWhenComplete(mergedRanges, duration);
      watchedWithDelta = coverageMeasureSeconds(mergedRanges, duration);
      nextCoverageColumn = mergedRanges.length ? mergedRanges : null;
    } else {
      const baseWatched = existing?.watchedSeconds ?? 0;
      const absoluteWatched =
        typeof dto.watchedSeconds === 'number' ? dto.watchedSeconds : baseWatched;
      watchedWithDelta =
        absoluteWatched + (typeof dto.watchedDeltaSeconds === 'number' ? dto.watchedDeltaSeconds : 0);
    }

    const computed = buildComputed(lastPos, watchedWithDelta, duration);
    const now = new Date();
    const stickyCompleted = Boolean(existing?.isCompleted) || Boolean(dto.markCompleted);
    const reachedRequired =
      requiredForCompletion > 0 && computed.watched >= requiredForCompletion;
    const isCompleted = stickyCompleted || reachedRequired;

    const previousLastPosition = Math.max(0, Number(existing?.lastPositionSeconds || 0));
    const previousWatched = Math.max(0, Number(existing?.watchedSeconds || 0));
    const finalLastPosition =
      incomingPos != null && incomingPos >= 0
        ? incomingPos
        : Math.max(previousLastPosition, Math.max(0, computed.lastPosition));
    const finalWatched = Math.max(previousWatched, Math.max(0, computed.watched));
    const finalDuration = Math.max(0, Math.round(Number(computed.duration) || 0));
    const watchedInt = Math.max(0, Math.floor(finalWatched));
    const finalRemaining = Math.max(0, finalDuration - watchedInt);
    const finalPercent =
      finalDuration > 0 ? Number(((finalWatched / finalDuration) * 100).toFixed(2)) : 0;

    const payload: Partial<IntlPathwayWatchProgressEntity> = {
      ...(existing?.id ? { id: existing.id } : {}),
      userId,
      pathwayCode,
      courseId: ids.courseId || existing?.courseId || null,
      moduleId: ids.moduleId || existing?.moduleId || null,
      sectionId: ids.sectionId || existing?.sectionId || null,
      lastPositionSeconds: finalDuration > 0 ? Math.min(finalLastPosition, finalDuration) : finalLastPosition,
      // int columns must be whole numbers (Postgres rejects "479.91").
      watchedSeconds: watchedInt,
      watchedCoverageRanges: Array.isArray(nextCoverageColumn)
        ? nextCoverageColumn.map(
            ([s, e]) =>
              [
                Math.round(Number(s) * 100) / 100,
                Math.round(Number(e) * 100) / 100,
              ] as [number, number],
          )
        : (existing?.watchedCoverageRanges ?? null),
      durationSeconds: finalDuration,
      videoDurationSeconds: Math.max(
        existing?.videoDurationSeconds ?? 0,
        Math.floor(Number(incomingDuration) || 0),
        finalDuration,
      ),
      remainingSeconds: Math.max(0, Math.floor(finalRemaining)),
      requiredSeconds: Math.max(0, Math.floor(Number(requiredForCompletion) || 0)),
      completionPercent: finalPercent,
      isCompleted,
      sourceVideoUrl: sourceVideoUrl || existing?.sourceVideoUrl || null,
      lastAccessedAt: now,
    };

    await this.progressRepository.upsert(payload, ['userId', 'pathwayCode']);
    const saved = await this.progressRepository.findOne({
      where: { userId, pathwayCode },
    });
    return this.toPublic(saved);
  }

  /** Same numbering style as AI Nexus course certificates (`AINX-YYYYMMDD-#####`). */
  private async buildAinxCertificateNo(completedAt: Date = new Date()): Promise<string> {
    const safeDate =
      completedAt instanceof Date && !Number.isNaN(completedAt.getTime()) ? completedAt : new Date();
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
    return `${prefix}${Date.now().toString().slice(-5)}`;
  }

  async issueCertificate(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const planKey =
      String(user.membershipType || '').toLowerCase() === InternationalMembershipType.Student
        ? 'student'
        : 'full';

    const existing = await this.certificateRepository.findOne({
      where: { userId, planKey, status: IntlPathwayCertificateStatus.Active },
    });
    if (existing) return existing;

    const ready = await this.isPlanComplete(userId, planKey);
    if (!ready) {
      return { issued: false, reason: 'complete_all_modules' };
    }

    const completedAt = new Date();
    const certificateNo = await this.buildAinxCertificateNo(completedAt);
    const row = this.certificateRepository.create({
      userId,
      planKey,
      certificateNo,
      completedAt,
      status: IntlPathwayCertificateStatus.Active,
    });
    return this.certificateRepository.save(row);
  }

  async listCertificates(userId: string) {
    return this.certificateRepository.find({
      where: { userId, status: IntlPathwayCertificateStatus.Active },
      order: { completedAt: 'DESC' },
    });
  }

  /**
   * Same PDF builder as AI Nexus course certificates (ISCA COA layout, logos, e-sign).
   * Intl auth stays on `/intl-pathway/certificates/*` because learners are international_users.
   */
  async getCertificatePdf(
    userId: string,
    certificateId: string,
  ): Promise<{ filename: string; buffer: Buffer }> {
    const cert = await this.certificateRepository.findOne({
      where: { id: certificateId, userId, status: IntlPathwayCertificateStatus.Active },
    });
    if (!cert) throw new NotFoundException('Certificate not found');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const learnerName =
      [user?.firstname, user?.lastname].filter(Boolean).join(' ').trim() ||
      user?.email ||
      'Learner';

    const planKey = String(cert.planKey || 'full');
    const modules = await this.moduleRepository.find({
      where: { deleted: false },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    const requiredModules =
      planKey === 'student'
        ? modules.filter(
            (m) => String(m.pillar || '').replace(/\D/g, '').padStart(2, '0') === '01',
          )
        : modules;

    const progress = await this.progressRepository.find({ where: { userId } });
    const progressByCode = new Map(
      progress.map((row) => [String(row.pathwayCode || ''), row] as const),
    );

    const pillarHours = new Map<number, number>();
    let earnedCpeHours = 0;
    const transcript = requiredModules.map((mod) => {
      const row = progressByCode.get(String(mod.code));
      const watchedSec = Math.max(
        0,
        Math.floor(Number(row?.watchedSeconds) || 0),
        Math.floor((Number(mod.minutes) || 0) * 60),
      );
      const cpe = computeCpeHoursFromWatchSeconds(
        row?.isCompleted ? watchedSec : Math.floor(Number(row?.watchedSeconds) || 0),
      );
      earnedCpeHours += cpe;
      const pillarIndex = Math.max(
        1,
        Number(String(mod.pillar || '').replace(/\D/g, '')) || 1,
      );
      pillarHours.set(pillarIndex, (pillarHours.get(pillarIndex) || 0) + cpe);

      return {
        moduleId: String(mod.moduleId || mod.id || ''),
        moduleTitle: String(mod.title || mod.code),
        courseTitle: CERTIFICATE_PROGRAMME_DISPLAY_TITLE,
        pillarIndex,
        completedSections: row?.isCompleted ? 1 : 0,
        totalSections: 1,
        isModuleComplete: Boolean(row?.isCompleted),
        cpeHours: cpe,
        sections: [
          {
            sectionId: String(mod.sectionId || mod.code),
            sectionTitle: String(mod.title || mod.code),
            isCompleted: Boolean(row?.isCompleted),
            completedAt: row?.isCompleted
              ? (row.lastAccessedAt || cert.completedAt)?.toISOString?.() ||
                String(cert.completedAt)
              : null,
          },
        ],
      };
    });

    const courseTitle = CERTIFICATE_PROGRAMME_DISPLAY_TITLE;

    const certTemplate = await this.appSettingsService.getCertificateTemplateForPdf();

    return buildCourseCertificatePdf(
      mergeCertificateTemplateIntoInput(
        {
          certificateNo: cert.certificateNo,
          learnerName,
          courseTitle,
          completedAt: cert.completedAt,
          earnedCpeHours,
          allocatedCpeHours: earnedCpeHours,
          pillarCpeHours: [...pillarHours.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([pillarIndex, hours]) => ({
              pillarIndex,
              earnedCpeHours: hours,
            })),
          transcript,
        },
        certTemplate,
      ),
    );
  }

  private async isPlanComplete(userId: string, planKey: string) {
    const modules = await this.moduleRepository.find({
      where: { deleted: false },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    const required = planKey === 'student'
      ? modules.filter((m) => String(m.pillar || '').replace(/\D/g, '').padStart(2, '0') === '01')
      : modules;
    if (!required.length) return false;
    const progress = await this.progressRepository.find({ where: { userId } });
    const done = new Set(
      progress.filter((p) => p.isCompleted).map((p) => String(p.pathwayCode || '')),
    );
    return required.every((m) => m.code && done.has(String(m.code)));
  }

  private requireLmsIds(pathway: IntlPathwayModuleEntity) {
    const courseId = String(pathway.courseId || '').trim();
    const moduleId = String(pathway.moduleId || '').trim();
    const sectionId = String(pathway.sectionId || '').trim();
    if (!courseId || !moduleId || !sectionId) {
      throw new BadRequestException(
        `Pathway module ${pathway.code} is missing LMS courseId/moduleId/sectionId. Pick Course → Module → Section in admin (or run sync-from-courses).`,
      );
    }
    return { courseId, moduleId, sectionId };
  }

  /** Best-effort LMS ids — never throws; progress saves by pathwayCode either way. */
  private async resolveLmsIdsOptional(pathway: IntlPathwayModuleEntity): Promise<{
    courseId: string | null;
    moduleId: string | null;
    sectionId: string | null;
  }> {
    const filled = await this.backfillLmsIds(pathway);
    const courseId = String(filled.courseId || '').trim() || null;
    const moduleId = String(filled.moduleId || '').trim() || null;
    const sectionId = String(filled.sectionId || '').trim() || null;
    return { courseId, moduleId, sectionId };
  }

  /** Prefer DB mapping; backfill from LMS tree when planner never persisted ids. */
  private async resolveLmsIds(pathway: IntlPathwayModuleEntity) {
    const filled = await this.backfillLmsIds(pathway);
    return this.requireLmsIds(filled);
  }

  /** Accept planner-known LMS ids on PUT so each module can store its own coverage. */
  private async applyClientLmsHints(
    pathway: IntlPathwayModuleEntity,
    dto: UpdateIntlPathwayWatchProgressDto,
  ): Promise<IntlPathwayModuleEntity> {
    const courseId = String(dto.courseId || '').trim();
    const moduleId = String(dto.moduleId || '').trim();
    const sectionId = String(dto.sectionId || '').trim();
    if (!courseId || !moduleId || !sectionId) return pathway;

    const sameAlready =
      String(pathway.courseId || '') === courseId &&
      String(pathway.moduleId || '') === moduleId &&
      String(pathway.sectionId || '') === sectionId;
    if (sameAlready) return pathway;

    const section = await this.sectionRepository.findOne({ where: { id: sectionId } });
    if (!section || String(section.moduleId) !== moduleId) return pathway;

    const courseModule = await this.courseModuleRepository.findOne({ where: { id: moduleId } });
    if (!courseModule || String(courseModule.courseId) !== courseId) return pathway;

    // Do not steal another pathway module's unique LMS section mapping.
    const clash = await this.moduleRepository.findOne({
      where: { sectionId, deleted: false },
    });
    if (clash && clash.id !== pathway.id && clash.code !== pathway.code) {
      return pathway;
    }

    pathway.courseId = courseId;
    pathway.moduleId = moduleId;
    pathway.sectionId = sectionId;
    if (!pathway.videoUrl && section.videoUrl) {
      pathway.videoUrl = String(section.videoUrl).trim() || null;
    }
    return this.moduleRepository.save(pathway);
  }

  /** Match LMS section by code / video URL / title and persist courseId + moduleId + sectionId. */
  private async backfillLmsIds(pathway: IntlPathwayModuleEntity): Promise<IntlPathwayModuleEntity> {
    if (pathway.courseId && pathway.moduleId && pathway.sectionId) return pathway;

    const videoUrl = normalizeVideoUrl(pathway.videoUrl);
    const title = String(pathway.title || '').trim();
    const code = String(pathway.code || '').trim();

    let section: CourseModuleSectionEntity | null = null;

    if (videoUrl) {
      section = await this.sectionRepository
        .createQueryBuilder('s')
        .where(
          `LOWER(TRIM(TRAILING '/' FROM SPLIT_PART(SPLIT_PART(COALESCE(s.videoUrl, ''), '#', 1), '?', 1))) = :videoUrl`,
          { videoUrl: videoUrl.toLowerCase() },
        )
        .orderBy('s.sortOrder', 'ASC')
        .getOne();
    }

    // Exact code token in title (01-00), not loose ILIKE that collides across modules.
    if (!section && code) {
      section = await this.sectionRepository
        .createQueryBuilder('s')
        .where(`s.title ~ :codePattern`, {
          codePattern: `(^|[^0-9])${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^0-9]|$)`,
        })
        .orderBy('s.sortOrder', 'ASC')
        .getOne();
    }

    if (!section && title) {
      section = await this.sectionRepository
        .createQueryBuilder('s')
        .where('LOWER(TRIM(s.title)) = LOWER(:title)', { title })
        .orderBy('s.sortOrder', 'ASC')
        .getOne();
    }

    if (!section) return pathway;

    const clash = await this.moduleRepository.findOne({
      where: { sectionId: section.id, deleted: false },
    });
    if (clash && clash.id !== pathway.id) return pathway;

    const courseModule = await this.courseModuleRepository.findOne({
      where: { id: section.moduleId },
    });
    if (!courseModule) return pathway;

    pathway.sectionId = section.id;
    pathway.moduleId = courseModule.id;
    pathway.courseId = courseModule.courseId;
    if (!pathway.videoUrl && section.videoUrl) {
      pathway.videoUrl = String(section.videoUrl).trim() || null;
    }
    return this.moduleRepository.save(pathway);
  }

  private async requireModule(code: string) {
    const normalized = (() => {
      try {
        return decodeURIComponent(String(code || '')).trim();
      } catch {
        return String(code || '').trim();
      }
    })();
    if (!normalized) throw new NotFoundException('Pathway module not found: empty code');

    let module = await this.moduleRepository.findOne({
      where: { code: normalized, deleted: false },
    });
    if (!module) {
      module = await this.moduleRepository.findOne({ where: { code: normalized } });
      if (module?.deleted) {
        module.deleted = false;
        module = await this.moduleRepository.save(module);
      }
    }
    if (!module) {
      const seedIndex = INTL_PATHWAY_MODULE_SEED.findIndex((row) => row.code === normalized);
      const seed = seedIndex >= 0 ? INTL_PATHWAY_MODULE_SEED[seedIndex] : null;
      if (seed) {
        module = await this.moduleRepository.save(
          this.moduleRepository.create({
            code: seed.code,
            title: seed.title,
            pillar: String(seed.pillar || ''),
            minutes: Number(seed.minutes) || 0,
            videoUrl: null,
            courseId: null,
            moduleId: null,
            sectionId: null,
            bullets: Array.isArray(seed.bullets) ? [...seed.bullets] : [],
            sortOrder: seedIndex,
            deleted: false,
          }),
        );
      }
    }
    if (!module) {
      throw new NotFoundException(`Pathway module not found: ${normalized}`);
    }
    return this.backfillLmsIds(module);
  }
}
