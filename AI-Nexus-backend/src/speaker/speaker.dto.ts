import {
  IsOptional,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateSpeakerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  profileimage?: string;

  @IsOptional()
  @IsString()
  about?: string;
}

export class UpdateSpeakerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  profileimage?: string;

  @IsOptional()
  @IsString()
  about?: string;
}
