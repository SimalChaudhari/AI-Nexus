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

  private resolveEffectiveDuration(
    resolvedSectionDuration: number,
    observedVideoDuration: number,
  ): number {
    const sectionDuration = Math.max(0, Math.floor(Number(resolvedSectionDuration) || 0));
    const videoDuration = Math.max(0, Math.floor(Number(observedVideoDuration) || 0));
    if (sectionDuration > 0 && videoDuration > 0) {
      // Never require more than actual playable video length.
      return Math.min(sectionDuration, videoDuration);
    }
    return Math.max(sectionDuration, videoDuration);
  }

  private async resolveSectionDurationSeconds(courseId: string, sectionId: string): Promise<number> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      select: ['id', 'moduleId', 'watchtime'],
    });
    if (!section) return 0;
    const module = await this.moduleRepository.findOne({
      where: { id: section.moduleId },
      select: ['id', 'courseId'],
    });
    if (!module || module.courseId !== courseId) return 0;
    return parseWatchtimeToSeconds(section.watchtime);
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
      select: ['isCompleted'],
    });
    return !previousProgress?.isCompleted;
  }

  private formatSectionProgressResponse(
    courseId: string,
    sectionId: string,
    existing: CourseSectionWatchProgressEntity | undefined,
    resolvedWatchtimeSeconds: number,
    isLocked: boolean,
  ) {
    const duration = this.resolveEffectiveDuration(
      resolvedWatchtimeSeconds,
      existing?.durationSeconds ?? 0,
    );
    const computed = this.buildComputed(
      existing?.lastPositionSeconds ?? 0,
      existing?.watchedSeconds ?? 0,
      duration,
    );
    const isCompleted = Boolean(existing?.isCompleted || computed.isCompleted);
    const isWatched = isCompleted;

    const useStored = Boolean(existing?.isCompleted && existing);
    const lastPos = useStored ? existing!.lastPositionSeconds : computed.lastPosition;
    const watched = useStored ? existing!.watchedSeconds : computed.watched;
    const dur = useStored ? existing!.durationSeconds : computed.duration;
    const remaining = useStored ? existing!.remainingSeconds : computed.remaining;
    const percent = useStored ? Number(existing!.completionPercent) : computed.percent;

    return {
      courseId,
      sectionId,
      lastPositionSeconds: lastPos,
      watchedSeconds: watched,
      durationSeconds: dur,
      remainingSeconds: remaining,
      completionPercent: percent,
      isCompleted,
      isWatched,
      isLocked,
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
      select: ['id', 'moduleId', 'watchtime'],
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

    const resolvedDurationBySection = new Map<string, number>();
    sections.forEach((s) => {
      if (moduleCourse.get(s.moduleId) === courseId) {
        resolvedDurationBySection.set(s.id, parseWatchtimeToSeconds(s.watchtime));
      }
    });

    const progressRows = await this.sectionProgressRepository.find({
      where: { userId, courseId },
    });
    const progressBySection = new Map(progressRows.map((r) => [r.sectionId, r]));

    const result: Record<string, ReturnType<CourseSectionWatchProgressService['formatSectionProgressResponse']>> = {};
    orderedIds.forEach((sectionId, idx) => {
      const prevId = idx > 0 ? orderedIds[idx - 1] : null;
      const prevRow = prevId ? progressBySection.get(prevId) : undefined;
      const isLocked = idx > 0 && !prevRow?.isCompleted;
      const existing = progressBySection.get(sectionId);
      const resolved = resolvedDurationBySection.get(sectionId) ?? 0;
      result[sectionId] = this.formatSectionProgressResponse(courseId, sectionId, existing, resolved, isLocked);
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
      };
    }
    const existing = await this.sectionProgressRepository.findOne({
      where: { userId, courseId, sectionId },
    });
    const resolvedDuration = await this.resolveSectionDurationSeconds(courseId, sectionId);
    const isLocked = await this.resolveSectionLockedState(userId, courseId, sectionId);
    return this.formatSectionProgressResponse(courseId, sectionId, existing ?? undefined, resolvedDuration, isLocked);
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
    const resolvedDuration = await this.resolveSectionDurationSeconds(courseId, sectionId);
    const incomingDuration = typeof dto.durationSeconds === 'number' ? dto.durationSeconds : 0;
    const observedDuration = Math.max(existing?.durationSeconds ?? 0, incomingDuration);
    const duration = this.resolveEffectiveDuration(resolvedDuration, observedDuration);
    const baseWatched = existing?.watchedSeconds ?? 0;
    const absoluteWatched = typeof dto.watchedSeconds === 'number' ? dto.watchedSeconds : baseWatched;
    const watchedWithDelta = absoluteWatched + (typeof dto.watchedDeltaSeconds === 'number' ? dto.watchedDeltaSeconds : 0);
    const lastPos = typeof dto.lastPositionSeconds === 'number' ? dto.lastPositionSeconds : existing?.lastPositionSeconds ?? 0;
    const computed = this.buildComputed(lastPos, watchedWithDelta, duration);
    const now = new Date();
    const reachedEndByPosition = duration > 0 && computed.lastPosition >= duration - 1;
    const explicitCompletion = dto.markCompleted === true;
    const isCompleted = explicitCompletion || computed.isCompleted || reachedEndByPosition;
    const isWatched = Boolean(existing?.isCompleted || isCompleted);
    const finalDuration = isCompleted
      ? Math.max(computed.duration, computed.lastPosition, computed.watched, 1)
      : computed.duration;
    const finalWatched = isCompleted
      ? Math.max(computed.watched, finalDuration)
      : computed.watched;
    const finalRemaining = isCompleted ? 0 : Math.max(0, finalDuration - finalWatched);
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
        durationSeconds: finalDuration,
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

