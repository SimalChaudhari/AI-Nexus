import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
