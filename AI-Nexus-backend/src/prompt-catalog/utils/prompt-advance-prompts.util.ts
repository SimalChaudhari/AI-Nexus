import axios from 'axios';

export interface PromptAdvancePromptItem {
  title: string;
  prompt: string;
}

export interface PromptAdvanceCategoryItem {
  category: string;
  prompts: PromptAdvancePromptItem[];
}

export interface PromptAdvancePromptsJsonResponse {
  source: string;
  totalCategories: number;
  totalPrompts: number;
  categories: PromptAdvanceCategoryItem[];
}

export type PromptAdvanceAssistant = 'chatgpt' | 'claude' | 'gemini';

export async function fetchPromptAdvancePromptsJson(): Promise<PromptAdvancePromptsJsonResponse> {
  return fetchPromptAdvancePromptsJsonByAssistant('chatgpt');
}

export async function fetchPromptAdvancePromptsJsonByAssistant(
  assistant: PromptAdvanceAssistant
): Promise<PromptAdvancePromptsJsonResponse> {
  const source = `https://promptadvance.club/${assistant}-prompts`;
  const titlePrefixByAssistant: Record<PromptAdvanceAssistant, string> = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
  };
  const titlePrefix = titlePrefixByAssistant[assistant];
  const response = await axios.get<string>(source, {
    timeout: 30000,
    headers: {
      'User-Agent': 'AI-Nexus-Backend/1.0 (+prompt-json-endpoint)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  const html = response.data || '';
  const categoryHeadingRegex = new RegExp(`<h2[^>]*>\\s*(${titlePrefix} Prompts for[\\s\\S]*?)<\\/h2>`, 'gi');
  const headingMatches = [...html.matchAll(categoryHeadingRegex)];

  const categories = headingMatches
    .map((match, index) => {
      const categoryStart = match.index ?? 0;
      const nextCategoryStart = headingMatches[index + 1]?.index ?? html.length;
      const sectionHtml = html.slice(categoryStart, nextCategoryStart);
      const category = normalizeText(decodeHtml(stripHtml(match[1] || '')));
      const prompts = extractPromptsFromCategoryHtml(sectionHtml);
      return { category, prompts };
    })
    .filter((item) => item.category && item.prompts.length > 0);

  const totalPrompts = categories.reduce((sum, category) => sum + category.prompts.length, 0);

  return {
    source,
    totalCategories: categories.length,
    totalPrompts,
    categories,
  };
}

function extractPromptsFromCategoryHtml(sectionHtml: string): PromptAdvancePromptItem[] {
  const titleRegex = /<h3[^>]*>\s*([\s\S]*?)<\/h3>/gi;
  const titleMatches = [...sectionHtml.matchAll(titleRegex)];

  return titleMatches
    .map((titleMatch, index) => {
      const titleStart = titleMatch.index ?? 0;
      const nextTitleStart = titleMatches[index + 1]?.index ?? sectionHtml.length;
      const promptBlockHtml = sectionHtml.slice(titleStart, nextTitleStart);
      const codeMatch = promptBlockHtml.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
      const title = normalizeText(decodeHtml(stripHtml(titleMatch[1] || '')));
      const prompt = normalizeText(decodeHtml(stripHtml(codeMatch?.[1] || '')));
      return { title, prompt };
    })
    .filter((item) => item.title && item.prompt);
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function normalizeText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}
