import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { LlmProvider } from '../llm/llm.types';
import { ChatbotMessageDto } from './chatbot.dto';

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
                        content:
                            'You are the AI Nexus technical assistant. Respond in a strong, professional, and implementation-focused style. For every technical query, reason in this order: (1) Backend impact and APIs, (2) Frontend/UI impact, (3) AI integration impact. Then provide a concise final answer with clear action steps, risks, and recommended next step. If information is missing, state assumptions explicitly and avoid vague advice.',
                    },
                    { role: 'user', content: String(dto.message || '') },
                ],
            });

            return {
                reply: result.text,
                provider: result.provider,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                reply: error instanceof Error ? error.message : 'Chatbot request failed.',
                provider: this.llmService.getActiveProvider(),
                timestamp: new Date().toISOString(),
            };
        }
    }
}
