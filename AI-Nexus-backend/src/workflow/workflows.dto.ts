import { IsOptional, IsNotEmpty, IsString, IsArray } from 'class-validator';

// For creating workflow
export class CreateWorkflowDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    flowData?: any;

    @IsOptional()
    @IsString()
    labelId?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tagIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tagTitles?: string[]; // Tag titles for new tags to be created
}

// For updating workflow - all fields optional
export class UpdateWorkflowDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    flowData?: any;

    @IsOptional()
    @IsString()
    labelId?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tagIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tagTitles?: string[]; // Tag titles for new tags to be created
}

