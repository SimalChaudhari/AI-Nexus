import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

@Module({
    imports: [LlmModule],
    controllers: [ChatbotController],
    providers: [ChatbotService],
    exports: [ChatbotService],
})
export class ChatbotModule {}

