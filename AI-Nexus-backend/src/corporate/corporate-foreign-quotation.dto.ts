import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CorporateForeignQuotationDto {
  @IsString()
  @MinLength(1, { message: 'Company name is required' })
  companyName!: string;

  @IsString()
  @MinLength(1, { message: 'Contact person is required' })
  contactPerson!: string;

  @IsEmail({}, { message: 'Enter a valid contact email address' })
  contactEmail!: string;

  @IsInt({ message: 'Estimated number of participants must be a whole number' })
  @Min(1, { message: 'Estimated number of participants must be at least 1' })
  @Type(() => Number)
  estimatedParticipants!: number;
}
