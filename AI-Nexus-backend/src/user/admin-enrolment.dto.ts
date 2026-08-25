import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AdminEnrolmentApplyDto {
  @IsString()
  @IsNotEmpty()
  companyCode!: string;

  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsArray()
  rows!: Record<string, unknown>[];
}
