//categories.dto.ts
import { IsOptional, IsNotEmpty, IsString, IsEnum, MaxLength } from 'class-validator';
import { CategoryStatus } from './categories.entity';

// For creating category - title required; description, image, slug optional
export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title!: string;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10_000_000)
    image?: string;

    @IsOptional()
    @IsString()
    @MaxLength(160)
    slug?: string;

    @IsOptional()
    @IsString()
    icon?: string;

    @IsOptional()
    @IsEnum(CategoryStatus)
    status?: CategoryStatus;
}

// For updating category - all fields optional
export class UpdateCategoryDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10_000_000)
    image?: string;

    @IsOptional()
    @IsString()
    @MaxLength(160)
    slug?: string;

    @IsOptional()
    @IsString()
    icon?: string;

    @IsOptional()
    @IsEnum(CategoryStatus)
    status?: CategoryStatus;
}

