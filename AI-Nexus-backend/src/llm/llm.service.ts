import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    LlmChatMessage,
    LlmChatRequest,
    LlmChatResult,
    LlmProvider,
    LlmProviderRuntimeConfig,
    LlmUseCase,
} from './llm.types';

const PROVIDER_DEFAULTS: Record<Exclude<LlmProvider, 'mock'>, { baseUrl: string; model: string }> = {
    openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-4o-mini',
    },
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
    },
    google: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: 'gemini-2.0-flash',
    },
    ollama: {
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'llama3.2',
    },
};

@Injectable()
export class LlmService implements OnModuleInit {
    private readonly logger = new Logger(LlmService.name);

    onModuleInit(): void {
        const status = this.getPublicStatus('chatbot');
        this.logger.log(
            `AI ready: provider=${status.provider} model=${status.model} baseUrl=${status.baseUrl} configured=${status.configured}`,
        );
    }

    getPublicStatus(useCase: LlmUseCase = 'default') {
        const provider = this.resolveProvider();
        if (provider === 'mock') {
            return {
                provider,
                model: 'mock',
                baseUrl: '',
                configured: false,
            };
        }

        const runtime = this.getProviderRuntimeConfig(provider, useCase);
        return {
            provider: runtime.provider,
            model: runtime.model,
            baseUrl: runtime.baseUrl,
            configured: provider === 'ollama' ? true : Boolean(runtime.apiKey),
        };
    }

    getActiveProvider(): LlmProvider {
        return this.resolveProvider();
    }

    isConfigured(provider?: LlmProvider): boolean {
        const active = provider || this.resolveProvider();
        if (active === 'mock') return false;
        if (active === 'ollama') return true;
        return Boolean(this.getProviderRuntimeConfig(active).apiKey);
    }

    getConfigurationErrorMessage(): string {
        const provider = this.resolveProvider();
        return `AI provider "${provider}" is not configured. Set AI_PROVIDER and the matching API key (for example AI_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, or GOOGLE_AI_API_KEY).`;
    }

