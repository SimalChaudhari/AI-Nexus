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

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignedUserIds?: string[];

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsString()
  referenceFileUrl?: string;

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsString()
  referenceFileName?: string;

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsString()
  questionFileUrl?: string;

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsString()
  questionFileName?: string;

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsString()
  answerSheetFileUrl?: string;

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsString()
  answerSheetFileName?: string;

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsString()
  guideFileUrl?: string;

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsString()
  guideFileName?: string;

  @ValidateIf((o) => o.questionType === CourseQuestionType.Assignment)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  passingPercentage?: number;

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
  @IsArray()
  @IsUUID('4', { each: true })
  assignedUserIds?: string[] | null;

  @IsOptional()
  @IsString()
  referenceFileUrl?: string | null;

  @IsOptional()
  @IsString()
  referenceFileName?: string | null;

  @IsOptional()
  @IsString()
  questionFileUrl?: string | null;

  @IsOptional()
  @IsString()
  questionFileName?: string | null;

  @IsOptional()
  @IsString()
  answerSheetFileUrl?: string | null;

  @IsOptional()
  @IsString()
  answerSheetFileName?: string | null;

  @IsOptional()
  @IsString()
  guideFileUrl?: string | null;

  @IsOptional()
  @IsString()
  guideFileName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  passingPercentage?: number | null;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}
