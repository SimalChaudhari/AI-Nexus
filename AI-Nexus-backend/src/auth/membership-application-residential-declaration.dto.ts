import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { MembershipApplicationSocialTokenDto } from './membership-application-character-declaration.dto';

export class CreateResidentialDeclarationDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty({ example: 'Singapore' })
  @IsString()
  @IsNotEmpty()
  residentialDeclaration!: string;
}
