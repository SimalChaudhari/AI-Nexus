// src/auth/oauth-auth.dto.ts
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class OAuthExchangeDto {
  @IsString()
  code!: string;

  @IsString()
  @IsOptional()
  state?: string;
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
}

export class SetSalesforceNexusPasswordDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}
