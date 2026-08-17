import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SkillExtraFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  key!: string;

  @IsString()
  @MaxLength(4000)
  value!: string;
}

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Name must be lowercase letters, numbers, and hyphens only',
  })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  license?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  sourceUrl?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillExtraFieldDto)
  extraFields?: SkillExtraFieldDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Name must be lowercase letters, numbers, and hyphens only',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  license?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  sourceUrl?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillExtraFieldDto)
  extraFields?: SkillExtraFieldDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
