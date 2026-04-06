import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class StartCourseQuestionAttemptDto {
  @IsOptional()
  @IsUUID('4')
  moduleId?: string;
}

export class CourseQuestionAttemptAnswerDto {
  @IsUUID('4')
  questionId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  selectedIndex?: number;

  @IsOptional()
  @IsString()
  answer?: string;
}

export class CompleteCourseQuestionAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseQuestionAttemptAnswerDto)
  answers!: CourseQuestionAttemptAnswerDto[];
}

