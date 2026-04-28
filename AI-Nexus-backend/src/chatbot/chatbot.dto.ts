import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatbotMessageDto {
    @IsString()
    @MaxLength(4000)
    message!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    provider?: string;
}

