import { Injectable } from '@nestjs/common';
import { ChatbotMessageDto } from './chatbot.dto';

type ChatbotProvider = 'mock' | 'flowise' | 'openai' | 'ollama' | 'openrouter';

@Injectable()
export class ChatbotService {
    async sendMessage(dto: ChatbotMessageDto): Promise<{
        reply: string;
        provider: ChatbotProvider;
        timestamp: string;
    }> {
        const configuredProvider = (process.env.CHATBOT_PROVIDER || 'mock').toLowerCase();
        const provider = this.resolveProvider(configuredProvider, dto.provider);

        // Structure-first scaffold:
        // this switch is where we will later plug real providers (Flowise/OpenAI/Ollama).
        switch (provider) {
            case 'openrouter': {
                return this.sendViaOpenRouter(dto.message);
            }
            case 'flowise':
            case 'openai':
            case 'ollama':
            case 'mock':
            default: {
                return {
                    reply: this.buildMockReply(dto.message),
                    provider,
                    timestamp: new Date().toISOString(),
                };
            }
        }
    }

    private resolveProvider(envProvider: string, requestedProvider?: string): ChatbotProvider {
        const raw = (requestedProvider || envProvider || 'mock').toLowerCase();
        if (raw === 'flowise' || raw === 'openai' || raw === 'ollama' || raw === 'openrouter') return raw;
        return 'mock';
    }

    private buildMockReply(message: string): string {
        const text = String(message || '').trim();
        const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
        return `Chatbot scaffold is ready. You said: "${preview}". Next step is connecting a real provider (Flowise/OpenAI/Ollama).`;
    }

    private async sendViaOpenRouter(message: string): Promise<{
        reply: string;
        provider: ChatbotProvider;
        timestamp: string;
    }> {
        const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
        if (!apiKey) {
            return {
                reply: 'OpenRouter is not configured. Please set OPENROUTER_API_KEY in backend environment.',
                provider: 'openrouter',
                timestamp: new Date().toISOString(),
            };
        }

        const baseUrl = String(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').trim().replace(/\/$/, '');
        const model = String(process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini').trim();
        const appName = String(process.env.OPENROUTER_APP_NAME || 'AI Nexus').trim();
        const appUrl = String(process.env.OPENROUTER_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3039').trim();

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': appUrl,
                'X-Title': appName,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are the AI Nexus technical assistant. Respond in a strong, professional, and implementation-focused style. For every technical query, reason in this order: (1) Backend impact and APIs, (2) Frontend/UI impact, (3) Flowise/AI integration impact. Then provide a concise final answer with clear action steps, risks, and recommended next step. If information is missing, state assumptions explicitly and avoid vague advice.',
                    },
                    { role: 'user', content: String(message || '') },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                reply: `OpenRouter request failed (${response.status}): ${errorText || 'Unknown error'}`,
                provider: 'openrouter',
                timestamp: new Date().toISOString(),
            };
        }

        const data = await response.json();
        const reply =
            data?.choices?.[0]?.message?.content ||
            data?.choices?.[0]?.text ||
            'No response received from OpenRouter.';

        return {
            reply,
            provider: 'openrouter',
            timestamp: new Date().toISOString(),
        };
    }
}

