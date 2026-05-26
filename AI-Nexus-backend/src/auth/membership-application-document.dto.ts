import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MembershipApplicationSocialTokenDto } from './membership-application-character-declaration.dto';

export class GetAvailableDocumentTypesDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;
}

export class UploadMembershipDocumentDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty({ example: 'NRIC/Passport (for foreigners)' })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiProperty({ example: 'passport.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ description: 'Base64-encoded file content (no data-URL prefix)' })
  @IsString()
  @IsNotEmpty()
  fileContent!: string;

  @ApiProperty({ example: 1024 })
  @IsNumber()
  fileSize!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otherDetails?: string;
}
