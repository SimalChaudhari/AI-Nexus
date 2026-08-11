import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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
  @MaxLength(20)
  @Matches(/^\+?[0-9\s()-]*$/, {
    message: 'Contact number must contain digits only',
  })
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

  /** student | full — required for checkout access filtering. */
  @IsString()
  @IsNotEmpty()
  @IsIn(['student', 'full'])
  membershipType!: string;

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
