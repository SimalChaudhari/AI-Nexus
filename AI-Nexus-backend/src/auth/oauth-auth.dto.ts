// src/auth/oauth-auth.dto.ts
import { IsString, IsOptional, IsEmail, IsNotEmpty } from 'class-validator';

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
