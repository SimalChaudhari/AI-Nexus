import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseWatchProgressEntity } from './course-watch-progress.entity';
import { CourseEntity } from './courses.entity';
import { CourseModuleEntity } from './course-module.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';

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

@Injectable()
export class CourseWatchProgressService {
  constructor(
    @InjectRepository(CourseWatchProgressEntity)
    private readonly progressRepository: Repository<CourseWatchProgressEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly moduleRepository: Repository<CourseModuleEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly sectionRepository: Repository<CourseModuleSectionEntity>,
  ) {}

  private async getOrderedCourseIds(): Promise<string[]> {
    const rows = await this.courseRepository.find({
      select: ['id', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
    return rows.map((c) => c.id);
  }

  async getPreviousCourseId(courseId: string): Promise<string | null> {
    const ids = await this.getOrderedCourseIds();
    const index = ids.indexOf(courseId);
    if (index <= 0) return null;
    return ids[index - 1];
  }

  async getCourseTotalDurationSeconds(courseId: string): Promise<number> {
    const modules = await this.moduleRepository.find({
      where: { courseId },
      select: ['id'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (modules.length === 0) return 0;
    const moduleIds = modules.map((m) => m.id);
    const sections = await this.sectionRepository
      .createQueryBuilder('s')
      .where('s.moduleId IN (:...moduleIds)', { moduleIds })
      .select(['s.watchtime'])
      .getMany();
    return sections.reduce((acc, s) => acc + parseWatchtimeToSeconds(s.watchtime), 0);
  }

  private buildComputedProgress(watchedSeconds: number, totalDurationSeconds: number) {
    const total = Math.max(0, Math.floor(Number(totalDurationSeconds) || 0));
    const watchedRaw = Math.max(0, Math.floor(Number(watchedSeconds) || 0));
    const watched = total > 0 ? Math.min(total, watchedRaw) : watchedRaw;
    const remaining = Math.max(0, total - watched);
    const percent = total > 0 ? Number(((watched / total) * 100).toFixed(2)) : 0;
    const isCompleted = total > 0 ? watched >= total : false;
    return { watched, total, remaining, percent, isCompleted };
  }

  private formatSecondsToHhMmSs(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hh = Math.floor(safe / 3600);
    const mm = Math.floor((safe % 3600) / 60);
    const ss = safe % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  async getUserCourseProgress(userId: string, courseId: string) {
    const totalDurationSeconds = await this.getCourseTotalDurationSeconds(courseId);
    const existing = await this.progressRepository.findOne({ where: { userId, courseId } });
    const computed = this.buildComputedProgress(existing?.watchedSeconds ?? 0, totalDurationSeconds);
    const status = computed.isCompleted ? 'Completed' : computed.watched > 0 ? 'In Progress' : 'Not Started';
    return {
      courseId,
      watchedSeconds: computed.watched,
      totalDurationSeconds: computed.total,
      remainingSeconds: computed.remaining,
      watchedTime: this.formatSecondsToHhMmSs(computed.watched),
      totalDuration: this.formatSecondsToHhMmSs(computed.total),
      remainingTime: this.formatSecondsToHhMmSs(computed.remaining),
      completionPercent: computed.percent,
      isCompleted: computed.isCompleted,
      status,
      lastAccessedAt: existing?.lastAccessedAt ?? null,
    };
  }

  async isCourseUnlockedForUser(userId: string, courseId: string): Promise<boolean> {
    const previousCourseId = await this.getPreviousCourseId(courseId);
    if (!previousCourseId) return true;
    const previous = await this.progressRepository.findOne({
      where: { userId, courseId: previousCourseId },
      select: ['isCompleted'],
    });
    return Boolean(previous?.isCompleted);
  }

  async getUnlockInfo(userId: string, courseId: string) {
    const previousCourseId = await this.getPreviousCourseId(courseId);
    if (!previousCourseId) {
      return { isLocked: false, previousCourseId: null };
    }
    const previousProgress = await this.getUserCourseProgress(userId, previousCourseId);
    // If previous course has no duration/content yet, it must not block next course.
    const previousHasNoTrackableDuration = Number(previousProgress.totalDurationSeconds || 0) <= 0;
    const isLocked = previousHasNoTrackableDuration ? false : !previousProgress.isCompleted;
    return { isLocked, previousCourseId, previousProgress };
  }
}

