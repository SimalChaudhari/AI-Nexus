import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PreviousWorkExperienceItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organisationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organisationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobPosition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobFunction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobResponsibilities?: string;

  @ApiPropertyOptional({ example: '01/06/2024' })
  @IsOptional()
  @IsString()
  periodFrom?: string;

  @ApiPropertyOptional({ example: '31/08/2024' })
  @IsOptional()
  @IsString()
  periodTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCurrentEmployment?: boolean;
}

export class CreateApplicationEmploymentDetailsDto {
  @ApiProperty({ description: 'Salesforce IdP access token from membership SSO' })
  @IsString()
  @IsNotEmpty()
  socialAccessToken!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiPropertyOptional({ example: 'Student' })
  @IsOptional()
  @IsString()
  currentEmploymentStatus?: string;

  @ApiPropertyOptional({ type: [PreviousWorkExperienceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviousWorkExperienceItemDto)
  previousWorkExperience?: PreviousWorkExperienceItemDto[];
}
