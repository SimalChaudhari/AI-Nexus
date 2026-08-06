import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class IntlRegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  salutation!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(48)
  contactNumber?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  companyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  jobFunction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobFunctionOther?: string;

  @IsOptional()
  @IsString()
  yearsOfExperience?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  countryOfResidence!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  promoCode?: string;

  @IsBoolean()
  paymentConsent!: boolean;
}

export class IntlLoginDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
