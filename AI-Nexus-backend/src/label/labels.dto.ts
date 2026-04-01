import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

// For creating label
export class CreateLabelDto {
    @IsString()
    @IsNotEmpty()
    title!: string;
}

// For updating label - all fields optional
export class UpdateLabelDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;
}