    getMessageText(content: unknown): string {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content
                .map((part) => {
                    if (typeof part === 'string') return part;
                    if (part && typeof part === 'object' && 'text' in part) {
                        return String((part as { text?: unknown }).text || '');
                    }
                    return '';
                })
                .join('\n')
                .trim();
        }
        return '';
    }

    getChatbotFriendlyErrorMessage(provider: LlmProvider, status: number, errorText: string): string {
        const normalized = String(errorText || '').toLowerCase();

        if (normalized.includes('insufficient_quota') || normalized.includes('exceeded your current quota')) {
            if (provider === 'openai') {
                return 'OpenAI quota exceeded. Add billing/credits at platform.openai.com or switch AI_PROVIDER to google/openrouter in backend .env and restart the server.';
            }
            if (provider === 'openrouter') {
                return 'OpenRouter could not complete the request because the upstream OpenAI model has no quota. Try AI_PROVIDER=google with a Gemini API key, or add OpenRouter/OpenAI credits.';
            }
            return `The configured AI provider (${provider}) rejected the request due to quota/billing limits. Check your API plan and restart the backend after updating .env.`;
        }

        if (status === 401 || normalized.includes('api key') || normalized.includes('invalid')) {
            return `AI provider "${provider}" rejected the API key. Verify GOOGLE_AI_API_KEY (or the key for your provider) in .env and restart the backend.`;
        }

        if (status === 404 && provider === 'google') {
            return 'Gemini model not found. Try AI_MODEL=gemini-2.0-flash-001 or gemini-1.5-flash in .env.';
        }

        return '';
    }

    getFriendlyErrorMessage(status: number, errorText: string, context: 'single' | 'pair' = 'single'): string {
        const rawMessage = String(errorText || '').trim();
        const normalized = rawMessage.toLowerCase();
        const extractionLabel = context === 'pair' ? 'document pair extraction' : 'document extraction';

        if (
            status === 402
            || normalized.includes('requires more credits')
            || normalized.includes('insufficient credits')
            || normalized.includes('fewer max_tokens')
        ) {
            return 'Automatic NRIC verification is temporarily unavailable because the document OCR service has insufficient credits. Please try again later.';
        }

        if (status === 429 || normalized.includes('rate limit')) {
            return 'Automatic NRIC verification is temporarily busy. Please wait a moment and try again.';
        }

        if (status >= 500) {
            return 'Automatic NRIC verification is temporarily unavailable. Please try again later.';
        }

        if (normalized.includes('api key') || normalized.includes('not configured')) {
            return 'Automatic NRIC verification is not configured correctly right now. Please contact support.';
        }

        if (normalized.includes('model') && normalized.includes('not')) {
            return `Automatic NRIC verification failed during ${extractionLabel}. The configured AI model is unavailable.`;
        }

        return `Automatic NRIC verification failed during ${extractionLabel}. Please try again with clearer images.`;
    }

    async chat(request: LlmChatRequest): Promise<LlmChatResult> {
        const provider = this.resolveProvider();
        if (provider === 'mock') {
            const preview = this.getMessageText(request.messages.at(-1)?.content).slice(0, 120);
            return {
                text: `AI provider is set to mock. Message preview: "${preview}"`,
                provider,
                model: 'mock',
            };
        }

        const runtime = this.getProviderRuntimeConfig(provider, request.useCase, request.model);
        if (provider !== 'ollama' && !runtime.apiKey) {
            throw new Error(this.getConfigurationErrorMessage());
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(runtime.extraHeaders || {}),
        };

        if (runtime.apiKey) {
            headers.Authorization = `Bearer ${runtime.apiKey}`;
        }

        const body: Record<string, unknown> = {
            model: runtime.model,
            messages: request.messages,
        };

        if (typeof request.temperature === 'number') {
            body.temperature = request.temperature;
        }

        const maxTokens = request.maxTokens ?? this.resolveMaxTokens(request.useCase);
        if (typeof maxTokens === 'number') {
            body.max_tokens = maxTokens;
        }

        const response = await fetch(`${runtime.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            const friendly = this.getChatbotFriendlyErrorMessage(provider, response.status, errorText);
            const error = new Error(
                friendly || `AI request failed (${response.status}) via ${provider} at ${runtime.baseUrl}: ${errorText || 'Unknown error'}`,
            );
            (error as Error & { status?: number }).status = response.status;
            throw error;
        }

        const data = await response.json();
        const text =
            this.getMessageText(data?.choices?.[0]?.message?.content)
            || String(data?.choices?.[0]?.text || '')
            || '';

        return {
            text: text || 'No response received from AI provider.',
            provider,
            model: runtime.model,
            usage: data?.usage,
        };
    }

    private resolveProvider(): LlmProvider {
        const explicit = String(
            process.env.AI_PROVIDER || process.env.LLM_PROVIDER || process.env.CHATBOT_PROVIDER || '',
        )
            .trim()
            .toLowerCase();

        if (this.isKnownProvider(explicit)) {
            return explicit;
        }

        if (String(process.env.OPENROUTER_API_KEY || '').trim()) return 'openrouter';
        if (String(process.env.OPENAI_API_KEY || '').trim()) return 'openai';
        if (String(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '').trim()) return 'google';
        if (String(process.env.OLLAMA_BASE_URL || process.env.AI_BASE_URL || '').trim()) return 'ollama';

        return 'mock';
    }

    private isKnownProvider(value: string): value is LlmProvider {
        return value === 'openrouter'
            || value === 'openai'
            || value === 'google'
            || value === 'ollama'
            || value === 'mock';
    }

    private getProviderRuntimeConfig(
        provider: Exclude<LlmProvider, 'mock'>,
        useCase: LlmUseCase = 'default',
        modelOverride?: string,
    ): LlmProviderRuntimeConfig {
        const defaults = PROVIDER_DEFAULTS[provider];
        const appName = String(process.env.AI_APP_NAME || process.env.OPENROUTER_APP_NAME || 'AI Nexus').trim();
        const appUrl = String(
            process.env.AI_APP_URL || process.env.OPENROUTER_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
        ).trim();

        const sharedApiKey = String(process.env.AI_API_KEY || '').trim();
        const sharedBaseUrl = String(process.env.AI_BASE_URL || '').trim().replace(/\/$/, '');

        if (provider === 'openrouter') {
            return {
                provider,
                apiKey: sharedApiKey || String(process.env.OPENROUTER_API_KEY || '').trim(),
                baseUrl: sharedBaseUrl || String(process.env.OPENROUTER_BASE_URL || defaults.baseUrl).trim().replace(/\/$/, ''),
                model: modelOverride || this.resolveModel(useCase, defaults.model),
                appName,
                appUrl,
                extraHeaders: {
                    'HTTP-Referer': appUrl,
                    'X-Title': appName,
                },
            };
        }

        if (provider === 'openai') {
            return {
                provider,
                apiKey: sharedApiKey || String(process.env.OPENAI_API_KEY || '').trim(),
                baseUrl: sharedBaseUrl || String(process.env.OPENAI_BASE_URL || defaults.baseUrl).trim().replace(/\/$/, ''),
                model: modelOverride || this.resolveModel(useCase, defaults.model),
                appName,
                appUrl,
            };
        }

        if (provider === 'google') {
            return {
                provider,
                apiKey:
                    sharedApiKey
                    || String(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '').trim(),
                baseUrl:
                    sharedBaseUrl
                    || String(process.env.GOOGLE_AI_BASE_URL || defaults.baseUrl).trim().replace(/\/$/, ''),
                model: modelOverride || this.resolveModel(useCase, defaults.model),
                appName,
                appUrl,
            };
        }

        return {
            provider: 'ollama',
            apiKey: sharedApiKey || String(process.env.OLLAMA_API_KEY || '').trim(),
            baseUrl:
                sharedBaseUrl
                || String(process.env.OLLAMA_BASE_URL || defaults.baseUrl).trim().replace(/\/$/, ''),
            model: modelOverride || this.resolveModel(useCase, defaults.model),
            appName,
            appUrl,
        };
    }

    private resolveModel(useCase: LlmUseCase, fallback: string): string {
        const candidates: string[] = [];
        const add = (...values: Array<string | undefined>) => {
            for (const value of values) {
                const trimmed = String(value || '').trim();
                if (trimmed) candidates.push(trimmed);
            }
        };

        if (useCase === 'chatbot') {
            add(process.env.AI_CHATBOT_MODEL, process.env.CHATBOT_MODEL, process.env.OPENROUTER_MODEL);
        } else if (useCase === 'student') {
            add(process.env.AI_STUDENT_MODEL, process.env.OPENROUTER_STUDENT_MODEL, process.env.OPENROUTER_MODEL);
        } else if (useCase === 'nric') {
            add(process.env.AI_NRIC_MODEL, process.env.OPENROUTER_MODEL);
        } else if (useCase === 'experienced') {
            add(
                process.env.AI_EXPERIENCED_MODEL,
                process.env.OPENROUTER_EXPERIENCED_MODEL,
                process.env.OPENROUTER_STUDENT_MODEL,
                process.env.OPENROUTER_MODEL,
            );
        }

        add(process.env.AI_MODEL, process.env.OPENROUTER_MODEL);

        return candidates[0] || fallback;
    }

    private resolveMaxTokens(useCase: LlmUseCase = 'default'): number | undefined {
        const read = (...keys: string[]) => {
            for (const key of keys) {
                const value = Number(process.env[key]);
                if (Number.isFinite(value) && value > 0) return Math.round(value);
            }
            return undefined;
        };

        if (useCase === 'student') {
            return read('AI_STUDENT_MAX_TOKENS', 'OPENROUTER_STUDENT_MAX_TOKENS');
        }
        if (useCase === 'nric') {
            return read('AI_NRIC_MAX_TOKENS', 'OPENROUTER_NRIC_MAX_TOKENS');
        }
        if (useCase === 'experienced') {
            return read('AI_EXPERIENCED_MAX_TOKENS', 'OPENROUTER_EXPERIENCED_MAX_TOKENS');
        }

        return undefined;
    }
}
