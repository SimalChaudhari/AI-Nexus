//courses.dto.ts
import { IsOptional, IsNotEmpty, IsString, IsEnum, IsBoolean, IsNumber, Min, IsArray, IsUUID, ValidateNested, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CourseLevel } from './courses.entity';

/** Section item when creating a course with modules (nested in module) */
export class CreateCourseSectionItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  watchtime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

/** Module item when creating a course with modules (optional in create payload) */
export class CreateCourseModuleItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseSectionItemDto)
  sections?: CreateCourseSectionItemDto[];
}

function toLanguageIdsArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.every((x) => typeof x === 'string') ? value : undefined;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : undefined;
    } catch {
      return value ? [value] : undefined;
    }
  }
  return undefined;
}

// For creating course - title required, other fields optional
// Note: image is handled separately via file upload, not in DTO
export class CreateCourseDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    image?: string; // File path (converted from file in controller)

    @IsOptional()
    @IsBoolean()
    freeOrPaid?: boolean;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    amount?: number;

    @IsOptional()
  @IsString()
  level?: string;

    /** Language IDs (UUIDs) this course is available in */
    @IsOptional()
    @Transform(({ value }) => toLanguageIdsArray(value))
    @IsArray()
    @IsUUID('4', { each: true })
    languageIds?: string[];

    @IsOptional()
    @IsString()
    marketData?: string;

    /** speaker IDs (UUIDs) - instructors for this course */
    @IsOptional()
    @Transform(({ value }) => toLanguageIdsArray(value))
    @IsArray()
    @IsUUID('4', { each: true })
    speakerIds?: string[];

    /** Optional: create modules and sections with the course (no need to save course first) */
    @IsOptional()
    @Transform(({ value }) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value.trim()) {
        try {
          const parsed = JSON.parse(value) as unknown;
          return Array.isArray(parsed) ? parsed : undefined;
        } catch {
          return undefined;
        }
      }
      return undefined;
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCourseModuleItemDto)
    modules?: CreateCourseModuleItemDto[];
}

// For updating course - all fields optional
export class UpdateCourseDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    image?: string | undefined; // null = delete image

    @IsOptional()
    @IsBoolean()
    freeOrPaid?: boolean;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    amount?: number;

    @IsOptional()
    @IsString()
    level?: string;

    @IsOptional()
    @Transform(({ value }) => toLanguageIdsArray(value))
    @IsArray()
    @IsUUID('4', { each: true })
    languageIds?: string[];

    @IsOptional()
    @IsString()
    marketData?: string;

    @IsOptional()
    @Transform(({ value }) => toLanguageIdsArray(value))
    @IsArray()
    @IsUUID('4', { each: true })
    speakerIds?: string[];
}

export class SeedDummyCoursesDto {
    @IsOptional()
    @IsArray()
    courses?: Array<{
        title?: string;
        description?: string;
        freeOrPaid?: boolean;
        amount?: number;
        level?: string;
        languageIds?: string[];
        marketData?: string;
    }>;
}

