import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CheckCourseQuestionBankDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  selectedIndex?: number;

  @IsOptional()
  @IsString()
  answer?: string;
}
