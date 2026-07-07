import { IsOptional, IsNotEmpty, IsString, IsEnum, MaxLength } from 'class-validator';
import { ProgramStatus } from './programs.entity';

export class CreateProgramDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title!: string;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    description?: string;

    @IsOptional()
    @IsEnum(ProgramStatus)
    status?: ProgramStatus;
}

export class UpdateProgramDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    description?: string;

    @IsOptional()
    @IsEnum(ProgramStatus)
    status?: ProgramStatus;
}
