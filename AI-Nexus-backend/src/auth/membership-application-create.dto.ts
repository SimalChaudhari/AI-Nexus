import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateApplicationNexusDto {
  @ApiProperty({ description: 'Salesforce IdP access token from membership SSO' })
  @IsString()
  @IsNotEmpty()
  socialAccessToken!: string;

  @ApiProperty({ example: '001fV000009XewGQAS' })
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({ example: 'CA_Application' })
  @IsString()
  @IsNotEmpty()
  recordTypeName!: string;

  @ApiProperty({ example: 'ACCA Qualification Holders' })
  @IsString()
  @IsNotEmpty()
  accountingQualification!: string;
}
