import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

/** Student membership APIs accept optional member SSO token; backend falls back to integration token. */
export class StudentMembershipOptionalTokenDto {
  @ApiPropertyOptional({ description: 'Optional Salesforce IdP access token from membership SSO' })
  @IsOptional()
  @IsString()
  socialAccessToken?: string;
}

export class StudentMembershipApplicationIdDto extends StudentMembershipOptionalTokenDto {
  @ApiProperty({ example: 'a0IfV000000dxpqUAA' })
  @IsString()
  @IsNotEmpty()
  applicationId!: string;
}

export class StudentMembershipUserCheckDto extends StudentMembershipOptionalTokenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  matriculationNumber?: string;
}

export class StudentMembershipApplicationPayloadDto extends StudentMembershipOptionalTokenDto {
  @ApiPropertyOptional({ description: 'Existing application id for update/submit' })
  @IsOptional()
  @IsString()
  applicationId?: string;

  @ApiProperty({ description: 'Student membership application body forwarded to Salesforce' })
  @IsObject()
  applicationData!: Record<string, unknown>;
}

/** Final submit — PATCH applicationsubmit/{id} only (no application body). */
export class StudentMembershipSubmitDto extends StudentMembershipApplicationIdDto {}
