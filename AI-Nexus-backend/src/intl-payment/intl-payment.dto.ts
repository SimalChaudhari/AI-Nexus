import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
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
  studentAmountSgd?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  voucherDiscountAmountSgd?: number;

  /** Exact promo payable amount keyed by ISO country code (e.g. { TH: 2006 }). */
  @IsOptional()
  @IsObject()
  promoAmountsByCountry?: Record<string, number>;

  /** Manual per-country base + discount pricing. */
  @IsOptional()
  @IsObject()
  countryPricing?: Record<string, {
    basePrice?: number | null;
    discountPrice?: number | null;
    studentBasePrice?: number | null;
    studentDiscountPrice?: number | null;
    active?: boolean;
    promoCode?: string | null;
    promoPricesByCode?: Record<string, {
      discountPrice?: number | null;
      studentDiscountPrice?: number | null;
    }>;
  }>;

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

  @IsOptional()
  @IsString()
  @IsIn(['student', 'full'])
  membershipType?: string;
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

  @IsString()
  @IsNotEmpty()
  @IsIn(['student', 'full'])
  membershipType!: string;

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
