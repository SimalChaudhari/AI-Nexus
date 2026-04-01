import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

// For creating tag
export class CreateTagDto {
    @IsString()
    @IsNotEmpty()
    title!: string;
}

// For updating tag - all fields optional
export class UpdateTagDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;
}

