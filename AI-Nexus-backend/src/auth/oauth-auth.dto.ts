// src/auth/oauth-auth.dto.ts
import { IsString, IsOptional, IsEmail, IsNotEmpty, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  jobFunction?: string;

  @IsString()
  @IsOptional()
  countryOfResidence?: string;

  @IsNumber()
  @IsOptional()
  noOfYearOfRelevantWorkExperience?: number;

  @IsBoolean()
  @IsOptional()
  Is_paid?: boolean;

  @IsNumber()
  @IsOptional()
  paid_amount?: number;

  @IsString()
  @IsOptional()
  Paid_date?: string;

  /** Server-signed proof from POST /payments/verify-membership-payment — required when Is_paid is true. */
  @IsString()
  @IsOptional()
  paymentProofToken?: string;
}

/** POST /services/apexrest/signupfornexus — company QR / pre-paid corporate enrollment. */
export class SignupSalesforceForNexusDto {
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
  password!: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  jobFunction?: string;

  @IsString()
  @IsOptional()
  countryOfResidence?: string;

  @IsString()
  @IsOptional()
  companyCode?: string;

  @IsNumber()
  @IsOptional()
  noOfYearOfRelevantWorkExperience?: number;
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

/** PUT /services/apexrest/v1/nexus-payment/update */
export class UpdateSalesforceNexusPaymentDto {
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @IsBoolean()
  @IsOptional()
  Is_Paid?: boolean;

  @IsNumber()
  Paid_Amount!: number;

  @IsString()
  @IsOptional()
  Paid_Date?: string;
}

export class UpdateSalesforceNexusUserDto {
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  nationality!: string;

  @IsString()
  @IsNotEmpty()
  nricNumber!: string;

  @IsString()
  @IsNotEmpty()
  idType!: string;
}

/** Corporate HR register — Salesforce account block */
export class CreateCorporateSalesforceAccountDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  uenNumber!: string;

  @IsString()
  @IsOptional()
  businessCountry?: string;

  @IsString()
  @IsOptional()
  businessPostalCode?: string;

  @IsString()
  @IsOptional()
  businessUnitNumber?: string;

  @IsString()
  @IsOptional()
  businessBuildingName?: string;

  @IsString()
  @IsOptional()
  businessStreetName?: string;

  @IsString()
  @IsOptional()
  businessCity?: string;

  @IsString()
  @IsOptional()
  businessState?: string;

  @IsString()
  @IsOptional()
  organisationType?: string;

  @IsBoolean()
  @IsOptional()
  isPaidCorporate?: boolean;

  @IsBoolean()
  @IsOptional()
  isSme?: boolean;

  @IsBoolean()
  @IsOptional()
  isProvidesProfessionalServices?: boolean;
}

/** Corporate HR register — Salesforce contact block */
export class CreateCorporateSalesforceContactDto {
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  mobilePhone?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  iscaConferencesEvents?: string;

  @IsBoolean()
  @IsOptional()
  practitionersBulletin?: boolean;

  @IsBoolean()
  @IsOptional()
  iscaAccountifyBulletin?: boolean;

  @IsBoolean()
  @IsOptional()
  financialForensicFocus?: boolean;

  @IsBoolean()
  @IsOptional()
  businessFinanceBulletin?: boolean;

  @IsBoolean()
  @IsOptional()
  monthlyCALab?: boolean;

  @IsBoolean()
  @IsOptional()
  specialISCAOfferings?: boolean;

  @IsBoolean()
  @IsOptional()
  participateInResearch?: boolean;

  @IsBoolean()
  @IsOptional()
  boardflixBulletin?: boolean;

  @IsBoolean()
  @IsOptional()
  monthlyISCharteredAccountantJournal?: boolean;

  @IsBoolean()
  @IsOptional()
  scaqNewsletterUpdates?: boolean;

  @IsBoolean()
  @IsOptional()
  studentMemberNewsletterUpdates?: boolean;

  @IsBoolean()
  @IsOptional()
  theISCABuzzCorporateMembersNewsletter?: boolean;
}

export class CreateCorporateSalesforceAccountAndContactDto {
  @ValidateNested()
  @Type(() => CreateCorporateSalesforceAccountDto)
  account!: CreateCorporateSalesforceAccountDto;

  @ValidateNested()
  @Type(() => CreateCorporateSalesforceContactDto)
  contact!: CreateCorporateSalesforceContactDto;
}

export class CheckCorporateSalesforceAccountDto {
  @IsString()
  @IsOptional()
  uenNumber?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
