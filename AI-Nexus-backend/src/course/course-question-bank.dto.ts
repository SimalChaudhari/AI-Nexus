import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CourseQuestionType } from './course-question-bank.entity';

export class CreateCourseQuestionBankDto {
  @IsOptional()
  @IsUUID('4')
  moduleId?: string;

  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsOptional()
  @IsEnum(CourseQuestionType)
  questionType?: CourseQuestionType;

  @ValidateIf((o) => (o.questionType ?? CourseQuestionType.Mcq) === CourseQuestionType.Mcq)
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  options?: string[];

  @ValidateIf((o) => (o.questionType ?? CourseQuestionType.Mcq) === CourseQuestionType.Mcq)
  @IsInt()
  @Min(0)
  @Type(() => Number)
  correctIndex?: number;

  @ValidateIf(
    (o) =>
      o.questionType === CourseQuestionType.TrueFalse ||
      o.questionType === CourseQuestionType.ShortText,
  )
  @IsString()
  @IsNotEmpty()
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateCourseQuestionBankDto {
  @IsOptional()
  @IsUUID('4')
  moduleId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  prompt?: string;

  @IsOptional()
  @IsEnum(CourseQuestionType)
  questionType?: CourseQuestionType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  correctIndex?: number;

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}
