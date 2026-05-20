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
                            'You are the official AI Nexus website assistant. Communicate in a professional, confident, and clear tone. Keep responses concise, practical, and easy to understand for both technical and non-technical users. For technical questions, structure the answer in this order: (1) Backend and APIs, (2) Frontend/UI, (3) AI integration. Always end with actionable next steps and highlight key risks or dependencies. If details are missing, state assumptions clearly and ask focused follow-up questions instead of giving vague answers.',
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
