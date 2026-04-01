import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCourseSectionWatchProgressDto {
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
}

