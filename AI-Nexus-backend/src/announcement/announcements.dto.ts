import { IsOptional, IsNotEmpty, IsString } from 'class-validator';

export class CreateAnnouncementDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;
}

export class UpdateAnnouncementDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    description?: string;
}

export class CreateCommentDto {
    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsOptional()
    @IsString()
    parentCommentId?: string;
}

export class UpdateCommentDto {
    @IsString()
    @IsNotEmpty()
    content!: string;
}
