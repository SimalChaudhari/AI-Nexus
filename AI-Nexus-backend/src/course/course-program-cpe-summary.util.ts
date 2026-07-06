import { resolveProgramPillarIndexFromLevel } from './program-pillar.util';

export type ProgramPillarWatchBreakdown = {
  pillarIndex: number;
  courseId: string;
  courseTitle: string;
  watchedSeconds: number;
  watchedHours: number;
  watchedTime: string;
  totalVideoDurationSeconds: number;
  allocatedCpeHours: number | null;
  earnedCpeHours: number;
  allVideosCompleted: boolean;
};

export type ProgramPillarWatchSummary = {
  pillarBreakdown: ProgramPillarWatchBreakdown[];
  totalWatchedSeconds: number;
  totalWatchedHours: number;
  totalWatchedTime: string;
  totalAllocatedCpeHours: number | null;
  totalEarnedCpeHours: number;
  /** @deprecated Use totalEarnedCpeHours — kept for older clients */
  totalCpeHours: number | null;
};

export function parseMarketDataCpeHours(marketData?: string | null): number | null {
  if (!marketData) return null;
  try {
    const parsed = typeof marketData === 'string' ? JSON.parse(marketData) : marketData;
    if (!parsed || typeof parsed !== 'object') return null;
    const raw = (parsed as Record<string, unknown>).cpeHours ?? (parsed as Record<string, unknown>).cpe ?? (parsed as Record<string, unknown>).hours;
    if (raw == null || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function secondsToWatchedHours(totalSeconds: number): number {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (seconds === 0) return 0;
  const hours = seconds / 3600;
  return Math.round(hours * 100) / 100;
}

export function formatSecondsToDisplayTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hh = Math.floor(safe / 3600);
  const mm = Math.floor((safe % 3600) / 60);
  const ss = safe % 60;
  if (hh > 0) {
    return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

/** CPE credit for a pillar: full allocation when every video lesson is complete, else proportional to unique watch coverage. */
export function computeEarnedCpeHours(
  watchedSeconds: number,
  totalVideoDurationSeconds: number,
  allocatedCpeHours: number | null,
  allVideosCompleted: boolean,
): number {
  if (allocatedCpeHours == null || allocatedCpeHours <= 0) return 0;
  if (allVideosCompleted) return allocatedCpeHours;
  if (totalVideoDurationSeconds <= 0 || watchedSeconds <= 0) return 0;
  const ratio = Math.min(1, watchedSeconds / totalVideoDurationSeconds);
  return Math.round(allocatedCpeHours * ratio * 100) / 100;
}

export function resolveCoursePillarIndex(course: {
  programPillarIndex?: number | null;
  level?: string | null;
}): number | null {
  if (course.programPillarIndex) {
    return course.programPillarIndex;
  }
  return resolveProgramPillarIndexFromLevel(course.level);
}
