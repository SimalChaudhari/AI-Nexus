import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class MembershipApplicationSocialTokenDto {
  @ApiProperty({ description: 'Salesforce IdP access token from membership SSO' })
  @IsString()
  @IsNotEmpty()
  socialAccessToken!: string;
}

export class CreateCharacterReferenceDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstReferenceName!: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  firstReferenceYearsKnown!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstReferenceRelationship!: string;

  @ApiProperty({ example: 65 })
  @IsNumber()
  firstReferenceCountryCode!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstReferenceContactNo!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstReferenceEmailAddress!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstReferenceNameOfAccountancyBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstReferenceMembershipId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  secondReferenceName!: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  secondReferenceYearsKnown!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  secondReferenceRelationship!: string;

  @ApiProperty({ example: 65 })
  @IsNumber()
  secondReferenceCountryCode!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  secondReferenceContactNo!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  secondReferenceEmailAddress!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondReferenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondReferenceCompanyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondReferencePositionTitle?: string;
}

export class CreateDeclarationDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty({ enum: ['Yes', 'No'] })
  @IsString()
  @IsNotEmpty()
  convictedOfAnyCriminalOffence!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  criminalConvictionDetails?: string;

  @ApiProperty({ enum: ['Yes', 'No'] })
  @IsString()
  @IsNotEmpty()
  bankruptcy!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankruptcyDetails?: string;

  @ApiProperty({ enum: ['Yes', 'No'] })
  @IsString()
  @IsNotEmpty()
  subjectOfAnyInvestigation!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  investigationDetails?: string;

  @ApiProperty({ enum: ['Yes', 'No'] })
  @IsString()
  @IsNotEmpty()
  refusedEntryToAnyProfessionalBody!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refusedEntryProfessionalBodyDetails?: string;

  @ApiProperty({ enum: ['Yes', 'No'] })
  @IsString()
  @IsNotEmpty()
  memberOfISCAPreviously!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousISCAembershipDetails?: string;

  @ApiProperty({ enum: ['Yes', 'No'] })
  @IsString()
  @IsNotEmpty()
  cpeComplianceDeclaration!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonForNonComplianceOther?: string;

  @ApiProperty()
  @IsBoolean()
  pdpaPolicy!: boolean;

  @ApiProperty()
  @IsBoolean()
  infoIsTrueAndComplete!: boolean;

  @ApiProperty()
  @IsBoolean()
  acknowledgeNonRefundableAdmissionFee!: boolean;
}
