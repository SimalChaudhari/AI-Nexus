import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateIntlMembershipSettingsDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  baseAmountSgd?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  voucherDiscountAmountSgd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referralLinkPath?: string;
}

export class IntlValidatePromoDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  countryOfResidence?: string;
}

export class IntlCreateCheckoutDto {
  @IsUUID()
  @IsNotEmpty()
  draftUserId!: string;

  @IsOptional()
  @IsString()
  signupAccessToken?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  successUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  cancelUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  promoCode?: string;

  @IsOptional()
  @IsBoolean()
  paymentConsent?: boolean;
}

export class IntlConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  ref!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;
}
