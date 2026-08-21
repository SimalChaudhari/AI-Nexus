import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

/** Same payload shape as Fort `UpdateCourseSectionWatchProgressDto`. */
export class UpdateIntlPathwayWatchProgressDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lastPositionSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  watchedSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  watchedDeltaSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsBoolean()
  markCompleted?: boolean;

  /** Optional merged or partial [[startSec,endSec], ...] timeline coverage (unique seconds). */
  @IsOptional()
  @IsArray()
  watchedCoverageRanges?: number[][];

  /** Optional LMS ids from planner catalog — used to backfill pathway module mapping. */
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;
}
