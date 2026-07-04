import { IsArray, IsOptional, IsString } from 'class-validator';

export class SubmitAssignmentSubmissionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  typedAnswers?: string[];
}
