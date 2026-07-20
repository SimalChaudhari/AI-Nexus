import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateAffiliateCodeDto {
  /** Single code field: tried as affiliate code first, then voucher code. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  affiliateCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  voucherCode?: string;
}

export class EnsureVoucherCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;
}

export class UpsertVoucherCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Max users / redemptions. Null/omit = unlimited. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  maxRedemptions?: number | null;

  /** Expiry datetime (ISO). Null/omit = never expires. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsDateString()
  expiresAt?: string | null;
}

export class UpdateVoucherCodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  maxRedemptions?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsDateString()
  expiresAt?: string | null;
}

export class TrackAffiliateClickDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  affiliateCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  landingPath?: string;
}

export class AffiliateSignupCheckoutDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]+$/, {
    message: 'Username must contain both letters and numbers, and no special characters',
  })
  username!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  /** Single code field: tried as affiliate code first, then voucher code. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  affiliateCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  voucherCode?: string;

  @IsString()
  @IsNotEmpty()
  successUrl!: string;

  @IsString()
  @IsNotEmpty()
  cancelUrl!: string;
}

export class ConfirmAffiliatePaymentDto {
  @IsString()
  @IsNotEmpty()
  ref!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
