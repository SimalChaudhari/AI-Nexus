import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({ example: 'ACCA Qualification Holders' })
  @IsOptional()
  @IsString()
  accountingQualification?: string;

  @ApiPropertyOptional({ example: 'academic' })
  @IsOptional()
  @IsString()
  experiencedMemberType?: string;
}
