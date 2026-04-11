import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseSectionWatchProgressEntity } from './course-section-watch-progress.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';
import { CourseModuleEntity } from './course-module.entity';
import { UpdateCourseSectionWatchProgressDto } from './course-section-watch-progress.dto';

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
  constructor(
    @InjectRepository(CourseSectionWatchProgressEntity)
    private readonly sectionProgressRepository: Repository<CourseSectionWatchProgressEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly sectionRepository: Repository<CourseModuleSectionEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly moduleRepository: Repository<CourseModuleEntity>,
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

  private async resolveSectionTiming(
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

  private async getOrderedCourseSections(courseId: string): Promise<string[]> {
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
    const sectionByModule = new Map<string, string[]>();
    modules.forEach((module) => sectionByModule.set(module.id, []));
    sections.forEach((section) => {
      const existing = sectionByModule.get(section.moduleId) || [];
      existing.push(section.id);
      sectionByModule.set(section.moduleId, existing);
    });
    return modules.flatMap((module) => sectionByModule.get(module.id) || []);
  }

  private async resolveSectionLockedState(userId: string, courseId: string, sectionId: string): Promise<boolean> {
    const orderedSectionIds = await this.getOrderedCourseSections(courseId);
    const currentIndex = orderedSectionIds.findIndex((id) => id === sectionId);
    if (currentIndex <= 0) return false;
    const previousSectionId = orderedSectionIds[currentIndex - 1];
    const previousProgress = await this.sectionProgressRepository.findOne({
      where: { userId, courseId, sectionId: previousSectionId },
    });
    const resolvedTiming = await this.resolveSectionTiming(courseId, previousSectionId);
    const prevDone = this.deriveSectionProgressComputation(
      previousProgress ?? undefined,
      resolvedTiming.watchtimeSeconds,
      resolvedTiming.durationTimeSeconds,
    ).isCompleted;
    return !prevDone;
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
    const watchedForDisplay = Math.max(watchedFromCoverage, existing?.lastPositionSeconds ?? 0);
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

  async getAllSectionProgressForCourse(
    userId: string,
    courseId: string,
  ): Promise<Record<string, ReturnType<CourseSectionWatchProgressService['formatSectionProgressResponse']>>> {
    const orderedIds = await this.getOrderedCourseSections(courseId);
    if (orderedIds.length === 0) {
      return {};
    }

    const sections = await this.sectionRepository.find({
      where: { id: In(orderedIds) },
      select: ['id', 'moduleId', 'watchtime', 'durationTime'],
    });
    const moduleIds = [...new Set(sections.map((s) => s.moduleId))];
    const modules =
      moduleIds.length > 0
        ? await this.moduleRepository.find({
            where: { id: In(moduleIds) },
            select: ['id', 'courseId'],
          })
        : [];
    const moduleCourse = new Map(modules.map((m) => [m.id, m.courseId]));

    const resolvedTimingBySection = new Map<string, { watchtimeSeconds: number; durationTimeSeconds: number }>();
    sections.forEach((s) => {
      if (moduleCourse.get(s.moduleId) === courseId) {
        resolvedTimingBySection.set(s.id, {
          watchtimeSeconds: parseWatchtimeToSeconds(s.watchtime),
          durationTimeSeconds: parseWatchtimeToSeconds(s.durationTime),
        });
      }
    });

    const progressRows = await this.sectionProgressRepository.find({
      where: { userId, courseId },
    });
    const progressBySection = new Map(progressRows.map((r) => [r.sectionId, r]));

    const result: Record<string, ReturnType<CourseSectionWatchProgressService['formatSectionProgressResponse']>> = {};
    orderedIds.forEach((sectionId, idx) => {
      const prevId = idx > 0 ? orderedIds[idx - 1] : null;
      const prevExisting = prevId ? progressBySection.get(prevId) : undefined;
      const prevResolved = prevId
        ? resolvedTimingBySection.get(prevId) ?? { watchtimeSeconds: 0, durationTimeSeconds: 0 }
        : { watchtimeSeconds: 0, durationTimeSeconds: 0 };
      const previousSectionComplete =
        idx === 0 ||
        (prevId != null &&
          this.deriveSectionProgressComputation(
            prevExisting,
            prevResolved.watchtimeSeconds,
            prevResolved.durationTimeSeconds,
          ).isCompleted);
      const isLocked = idx > 0 && !previousSectionComplete;
      const existing = progressBySection.get(sectionId);
      const resolved = resolvedTimingBySection.get(sectionId) ?? {
        watchtimeSeconds: 0,
        durationTimeSeconds: 0,
      };
      result[sectionId] = this.formatSectionProgressResponse(
        courseId,
        sectionId,
        existing,
        resolved.watchtimeSeconds,
        resolved.durationTimeSeconds,
        isLocked,
      );
    });
    return result;
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
    const resolvedTiming = await this.resolveSectionTiming(courseId, sectionId);
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
    const existing = await this.sectionProgressRepository.findOne({
      where: { userId, courseId, sectionId },
    });
    const resolvedTiming = await this.resolveSectionTiming(courseId, sectionId);
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
      // Product behavior: progress should not fall behind explicit lastPosition (e.g. seek/save near end).
      watchedWithDelta = Math.max(covered, lastPos);
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
    const finalWatched = Math.max(0, computed.watched);
    const finalRemaining = Math.max(0, finalDuration - finalWatched);
    const finalPercent = finalDuration > 0
      ? Number(((finalWatched / finalDuration) * 100).toFixed(2))
      : 0;

    // Atomic upsert prevents duplicate-key races when multiple progress updates arrive together.
    await this.sectionProgressRepository.upsert(
      {
        ...(existing?.id ? { id: existing.id } : {}),
        userId,
        courseId,
        sectionId,
        lastPositionSeconds: computed.lastPosition,
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
    return this.getSectionProgress(userId, courseId, sectionId);
  }
}

