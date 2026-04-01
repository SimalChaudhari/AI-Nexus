//categories.dto.ts
import { IsOptional, IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { CategoryStatus } from './categories.entity';

// For creating category - title required, icon and status optional
export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

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
    title?: string;

    @IsOptional()
    @IsString()
    icon?: string;

    @IsOptional()
    @IsEnum(CategoryStatus)
    status?: CategoryStatus;
}

