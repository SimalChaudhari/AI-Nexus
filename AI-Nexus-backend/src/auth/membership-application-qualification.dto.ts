import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MembershipApplicationSocialTokenDto {
  @ApiProperty({ description: 'Salesforce IdP access token from membership SSO' })
  @IsString()
  @IsNotEmpty()
  socialAccessToken!: string;
}

export class CreateAcademicQualificationDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty({ example: 'Singapore' })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({ example: 'National University of Singapore' })
  @IsString()
  @IsNotEmpty()
  institutionName!: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  otherInstitutionName?: string;

  @ApiProperty({ example: 'Bachelor of Accountancy' })
  @IsString()
  @IsNotEmpty()
  academicQualification!: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  otherAcademicQualification?: string;

  @ApiProperty({ example: '01/08/2018' })
  @IsString()
  @IsNotEmpty()
  dateOfCourseCommencement!: string;

  @ApiProperty({ example: '30/06/2022' })
  @IsString()
  @IsNotEmpty()
  dateOfGraduation!: string;
}

export class CreateProfessionalQualificationDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  institutionName!: string;

  @ApiProperty({ example: '06/05/2026' })
  @IsString()
  @IsNotEmpty()
  dateOfCourseCommencement!: string;

  @ApiProperty({ example: '18/05/2026' })
  @IsString()
  @IsNotEmpty()
  dateOfGraduation!: string;
}

export class CreateAtoMembershipDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  atoName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  membershipStatus?: string;

  @ApiPropertyOptional({ example: '01/01/2020' })
  @IsOptional()
  @IsString()
  dateOfAdmissionAsFullMember?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  membershipNo?: string;
}

export class CreateOpbMembershipDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty({ example: 'Chartered Institute of Management Accountants (CIMA)' })
  @IsString()
  @IsNotEmpty()
  institutionName!: string;

  @ApiPropertyOptional({ example: 'Fellow' })
  @IsOptional()
  @IsString()
  membershipStatus?: string;

  @ApiPropertyOptional({ example: 'CIMA12345' })
  @IsOptional()
  @IsString()
  membershipId?: string;
}
