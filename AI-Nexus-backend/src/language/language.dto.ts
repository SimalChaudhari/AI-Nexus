import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLanguageDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  deleted?: boolean;
}

export class UpdateLanguageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  deleted?: boolean;
}
