import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ArrayMinSize } from 'class-validator';
import { PromptProvider } from './prompt-catalog.entity';

export class CreatePromptCatalogItemDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(PromptProvider, { each: true })
  providers!: PromptProvider[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  sectionTitle!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sectionOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  itemOrder?: number;

  @IsString()
  useCase!: string;

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromptCatalogItemDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(PromptProvider, { each: true })
  providers?: PromptProvider[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sectionTitle?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sectionOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  itemOrder?: number;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePromptProviderProfileDto {
  @IsEnum(PromptProvider)
  provider!: PromptProvider;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  color!: string;

  @IsString()
  bgColor!: string;

  @IsString()
  icon!: string;

  @IsString()
  detailTitle!: string;

  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromptProviderProfileDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  bgColor?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  detailTitle?: string;

  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
