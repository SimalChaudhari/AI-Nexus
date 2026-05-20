import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { LlmProvider } from '../llm/llm.types';
import { ChatbotMessageDto } from './chatbot.dto';
import {
    CHATBOT_ERROR_MESSAGE,
    CHATBOT_MAX_TOKENS,
    CHATBOT_SYSTEM_PROMPT,
} from '../ai-prompts/chatbot-content';

@Injectable()
export class ChatbotService {
    constructor(private readonly llmService: LlmService) {}

    getStatus() {
        return {
            ...this.llmService.getPublicStatus('chatbot'),
            timestamp: new Date().toISOString(),
        };
    }

    async sendMessage(dto: ChatbotMessageDto): Promise<{
        reply: string;
        provider: LlmProvider;
        timestamp: string;
    }> {
        if (!this.llmService.isConfigured()) {
            return {
                reply: this.llmService.getConfigurationErrorMessage(),
                provider: this.llmService.getActiveProvider(),
                timestamp: new Date().toISOString(),
            };
        }

        try {
            const result = await this.llmService.chat({
                useCase: 'chatbot',
                messages: [
                    {
                        role: 'system',
                        content: CHATBOT_SYSTEM_PROMPT,
                    },
                    { role: 'user', content: String(dto.message || '') },
                ],
                maxTokens: CHATBOT_MAX_TOKENS,
            });

            return {
                reply: result.text,
                provider: result.provider,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                reply: error instanceof Error ? error.message : CHATBOT_ERROR_MESSAGE,
                provider: this.llmService.getActiveProvider(),
                timestamp: new Date().toISOString(),
            };
        }
    }
}
