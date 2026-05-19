import { IsBoolean, IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class SaveSalesforceMembershipRecordDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstname!: string;

  @IsString()
  lastname!: string;

  @IsString()
  salesforceUsername!: string;

  @IsOptional()
  @IsString()
  salutation?: string;

  @IsOptional()
  @IsString()
  nameAsPerId?: string;

  @IsOptional()
  @IsString()
  draftUserId?: string;

  @IsOptional()
  @IsString()
  membershipOutcome?: string;

  @IsOptional()
  @IsBoolean()
  eligibilityIsSingaporePr?: boolean;

  @IsOptional()
  @IsBoolean()
  eligibilityIsIscaMember?: boolean;

  @IsOptional()
  @IsBoolean()
  eligibilityWantsMembership?: boolean;

  @IsOptional()
  @IsString()
  eligibilityType?: string;

  @IsOptional()
  @IsObject()
  eligibilitySnapshot?: Record<string, unknown>;
}
