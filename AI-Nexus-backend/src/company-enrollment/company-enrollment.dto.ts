import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertCompanyEnrollmentInviteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  companyCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** 0 = unlimited. Omit defaults to 0. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  maxEnrollment?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsDateString()
  qrValidTill?: string | null;
}

export class UpdateCompanyEnrollmentInviteDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  companyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  maxEnrollment?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsDateString()
  qrValidTill?: string | null;
}

export class ValidateCompanyEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  companyCode!: string;

  /** When true, QR expiry is enforced. */
  @IsOptional()
  @IsBoolean()
  viaQr?: boolean;
}
