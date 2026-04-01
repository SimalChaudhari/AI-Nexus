// src/auth/oauth-auth.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class OAuthExchangeDto {
  @IsString()
  code!: string;

  @IsString()
  @IsOptional()
  state?: string;
}
