import {
  IsOptional,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSpeaker?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCourse?: boolean;

  @IsOptional()
  @IsUUID('4')
  courseId?: string | null;

  @IsOptional()
  @IsUUID('4')
  speakerId?: string | null;

  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  rating!: number;

  @IsOptional()
  @IsString()
  feedback?: string | null;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSpeaker?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCourse?: boolean;

  @IsOptional()
  @IsUUID('4')
  courseId?: string | null;

  @IsOptional()
  @IsUUID('4')
  speakerId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsString()
  feedback?: string | null;
}
