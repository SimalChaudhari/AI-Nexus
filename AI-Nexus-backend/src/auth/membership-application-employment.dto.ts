import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MembershipApplicationSocialTokenDto } from './membership-application-character-declaration.dto';
import {
  MEMBERSHIP_PICKLIST_KEY_VALUES,
  type MembershipPicklistKey,
} from './membership-application/picklists';

export class WorkExperienceItemDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessRegistrationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  staffStrength?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  turnover?: string;
}

/** @deprecated Use WorkExperienceItemDto */
export class PreviousWorkExperienceItemDto extends WorkExperienceItemDto {}

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

  @ApiPropertyOptional({ example: 'Yes' })
  @IsOptional()
  @IsString()
  accreditedEmployerScheme?: string;

  @ApiPropertyOptional({ type: [WorkExperienceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceItemDto)
  currentWorkExperience?: WorkExperienceItemDto[];

  @ApiPropertyOptional({ type: [WorkExperienceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceItemDto)
  previousWorkExperience?: WorkExperienceItemDto[];
}

export class GetEmploymentPicklistOptionsDto extends MembershipApplicationSocialTokenDto {
  @ApiPropertyOptional({ enum: MEMBERSHIP_PICKLIST_KEY_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(MEMBERSHIP_PICKLIST_KEY_VALUES)
  picklistKey?: MembershipPicklistKey;

  @ApiPropertyOptional({ description: 'Deprecated — use picklistKey' })
  @IsOptional()
  @IsString()
  field?: string;
}

export class GetMembershipPicklistOptionsDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty({ enum: MEMBERSHIP_PICKLIST_KEY_VALUES })
  @IsString()
  @IsIn(MEMBERSHIP_PICKLIST_KEY_VALUES)
  picklistKey!: MembershipPicklistKey;
}
