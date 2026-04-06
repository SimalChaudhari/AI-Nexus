import axios from 'src/utils/axios';

export const PROMPT_PROVIDERS = [
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    icon: 'simple-icons:openai',
    color: '#10a37f',
    bgColor: 'linear-gradient(90deg, #10a37f 0%, #2dd4bf 100%)',
  },
  {
    id: 'claude',
    title: 'Claude',
    icon: 'simple-icons:anthropic',
    color: '#d97706',
    bgColor: 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)',
  },
  {
    id: 'gemini',
    title: 'Gemini',
    icon: 'simple-icons:googlegemini',
    color: '#2563eb',
    bgColor: 'linear-gradient(90deg, #2563eb 0%, #8b5cf6 100%)',
  },
];

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toSections(categories) {
  if (!Array.isArray(categories)) return [];
  return categories.map((category) => ({
    title: normalizeText(category.category || 'Prompts'),
    items: Array.isArray(category.prompts)
      ? category.prompts.map((prompt) => ({
          useCase: normalizeText(prompt.title || ''),
          prompt: normalizeText(prompt.prompt || ''),
        }))
      : [],
  }));
}

async function fetchProviderPrompts(providerId) {
  const response = await axios.get(`/prompt-catalog/external/prompts-json/${providerId}`);
  return response.data || {};
}

/**
 * Wrappers to consume external Prompt Advance JSON endpoints.
 */
export async function getProviderMetadataList() {
  const payloads = await Promise.all(
    PROMPT_PROVIDERS.map(async (provider) => {
      try {
        const data = await fetchProviderPrompts(provider.id);
        return { provider, data };
      } catch {
        return { provider, data: null };
      }
    })
  );

  return payloads.map(({ provider, data }) => ({
    id: provider.id,
    title: provider.title,
    description: `Curated ${provider.title} prompts from Prompt Advance.`,
    color: provider.color || '',
    bgColor: provider.bgColor || '',
    icon: provider.icon,
    redirectUrl: '',
    detailTitle: provider.title,
    promptCount: Number(data?.totalPrompts || 0),
    categoryCount: Number(data?.totalCategories || 0),
    hasPrompts: Number(data?.totalPrompts || 0) > 0,
  }));
}

export async function getProviderPromptDetail(providerId) {
  const provider = PROMPT_PROVIDERS.find((entry) => entry.id === providerId);
  if (!provider) return null;

  try {
    const data = await fetchProviderPrompts(providerId);
    return {
      title: `${provider.title} Prompts`,
      subtitle: '',
      sections: toSections(data?.categories),
      toolTitle: provider.title,
      toolIcon: provider.icon,
      redirectUrl: '',
      color: provider.color || '',
      bgColor: provider.bgColor || '',
    };
  } catch {
    return null;
  }
}
