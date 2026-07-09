import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, QueryFailedError } from 'typeorm';
import { CourseEntity, CourseLevel } from './courses.entity';
import { CourseSectionWatchProgressEntity } from './course-section-watch-progress.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';
import { CourseModuleEntity } from './course-module.entity';
import { UpdateCourseSectionWatchProgressDto } from './course-section-watch-progress.dto';
import { normalizeVideoUrlForCompare } from './course-video-url.util';
import {
  computeCpeHoursFromWatchSeconds,
  formatSecondsToDisplayTime,
  parseMarketDataCpeHours,
  ProgramPillarWatchSummary,
  resolveCoursePillarIndex,
  secondsToWatchedHours,
} from './course-program-cpe-summary.util';

function isSectionProgressFkViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driver = (error as QueryFailedError & { driverError?: { code?: string; constraint?: string } })
    .driverError;
  const code = driver?.code ?? (error as { code?: string }).code;
  const constraint = String(driver?.constraint ?? (error as { constraint?: string }).constraint ?? '');
  return code === '23503' && constraint.includes('section');
}

function parseWatchtimeToSeconds(value?: string | null): number {
  const text = String(value || '').trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number(text) || 0;
  const hms = text.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (hms) {
    const h = Number(hms[1]);
    const m = Number(hms[2]);
    const s = Number(hms[3]);
    if ([h, m, s].some((n) => Number.isNaN(n)) || m > 59 || s > 59) return 0;
    return h * 3600 + m * 60 + s;
  }
  const ms = text.match(/^(\d+):(\d{1,2})$/);
  if (ms) {
    const m = Number(ms[1]);
    const s = Number(ms[2]);
    if ([m, s].some((n) => Number.isNaN(n)) || s > 59) return 0;
    return m * 60 + s;
  }
  return 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ''),
  );
}

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
  // Close tiny holes from client play/pause / poll jitter.
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

/** Integer-second rule: final displayed second or player `ended` event. */
function isPlaybackAtVideoEnd(position: number, duration: number, ended = false): boolean {
  if (ended) return true;
  const totalSec = roundedVideoDurationSeconds(duration);
  if (totalSec <= 0) return false;
  const positionSec = Math.max(0, Number(position) || 0);
  return Math.ceil(positionSec) >= totalSec;
}

