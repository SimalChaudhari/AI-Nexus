import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, QueryFailedError } from 'typeorm';
import { CourseEntity, CourseLevel } from './courses.entity';
import { CourseSectionWatchProgressEntity } from './course-section-watch-progress.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';
import { CourseModuleEntity } from './course-module.entity';
import { UpdateCourseSectionWatchProgressDto } from './course-section-watch-progress.dto';

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
  const sorted = ranges
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number])
    .filter(([s, e]) => e > s && Number.isFinite(s) && Number.isFinite(e))
    .sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (!last || s > last[1]) out.push([s, e]);
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

function coverageMeasureSeconds(ranges: [number, number][], duration: number): number {
  const merged = duration > 0 ? clipCoverageRangesToDuration(ranges, duration) : mergeCoverageRanges(ranges);
  let total = 0;
  for (const [s, e] of merged) total += e - s;
  return Math.floor(Math.max(0, total));
}

/**
 * Module / section rules (product):
 * - Sequential unlock: section N+1 stays locked until section N is completed.
 * - Sticky completion: once isCompleted is true for a section, it never becomes false (re-access always allowed).
 * - Content lock: a section that is already completed is never treated as locked for the learner.
 * - Completion threshold: admin "watch time" (section.watchtime) capped by real video length — full video not required.
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
    // UI/display timeline should be full video length (never watchtime threshold).
    return Math.max(fromSection, fromObserved, fromStored);
  }

  private resolveCompletionRequiredSeconds(
    watchtimeSeconds: number,
    fullVideoDurationSeconds: number,
  ): number {
    const wt = Math.max(0, Math.floor(Number(watchtimeSeconds) || 0));
    const full = Math.max(0, Math.floor(Number(fullVideoDurationSeconds) || 0));
    if (wt > 0 && full > 0) return Math.min(wt, full);
    if (wt > 0) return wt;
    return full;
  }

  /**
   * When admin leaves watchtime empty, required equals the stored/catalog duration, but HTML5 / YouTube
   * often tops out ~1s short (e.g. 0:59 played vs 01:00 in CMS). Allow 1s slack only in that "full video" mode;
   * explicit admin watch caps stay exact.
   */
  private watchProgressMeetsCompletionRequirement(
    watched: number,
    required: number,
    adminWatchtimeCapSeconds: number,
  ): boolean {
    if (!(required > 0)) return false;
    if (watched >= required) return true;
    if (adminWatchtimeCapSeconds > 0) return false;
    if (required < 5) return false;
    return watched >= required - 1;
  }

  private async resolveCourseTiming(
    courseId: string,
    sectionId: string,
  ): Promise<{ watchtimeSeconds: number; durationTimeSeconds: number }> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      select: ['id', 'moduleId', 'watchtime', 'durationTime'],
    });
    if (!section) return { watchtimeSeconds: 0, durationTimeSeconds: 0 };
    const module = await this.moduleRepository.findOne({
      where: { id: section.moduleId },
      select: ['id', 'courseId'],
    });
    if (!module || module.courseId !== courseId) return { watchtimeSeconds: 0, durationTimeSeconds: 0 };
    return {
      watchtimeSeconds: parseWatchtimeToSeconds(section.watchtime),
      durationTimeSeconds: parseWatchtimeToSeconds(section.durationTime),
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
          select: ['id', 'moduleId', 'sortOrder', 'watchtime', 'durationTime'],
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
    const progressBySection = new Map(progressRows.map((r) => [r.sectionId, r]));

    const resolvedTimingBySection = new Map<string, { watchtimeSeconds: number; durationTimeSeconds: number }>();
    sections.forEach((section) => {
      resolvedTimingBySection.set(section.id, {
        watchtimeSeconds: parseWatchtimeToSeconds(section.watchtime),
        durationTimeSeconds: parseWatchtimeToSeconds(section.durationTime),
      });
    });

    const result: Record<string, ReturnType<CourseSectionWatchProgressService['formatSectionProgressResponse']>> = {};
    modules.forEach((module) => {
      const moduleSections = sectionsByModule.get(module.id) || [];
      moduleSections.forEach((section) => {
        // Pillar 1–3: every lesson unlocked from the start.
        const isLocked = false;
        result[section.id] = this.formatSectionProgressResponse(
          courseId,
          section.id,
          progressBySection.get(section.id),
          resolvedTimingBySection.get(section.id)?.watchtimeSeconds ?? 0,
          resolvedTimingBySection.get(section.id)?.durationTimeSeconds ?? 0,
          isLocked,
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
  ) {
    const duration = this.resolveDisplayDurationSeconds(
      resolvedDurationTimeSeconds,
      existing?.durationSeconds ?? 0,
      existing?.videoDurationSeconds ?? 0,
    );
    const required = this.resolveCompletionRequiredSeconds(resolvedWatchtimeSeconds, duration);
    const storedRanges = clipCoverageRangesToDuration(
      parseCoverageRangePairs(existing?.watchedCoverageRanges),
      duration,
    );
    const legacyWatchedCap = duration > 0 ? Math.min(duration, existing?.watchedSeconds ?? 0) : (existing?.watchedSeconds ?? 0);
    const watchedFromCoverage =
      storedRanges.length > 0 ? coverageMeasureSeconds(storedRanges, duration) : legacyWatchedCap;
    const watchedForDisplay = watchedFromCoverage;
    const computed = this.buildComputed(
      existing?.lastPositionSeconds ?? 0,
      watchedForDisplay,
      duration,
    );
    const isCompleted = Boolean(
      existing?.isCompleted ||
        this.watchProgressMeetsCompletionRequirement(
          computed.watched,
          required,
          resolvedWatchtimeSeconds,
        ),
    );
    const isWatched = isCompleted;
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
  ) {
    const { duration, storedRanges, legacyWatchedCap, computed, isCompleted, isWatched } =
      this.deriveSectionProgressComputation(existing, resolvedWatchtimeSeconds, resolvedDurationTimeSeconds);

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
    const existing = await this.sectionProgressRepository.findOne({
      where: { userId, courseId, sectionId },
    });
    const resolvedTiming = await this.resolveCourseTiming(courseId, sectionId);
    const isLocked = await this.resolveSectionLockedState(userId, courseId, sectionId);
    return this.formatSectionProgressResponse(
      courseId,
      sectionId,
      existing ?? undefined,
      resolvedTiming.watchtimeSeconds,
      resolvedTiming.durationTimeSeconds,
      isLocked,
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
      select: ['id', 'moduleId'],
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
    const existing = await this.sectionProgressRepository.findOne({
      where: { userId, courseId, sectionId },
    });
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
    const explicitCompletion = dto.markCompleted === true;
    const stickyCompleted = Boolean(existing?.isCompleted);
    const reachedRequired = this.watchProgressMeetsCompletionRequirement(
      computed.watched,
      requiredForCompletion,
      resolvedTiming.watchtimeSeconds,
    );
    const isCompleted = stickyCompleted || explicitCompletion || reachedRequired;
    const isWatched = Boolean(existing?.isCompleted || isCompleted);
    const finalDuration = Math.max(computed.duration, 0);
    const previousLastPosition = Math.max(0, Number(existing?.lastPositionSeconds || 0));
    const previousWatched = Math.max(0, Number(existing?.watchedSeconds || 0));
    // Keep resume/watch progress monotonic to avoid rollback from out-of-order updates (pause + pagehide race).
    const finalLastPosition = Math.max(previousLastPosition, Math.max(0, computed.lastPosition));
    const finalWatched = Math.max(previousWatched, Math.max(0, computed.watched));
    const finalRemaining = Math.max(0, finalDuration - finalWatched);
    const finalPercent =
      finalDuration > 0 ? Number(((finalWatched / finalDuration) * 100).toFixed(2)) : 0;

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
}

