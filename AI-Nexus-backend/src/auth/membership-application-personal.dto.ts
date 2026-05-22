import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ResidentialAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitNumber?: string;
}

class MailingAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mailingaddressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mailingaddressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mailingcity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mailingstate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mailingcountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mailingpostalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mailingunitNumber?: string;
}

export class CreateApplicationPersonalDetailsDto {
  @ApiProperty({ description: 'Salesforce IdP access token from membership SSO' })
  @IsString()
  @IsNotEmpty()
  socialAccessToken!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personalEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '15/05/1998' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameAsPerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailFriendlyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  citizenship?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subscriptionPreference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communicationPreference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  professionalInterest?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mobileCountryCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telMobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  otherCountryCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otherNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternateEmailAddress?: string;

  @ApiPropertyOptional({ type: ResidentialAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResidentialAddressDto)
  residentialAddress?: ResidentialAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  copyAddress?: boolean;

  @ApiPropertyOptional({ type: MailingAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MailingAddressDto)
  mailingAddress?: MailingAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voiceCalls?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textMessages?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faxMessages?: string;
}
