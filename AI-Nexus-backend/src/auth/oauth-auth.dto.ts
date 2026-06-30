// src/auth/oauth-auth.dto.ts
import { IsString, IsOptional, IsEmail, IsNotEmpty, IsNumber, IsBoolean } from 'class-validator';

export class OAuthExchangeDto {
  @IsString()
  code!: string;

  @IsString()
  @IsOptional()
  state?: string;
}

/** Revoke eServices token when platform login is denied (no JWT session required). */
export class EndEservicesSessionDto {
  @IsString()
  @IsOptional()
  socialAccessToken?: string;
}

export class CreateSalesforceNexusUserDto {
  @IsString()
  salutation!: string;

  @IsString()
  first_name!: string;

  @IsString()
  last_name!: string;

  @IsString()
  name_as_per_id!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  id_type?: string;

  @IsString()
  @IsOptional()
  id_number?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  jobFunction?: string;

  @IsString()
  @IsOptional()
  countryOfResidence?: string;

  @IsNumber()
  @IsOptional()
  noOfYearOfRelevantWorkExperience?: number;

  @IsBoolean()
  @IsOptional()
  Is_paid?: boolean;

  @IsNumber()
  @IsOptional()
  paid_amount?: number;

  @IsString()
  @IsOptional()
  Paid_date?: string;
}

export class SetSalesforceNexusPasswordDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

export class SalesforceUserCheckNricDto {
  @IsString()
  @IsNotEmpty()
  nricNumber!: string;
}

export class SalesforceUserCheckEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class UpdateSalesforceNexusUserDto {
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  nationality!: string;

  @IsString()
  @IsNotEmpty()
  nricNumber!: string;

  @IsString()
  @IsNotEmpty()
  idType!: string;
}
