import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ManualVerifyAssignmentSubmissionDto {
  @ApiProperty({ description: 'Admin manual pass/fail decision' })
  @IsBoolean()
  passed!: boolean;

  @ApiPropertyOptional({ description: 'Optional feedback for the learner' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  feedback?: string;
}
