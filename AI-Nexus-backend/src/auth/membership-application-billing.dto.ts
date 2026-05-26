import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { MembershipApplicationSocialTokenDto } from './membership-application-character-declaration.dto';

export class CreateMembershipBillingDto extends MembershipApplicationSocialTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({ example: 'Wooshpay' })
  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;

  @ApiProperty({ example: 'cs_test_abc123' })
  @IsString()
  @IsNotEmpty()
  wooshPayReferenceNo!: string;
}
