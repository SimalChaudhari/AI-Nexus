import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  Min,
} from 'class-validator';

export class CreateCheckoutItemDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number; // in main currency unit (e.g. USD dollars)

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;
}

export class CreateCheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCheckoutItemDto)
  items!: CreateCheckoutItemDto[];

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false }, { message: 'successUrl must be a valid URL' })
  successUrl!: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false }, { message: 'cancelUrl must be a valid URL' })
  cancelUrl!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsString()
  currency?: string; // e.g. 'USD', 'GBP'
}
