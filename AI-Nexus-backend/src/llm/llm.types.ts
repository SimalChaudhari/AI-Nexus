export type LlmProvider = 'openrouter' | 'openai' | 'google' | 'ollama' | 'mock';

export type LlmUseCase = 'default' | 'chatbot' | 'student' | 'nric' | 'experienced';

export type LlmChatContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } };

export interface LlmChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | LlmChatContentPart[];
}

export interface LlmChatRequest {
    messages: LlmChatMessage[];
    useCase?: LlmUseCase;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface LlmChatResult {
    text: string;
    provider: LlmProvider;
    model: string;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}

export interface LlmProviderRuntimeConfig {
    provider: LlmProvider;
    apiKey: string;
    baseUrl: string;
    model: string;
    appName: string;
    appUrl: string;
    extraHeaders?: Record<string, string>;
}
