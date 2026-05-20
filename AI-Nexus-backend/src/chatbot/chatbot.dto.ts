import { IsString, MaxLength } from 'class-validator';

export class ChatbotMessageDto {
    @IsString()
    @MaxLength(4000)
    message!: string;
}

