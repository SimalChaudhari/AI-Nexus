import { IsOptional, IsNotEmpty, IsString } from 'class-validator';

export class CreateAiForumPostDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;
}

export class UpdateAiForumPostDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    description?: string;
}

export class CreateAiForumCommentDto {
    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsOptional()
    @IsString()
    parentCommentId?: string;
}

export class UpdateAiForumCommentDto {
    @IsString()
    @IsNotEmpty()
    content!: string;
}

