import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIntlPathwayModuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  pillar!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minutes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  videoUrl?: string | null;

  @IsOptional()
  @IsArray()
  bullets?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  deleted?: boolean;
}

export class UpdateIntlPathwayModuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  pillar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  videoUrl?: string | null;

  @IsOptional()
  @IsArray()
  bullets?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  deleted?: boolean;
}

export class CreateIntlPathwayRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  blurb?: string | null;

  @IsOptional()
  @IsArray()
  reqExclude?: string[];

  @IsOptional()
  @IsArray()
  reqAdd?: string[];

  @IsOptional()
  @IsString()
  reqNote?: string | null;

  @IsOptional()
  @IsObject()
  scores?: Record<string, number>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  deleted?: boolean;
}

export class UpdateIntlPathwayRoleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  blurb?: string | null;

  @IsOptional()
  @IsArray()
  reqExclude?: string[];

  @IsOptional()
  @IsArray()
  reqAdd?: string[];

  @IsOptional()
  @IsString()
  reqNote?: string | null;

  @IsOptional()
  @IsObject()
  scores?: Record<string, number>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  deleted?: boolean;
}