/** Seal last segment to rounded duration when coverage already includes the final second. */
function sealCoverageRangesToVideoEnd(
  ranges: [number, number][],
  duration: number,
): [number, number][] {
  const dur = roundedVideoDurationSeconds(duration);
  if (dur <= 0) return mergeCoverageRanges(ranges);
  const merged = clipCoverageRangesToDuration(ranges, dur);
  if (!merged.length) return merged;
  const last = merged[merged.length - 1];
  if (Math.ceil(last[1]) >= dur - 1) {
    last[1] = dur;
  }
  return merged;
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

function sealCoverageRangesWhenComplete(
  ranges: [number, number][],
  duration: number,
): [number, number][] {
  const dur = roundedVideoDurationSeconds(duration);
  if (dur <= 0) return mergeCoverageRanges(ranges);
  const clipped = clipCoverageRangesToDuration(ranges, dur);
  if (computeUnwatchedGapSeconds(clipped, dur) >= 1) return clipped;
  return [[0, dur]];
}

function coverageMeasureSeconds(ranges: [number, number][], duration: number): number {
  const dur = roundedVideoDurationSeconds(duration);
  const merged = dur > 0 ? clipCoverageRangesToDuration(ranges, dur) : mergeCoverageRanges(ranges);
  if (dur > 0 && computeUnwatchedGapSeconds(merged, dur) < 1) {
    return dur;
  }
  let total = 0;
  for (const [s, e] of merged) total += e - s;
  const measured = Math.floor(Math.max(0, total));
  return dur > 0 ? Math.min(dur, measured) : measured;
}

/**
 * Module / section rules (product):
 * - Sequential unlock: section N+1 stays locked until section N is completed.
 * - Sticky completion: once isCompleted is true for a section, it never becomes false (re-access always allowed).
 * - Content lock: a section that is already completed is never treated as locked for the learner.
 * - Completion threshold: admin completionPercentage (% of video) when set; else admin watchtime
 *   capped by real video length — full video not required when either is configured.
 */

@Injectable()
export class CourseSectionWatchProgressService {
  private readonly logger = new Logger(CourseSectionWatchProgressService.name);

  constructor(
    @InjectRepository(CourseSectionWatchProgressEntity)
    private readonly sectionProgressRepository: Repository<CourseSectionWatchProgressEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly sectionRepository: Repository<CourseModuleSectionEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly moduleRepository: Repository<CourseModuleEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
  ) {}

  private formatSecondsToHhMmSs(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hh = Math.floor(safe / 3600);
    const mm = Math.floor((safe % 3600) / 60);
    const ss = safe % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  private normalizeCompletionPercentage(value?: number | string | null): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 1 || n > 100) return null;
    return n;
  }

  private buildComputed(lastPositionSeconds: number, watchedSeconds: number, durationSeconds: number) {
    const duration = Math.max(0, Math.floor(Number(durationSeconds) || 0));
    const watchedRaw = Math.max(0, Math.floor(Number(watchedSeconds) || 0));
    const watched = duration > 0 ? Math.min(duration, watchedRaw) : watchedRaw;
    const lastPositionRaw = Math.max(0, Math.floor(Number(lastPositionSeconds) || 0));
    const lastPosition = duration > 0 ? Math.min(duration, lastPositionRaw) : lastPositionRaw;
    const remaining = Math.max(0, duration - watched);
    const percent = duration > 0 ? Number(((watched / duration) * 100).toFixed(2)) : 0;
    const isCompleted = duration > 0 ? watched >= duration : false;
    return { duration, watched, lastPosition, remaining, percent, isCompleted };
  }

  private resolveDisplayDurationSeconds(
    resolvedDurationTimeSeconds: number,
    observedVideoDurationSeconds: number,
    storedVideoDurationSeconds: number,
  ): number {
    const fromSection = Math.max(0, Math.floor(Number(resolvedDurationTimeSeconds) || 0));
    const fromObserved = Math.max(0, Math.floor(Number(observedVideoDurationSeconds) || 0));
    const fromStored = Math.max(0, Math.floor(Number(storedVideoDurationSeconds) || 0));
    const observed = Math.max(fromObserved, fromStored);

    // Admin durationTime can exceed the real Spotlightr runtime — do not deflate progress/completion.
    if (observed > 0 && fromSection > 0 && observed < fromSection * 0.85) {
      return observed;
    }
    return Math.max(fromSection, observed);
  }

  private resolveCompletionRequiredSeconds(
    watchtimeSeconds: number,
    fullVideoDurationSeconds: number,
    completionPercentage?: number | null,
  ): number {
    const full = Math.max(0, Math.floor(Number(fullVideoDurationSeconds) || 0));
    const pct = this.normalizeCompletionPercentage(completionPercentage);
    if (pct != null && full > 0) {
      return Math.max(1, Math.ceil((full * pct) / 100));
    }
    const wt = Math.max(0, Math.floor(Number(watchtimeSeconds) || 0));
    if (wt > 0 && full > 0) return Math.min(wt, full);
    if (wt > 0) return wt;
    return full;
  }

  /**
   * Strict completion: unique watched coverage must meet or exceed the required threshold.
   */
  private watchProgressMeetsCompletionRequirement(watched: number, required: number): boolean {
    if (!(required > 0)) return false;
    return watched >= required;
  }

  private async dropStaleProgressIfVideoUrlChanged(
    row: CourseSectionWatchProgressEntity | undefined,
    sectionVideoUrl?: string | null,
  ): Promise<CourseSectionWatchProgressEntity | undefined> {
    if (!row) return undefined;
    const currentUrl = normalizeVideoUrlForCompare(sectionVideoUrl);
    const storedUrl = normalizeVideoUrlForCompare(row.sourceVideoUrl);
    if (storedUrl && currentUrl && storedUrl !== currentUrl) {
      await this.sectionProgressRepository.delete({ id: row.id });
      return undefined;
    }
    if (!storedUrl && currentUrl) {
      row.sourceVideoUrl = normalizeVideoUrlForCompare(sectionVideoUrl) || null;
      await this.sectionProgressRepository.update({ id: row.id }, { sourceVideoUrl: row.sourceVideoUrl });
    }
    return row;
  }

  private async resolveCourseTiming(
    courseId: string,
    sectionId: string,
  ): Promise<{
    watchtimeSeconds: number;
    durationTimeSeconds: number;
    completionPercentage: number | null;
  }> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      select: ['id', 'moduleId', 'watchtime', 'durationTime', 'completionPercentage', 'videoUrl'],
    });
    if (!section) {
      return { watchtimeSeconds: 0, durationTimeSeconds: 0, completionPercentage: null };
    }
    const module = await this.moduleRepository.findOne({
      where: { id: section.moduleId },
      select: ['id', 'courseId'],
    });
    if (!module || module.courseId !== courseId) {
      return { watchtimeSeconds: 0, durationTimeSeconds: 0, completionPercentage: null };
    }
    return {
      watchtimeSeconds: parseWatchtimeToSeconds(section.watchtime),
      durationTimeSeconds: parseWatchtimeToSeconds(section.durationTime),
      completionPercentage: this.normalizeCompletionPercentage(section.completionPercentage),
    };
  }

  private async getOrderedCourseSections(courseId: string): Promise<Array<{ sectionId: string; moduleId: string }>> {
    const modules = await this.moduleRepository.find({
      where: { courseId },
      select: ['id', 'sortOrder'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (!modules.length) return [];

    const moduleIds = modules.map((module) => module.id);
    const sections = await this.sectionRepository.find({
      where: moduleIds.map((moduleId) => ({ moduleId })),
      select: ['id', 'moduleId', 'sortOrder'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const sectionByModule = new Map<string, Array<{ id: string; moduleId: string }>>();
    modules.forEach((module) => sectionByModule.set(module.id, []));
    sections.forEach((section) => {
      const existing = sectionByModule.get(section.moduleId) || [];
      existing.push({ id: section.id, moduleId: section.moduleId });
      sectionByModule.set(section.moduleId, existing);
    });

    return modules.flatMap((module) => sectionByModule.get(module.id) || []).map((s) => ({
      sectionId: s.id,
      moduleId: s.moduleId,
    }));
  }

  private async getModulesAndSections(courseId: string) {
    const modules = await this.moduleRepository.find({
      where: { courseId },
      select: ['id', 'sortOrder'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const sections = modules.length
      ? await this.sectionRepository.find({
          where: modules.map((module) => ({ moduleId: module.id })),
          select: ['id', 'moduleId', 'sortOrder', 'watchtime', 'durationTime', 'completionPercentage', 'videoUrl'],
          order: { sortOrder: 'ASC', createdAt: 'ASC' },
        })
      : [];

    return { modules, sections } as {
      modules: CourseModuleEntity[];
      sections: CourseModuleSectionEntity[];
    };
  }

  private groupSectionsByModule(modules: CourseModuleEntity[], sections: CourseModuleSectionEntity[]) {
    const sectionsByModule = new Map<string, CourseModuleSectionEntity[]>();
    modules.forEach((module) => sectionsByModule.set(module.id, []));
    sections.forEach((section) => {
      const entries = sectionsByModule.get(section.moduleId) || [];
      entries.push(section);
      sectionsByModule.set(section.moduleId, entries);
    });
    sectionsByModule.forEach((entries) =>
      entries.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    );
    return sectionsByModule;
  }

  private async resolveSectionLockedState(_userId: string, _courseId: string, _sectionId: string): Promise<boolean> {
    // Pillar 1–3: all lessons open; quiz/assessment gating is handled in the player UI.
    return false;
  }

  async getAllSectionProgressForCourse(
    userId: string,
    courseId: string,
  ): Promise<Record<string, ReturnType<CourseSectionWatchProgressService['formatSectionProgressResponse']>>> {
    const { modules, sections } = await this.getModulesAndSections(courseId);
    if (modules.length === 0 || sections.length === 0) {
      return {};
    }

    const sectionsByModule = this.groupSectionsByModule(modules, sections);
    const sectionIds = sections.map((s) => s.id);
    const progressRows = await this.sectionProgressRepository.find({
      where: { userId, courseId, sectionId: In(sectionIds) },
    });
    const sectionVideoUrlById = new Map(sections.map((s) => [s.id, s.videoUrl]));
    const validProgressRows: CourseSectionWatchProgressEntity[] = [];
    for (const row of progressRows) {
      const kept = await this.dropStaleProgressIfVideoUrlChanged(
        row,
        sectionVideoUrlById.get(row.sectionId),
      );
      if (kept) validProgressRows.push(kept);
    }
    const progressBySection = new Map(validProgressRows.map((r) => [r.sectionId, r]));

    const resolvedTimingBySection = new Map<
      string,
      {
        watchtimeSeconds: number;
        durationTimeSeconds: number;
        completionPercentage: number | null;
      }
    >();
    sections.forEach((section) => {
      resolvedTimingBySection.set(section.id, {
        watchtimeSeconds: parseWatchtimeToSeconds(section.watchtime),
        durationTimeSeconds: parseWatchtimeToSeconds(section.durationTime),
        completionPercentage: this.normalizeCompletionPercentage(section.completionPercentage),
      });
    });

    const result: Record<string, ReturnType<CourseSectionWatchProgressService['formatSectionProgressResponse']>> = {};
    modules.forEach((module) => {
      const moduleSections = sectionsByModule.get(module.id) || [];
      moduleSections.forEach((section) => {
        // Pillar 1–3: every lesson unlocked from the start.
        const isLocked = false;
        const timing = resolvedTimingBySection.get(section.id);
        result[section.id] = this.formatSectionProgressResponse(
          courseId,
          section.id,
          progressBySection.get(section.id),
          timing?.watchtimeSeconds ?? 0,
          timing?.durationTimeSeconds ?? 0,
          isLocked,
          timing?.completionPercentage ?? null,
        );
      });
    });

    return result;
  }

  /**
   * Single source of truth for "section done" + display watch math.
   * Must match sequential unlock: use this (not only DB isCompleted) so a refresh after watching
   * still unlocks the next lesson when watch coverage meets the required threshold.
   */
  private deriveSectionProgressComputation(
    existing: CourseSectionWatchProgressEntity | undefined,
    resolvedWatchtimeSeconds: number,
    resolvedDurationTimeSeconds: number,
    completionPercentage?: number | null,
  ) {
    const duration = this.resolveDisplayDurationSeconds(
      resolvedDurationTimeSeconds,
      existing?.durationSeconds ?? 0,
      existing?.videoDurationSeconds ?? 0,
    );
    const required = this.resolveCompletionRequiredSeconds(
      resolvedWatchtimeSeconds,
      duration,
      completionPercentage,
    );
    const storedRangesRaw = clipCoverageRangesToDuration(
      parseCoverageRangePairs(existing?.watchedCoverageRanges),
      duration,
    );
    const lastPosForRead = existing?.lastPositionSeconds ?? 0;
    const storedRanges = isPlaybackAtVideoEnd(lastPosForRead, duration)
      ? sealCoverageRangesToVideoEnd(storedRangesRaw, duration)
      : storedRangesRaw;
    const legacyWatchedCap = duration > 0 ? Math.min(duration, existing?.watchedSeconds ?? 0) : (existing?.watchedSeconds ?? 0);
    const watchedFromCoverage =
      storedRanges.length > 0 ? coverageMeasureSeconds(storedRanges, duration) : legacyWatchedCap;
    // Trust coverage ranges for in-progress lessons; only lift legacy watchedSeconds for completed rows.
    let watchedForDisplay = watchedFromCoverage;
    if (storedRanges.length === 0) {
      watchedForDisplay = legacyWatchedCap;
    } else if (existing?.isCompleted) {
      watchedForDisplay = Math.max(watchedFromCoverage, legacyWatchedCap);
    }
    const computed = this.buildComputed(
      existing?.lastPositionSeconds ?? 0,
      watchedForDisplay,
      duration,
    );
    const isCompleted = Boolean(
      existing?.isCompleted ||
        this.watchProgressMeetsCompletionRequirement(watchedForDisplay, required),
    );
    const isWatched = isCompleted;
    // Keep real coverage/percent even after threshold completion so learners can still
    // fill the remaining watch range up to 100% of the video.
    return {
      duration,
      required,
      storedRanges,
      legacyWatchedCap,
      watchedFromCoverage,
      watchedForDisplay,
      computed,
      isCompleted,
      isWatched,
    };
  }

  private formatSectionProgressResponse(
    courseId: string,
    sectionId: string,
    existing: CourseSectionWatchProgressEntity | undefined,
    resolvedWatchtimeSeconds: number,
    resolvedDurationTimeSeconds: number,
    isLocked: boolean,
    completionPercentage?: number | null,
  ) {
    const { duration, storedRanges, legacyWatchedCap, computed, isCompleted, isWatched } =
      this.deriveSectionProgressComputation(
        existing,
        resolvedWatchtimeSeconds,
        resolvedDurationTimeSeconds,
        completionPercentage,
      );

    const lastPos = computed.lastPosition;
    const watched = computed.watched;
    const dur = computed.duration;
    const remaining = computed.remaining;
    const percent = computed.percent;

    let watchedCoverageRangesOut: [number, number][] = storedRanges;
    if (storedRanges.length === 0 && legacyWatchedCap > 0 && duration > 0) {
      watchedCoverageRangesOut = [[0, legacyWatchedCap]];
    }

    // Completed sections stay accessible forever; sequential gate does not re-lock them.
    const isLockedOut = Boolean(isLocked && !isCompleted);

    return {
      courseId,
      sectionId,
      lastPositionSeconds: lastPos,
      watchedSeconds: watched,
      watchedCoverageRanges: watchedCoverageRangesOut,
      durationSeconds: dur,
      remainingSeconds: remaining,
      completionPercent: percent,
      isCompleted,
      isWatched,
      isLocked: isLockedOut,
      lastPositionTime: this.formatSecondsToHhMmSs(lastPos),
      watchedTime: this.formatSecondsToHhMmSs(watched),
      durationTime: this.formatSecondsToHhMmSs(dur),
      remainingTime: this.formatSecondsToHhMmSs(remaining),
      lastAccessedAt: existing?.lastAccessedAt ?? null,
    };
  }

  async getUserTouchedCourseIds(userId: string): Promise<string[]> {
    const rows = await this.sectionProgressRepository
      .createQueryBuilder('sp')
      .select('sp.courseId', 'courseId')
      .where('sp.userId = :userId', { userId })
      .groupBy('sp.courseId')
      .getRawMany<{ courseId: string }>();
    return rows
      .map((row) => String(row?.courseId || '').trim())
      .filter(Boolean);
  }

  async getSectionProgress(userId: string, courseId: string, sectionId: string) {
    if (!isUuid(sectionId)) {
      return {
        courseId,
        sectionId,
        lastPositionSeconds: 0,
        watchedSeconds: 0,
        durationSeconds: 0,
        remainingSeconds: 0,
        completionPercent: 0,
        isCompleted: false,
        isWatched: false,
        isLocked: false,
        lastPositionTime: this.formatSecondsToHhMmSs(0),
        watchedTime: this.formatSecondsToHhMmSs(0),
        durationTime: this.formatSecondsToHhMmSs(0),
        remainingTime: this.formatSecondsToHhMmSs(0),
        lastAccessedAt: null,
        watchedCoverageRanges: [],
      };
    }
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      select: ['id', 'videoUrl'],
    });
    let existing = await this.sectionProgressRepository.findOne({
      where: { userId, courseId, sectionId },
    });
    existing =
      (await this.dropStaleProgressIfVideoUrlChanged(existing ?? undefined, section?.videoUrl)) ??
      null;
    const resolvedTiming = await this.resolveCourseTiming(courseId, sectionId);
    const isLocked = await this.resolveSectionLockedState(userId, courseId, sectionId);
    return this.formatSectionProgressResponse(
      courseId,
      sectionId,
      existing ?? undefined,
      resolvedTiming.watchtimeSeconds,
      resolvedTiming.durationTimeSeconds,
      isLocked,
      resolvedTiming.completionPercentage,
    );
  }

  async upsertSectionProgress(
    userId: string,
    courseId: string,
    sectionId: string,
    dto: UpdateCourseSectionWatchProgressDto,
  ) {
    if (!isUuid(sectionId)) {
      return this.getSectionProgress(userId, courseId, sectionId);
    }
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      select: ['id', 'moduleId', 'videoUrl'],
    });
    if (!section) {
      return this.getSectionProgress(userId, courseId, sectionId);
    }
    const sectionModule = await this.moduleRepository.findOne({
      where: { id: section.moduleId },
      select: ['id', 'courseId'],
    });
    if (!sectionModule || sectionModule.courseId !== courseId) {
      return this.getSectionProgress(userId, courseId, sectionId);
    }
    let existing = await this.sectionProgressRepository.findOne({
      where: { userId, courseId, sectionId },
    });
    existing =
      (await this.dropStaleProgressIfVideoUrlChanged(existing ?? undefined, section.videoUrl)) ??
      null;
    const sourceVideoUrl = normalizeVideoUrlForCompare(section.videoUrl) || null;
    const resolvedTiming = await this.resolveCourseTiming(courseId, sectionId);
    const incomingDuration = typeof dto.durationSeconds === 'number' ? dto.durationSeconds : 0;
    const observedDuration = Math.max(
      existing?.durationSeconds ?? 0,
      existing?.videoDurationSeconds ?? 0,
      incomingDuration,
    );
    const duration = this.resolveDisplayDurationSeconds(
      resolvedTiming.durationTimeSeconds,
      observedDuration,
      existing?.videoDurationSeconds ?? 0,
    );
    const requiredForCompletion = this.resolveCompletionRequiredSeconds(
      resolvedTiming.watchtimeSeconds,
      duration,
      resolvedTiming.completionPercentage,
    );
    const lastPos = typeof dto.lastPositionSeconds === 'number' ? dto.lastPositionSeconds : existing?.lastPositionSeconds ?? 0;

    const dtoHasRanges = Array.isArray(dto.watchedCoverageRanges);
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
      const incoming = clipCoverageRangesToDuration(parseCoverageRangePairs(dto.watchedCoverageRanges), duration);
      mergedRanges = clipCoverageRangesToDuration(mergeCoverageRanges([...mergedRanges, ...incoming]), duration);
      if (isPlaybackAtVideoEnd(lastPos, duration)) {
        mergedRanges = sealCoverageRangesToVideoEnd(mergedRanges, duration);
      }
      mergedRanges = sealCoverageRangesWhenComplete(mergedRanges, duration);
      const covered = coverageMeasureSeconds(mergedRanges, duration);
      watchedWithDelta = covered;
      nextCoverageColumn = mergedRanges.length ? mergedRanges : null;
    } else {
      const baseWatched = existing?.watchedSeconds ?? 0;
      const absoluteWatched = typeof dto.watchedSeconds === 'number' ? dto.watchedSeconds : baseWatched;
      watchedWithDelta = absoluteWatched + (typeof dto.watchedDeltaSeconds === 'number' ? dto.watchedDeltaSeconds : 0);
    }

    const computed = this.buildComputed(lastPos, watchedWithDelta, duration);
    const now = new Date();
    const stickyCompleted = Boolean(existing?.isCompleted);
    const reachedRequired = this.watchProgressMeetsCompletionRequirement(
      computed.watched,
      requiredForCompletion,
    );
    const isCompleted = stickyCompleted || reachedRequired;
    const isWatched = Boolean(existing?.isCompleted || isCompleted);
    const previousLastPosition = Math.max(0, Number(existing?.lastPositionSeconds || 0));
    const previousWatched = Math.max(0, Number(existing?.watchedSeconds || 0));
    const dtoLastPosition =
      typeof dto.lastPositionSeconds === 'number'
        ? Math.max(0, Math.floor(dto.lastPositionSeconds))
        : null;
    // Keep resume/watch progress monotonic to avoid rollback from out-of-order updates (pause + pagehide race).
    // After the completion threshold is met, learners may rewind to fill gaps — bookmark the real pause point.
    const finalLastPosition =
      dtoLastPosition != null && dtoLastPosition >= 0
        ? dtoLastPosition
        : Math.max(previousLastPosition, Math.max(0, computed.lastPosition));
    const finalWatched = Math.max(previousWatched, Math.max(0, computed.watched));
    const finalDuration = Math.max(computed.duration, 0);
    const finalRemaining = Math.max(0, finalDuration - finalWatched);
    // Percent follows actual watched coverage — do not jump to 100 just because completion threshold was met.
    const finalPercent =
      finalDuration > 0
        ? Number(((finalWatched / finalDuration) * 100).toFixed(2))
        : 0;

    // Atomic upsert prevents duplicate-key races when multiple progress updates arrive together.
    try {
      await this.sectionProgressRepository.upsert(
        {
          ...(existing?.id ? { id: existing.id } : {}),
          userId,
          courseId,
          sectionId,
          lastPositionSeconds: finalLastPosition,
          watchedSeconds: finalWatched,
          watchedCoverageRanges: dtoHasRanges ? nextCoverageColumn : (existing?.watchedCoverageRanges ?? null),
          durationSeconds: finalDuration,
          videoDurationSeconds: Math.max(
            existing?.videoDurationSeconds ?? 0,
            incomingDuration,
            resolvedTiming.durationTimeSeconds,
            finalDuration,
          ),
          remainingSeconds: finalRemaining,
          completionPercent: finalPercent,
          isCompleted,
          sourceVideoUrl,
          lastAccessedAt: now,
        },
        ['userId', 'courseId', 'sectionId'],
      );
    } catch (error) {
      if (isSectionProgressFkViolation(error)) {
        this.logger.warn(
          `Skipped section progress upsert — section ${sectionId} not found (course ${courseId})`,
        );
        return this.getSectionProgress(userId, courseId, sectionId);
      }
      throw error;
    }
    return this.getSectionProgress(userId, courseId, sectionId);
  }

  /** Section IDs where at least one learner has isCompleted=true. */
  async getCompletedSectionIdsForCourse(courseId: string): Promise<string[]> {
    const rows = await this.sectionProgressRepository.find({
      where: { courseId, isCompleted: true },
      select: ['sectionId'],
    });
    return [...new Set(rows.map((row) => row.sectionId).filter(Boolean))];
  }

  async hasAnyLearnerCompletedSection(courseId: string, sectionId: string): Promise<boolean> {
    const count = await this.sectionProgressRepository.count({
      where: { courseId, sectionId, isCompleted: true },
    });
    return count > 0;
  }

  /** Sum unique video watch coverage across all programme pillar courses (1–3). */
  private async sumVideoWatchStatsForCourse(
    userId: string,
    courseId: string,
  ): Promise<{
    watchedSeconds: number;
    totalVideoDurationSeconds: number;
    allVideosCompleted: boolean;
    totalVideoSections: number;
    completedVideoSections: number;
  }> {
    const { sections } = await this.getModulesAndSections(courseId);
    const videoSections = sections.filter((section) => Boolean(String(section.videoUrl || '').trim()));
    if (!videoSections.length) {
      return {
        watchedSeconds: 0,
        totalVideoDurationSeconds: 0,
        allVideosCompleted: false,
        totalVideoSections: 0,
        completedVideoSections: 0,
      };
    }

    const progressMap = await this.getAllSectionProgressForCourse(userId, courseId);
    let watchedSeconds = 0;
    let totalVideoDurationSeconds = 0;
    let completedVideoSections = 0;

    for (const section of videoSections) {
      const progress = progressMap[section.id];
      const watched = Math.max(0, Number(progress?.watchedSeconds || 0));
      const duration = Math.max(0, Number(progress?.durationSeconds || 0));
      watchedSeconds += watched;
      totalVideoDurationSeconds += duration;
      if (progress?.isCompleted) {
        completedVideoSections += 1;
      }
    }

    return {
      watchedSeconds,
      totalVideoDurationSeconds,
      allVideosCompleted: completedVideoSections === videoSections.length,
      totalVideoSections: videoSections.length,
      completedVideoSections,
    };
  }

  async getProgramPillarWatchSummary(
    userId: string,
    programId: string,
  ): Promise<ProgramPillarWatchSummary> {
    const courses = await this.courseRepository.find({
      where: { programId, isBundle: false },
      select: ['id', 'title', 'programPillarIndex', 'level', 'marketData', 'createdAt'],
      order: { programPillarIndex: 'ASC', createdAt: 'ASC' },
    });

    const courseByPillar = new Map<number, (typeof courses)[number]>();
    for (const course of courses) {
      const pillarIndex = resolveCoursePillarIndex(course);
      if (!pillarIndex || courseByPillar.has(pillarIndex)) continue;
      courseByPillar.set(pillarIndex, course);
    }

    const pillarBreakdown: ProgramPillarWatchSummary['pillarBreakdown'] = [];
    let totalWatchedSeconds = 0;
    let totalVideoDurationSeconds = 0;
    let totalAllocatedCpeHours = 0;
    let hasAnyAllocatedCpe = false;

    for (const pillarIndex of [1, 2, 3]) {
      const course = courseByPillar.get(pillarIndex);
      if (!course) continue;

      const videoStats = await this.sumVideoWatchStatsForCourse(userId, course.id);
      const allocatedCpeHours = parseMarketDataCpeHours(course.marketData);
      const earnedCpeHours = computeCpeHoursFromWatchSeconds(videoStats.watchedSeconds);

      if (allocatedCpeHours != null) {
        totalAllocatedCpeHours += allocatedCpeHours;
        hasAnyAllocatedCpe = true;
      }
      totalWatchedSeconds += videoStats.watchedSeconds;
      totalVideoDurationSeconds += videoStats.totalVideoDurationSeconds;

      pillarBreakdown.push({
        pillarIndex,
        courseId: course.id,
        courseTitle: course.title,
        watchedSeconds: videoStats.watchedSeconds,
        watchedHours: secondsToWatchedHours(videoStats.watchedSeconds),
        watchedTime: formatSecondsToDisplayTime(videoStats.watchedSeconds),
        totalVideoDurationSeconds: videoStats.totalVideoDurationSeconds,
        allocatedCpeHours,
        earnedCpeHours,
        allVideosCompleted: videoStats.allVideosCompleted,
      });
    }

    const totalEarnedCpeHours = computeCpeHoursFromWatchSeconds(totalWatchedSeconds);

    return {
      pillarBreakdown,
      totalWatchedSeconds,
      totalWatchedHours: secondsToWatchedHours(totalWatchedSeconds),
      totalWatchedTime: formatSecondsToDisplayTime(totalWatchedSeconds),
      totalAllocatedCpeHours: hasAnyAllocatedCpe ? Math.round(totalAllocatedCpeHours * 100) / 100 : null,
      totalEarnedCpeHours,
      totalCpeHours: totalEarnedCpeHours,
    };
  }

  async getCourseEarnedCpeHours(
    userId: string,
    courseId: string,
  ): Promise<{
    earnedCpeHours: number;
    allocatedCpeHours: number | null;
    watchedSeconds: number;
    watchedTime: string;
  }> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'marketData'],
    });
    const videoStats = await this.sumVideoWatchStatsForCourse(userId, courseId);
    const allocatedCpeHours = parseMarketDataCpeHours(course?.marketData);
    const earnedCpeHours = computeCpeHoursFromWatchSeconds(videoStats.watchedSeconds);
    return {
      earnedCpeHours: Math.round(earnedCpeHours * 100) / 100,
      allocatedCpeHours,
      watchedSeconds: videoStats.watchedSeconds,
      watchedTime: formatSecondsToDisplayTime(videoStats.watchedSeconds),
    };
  }
}

