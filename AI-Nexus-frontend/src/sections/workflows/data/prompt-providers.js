import axios from 'src/utils/axios';

import chatgptIcon from 'src/assets/ai/chatgpt.webp';
import claudeIcon from 'src/assets/ai/claude.webp';
import geminiIcon from 'src/assets/ai/gemini.webp';

export const PROMPT_PROVIDER_ICONS = {
  chatgpt: chatgptIcon,
  claude: claudeIcon,
  gemini: geminiIcon,
};

export const PROMPT_PROVIDERS = [
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    imageSrc: chatgptIcon,
    icon: 'simple-icons:openai',
    color: '#10a37f',
    bgColor: 'linear-gradient(90deg, #10a37f 0%, #2dd4bf 100%)',
  },
  {
    id: 'claude',
    title: 'Claude',
    imageSrc: claudeIcon,
    icon: 'simple-icons:anthropic',
    color: '#d97706',
    bgColor: 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)',
  },
  {
    id: 'gemini',
    title: 'Gemini',
    imageSrc: geminiIcon,
    icon: 'simple-icons:googlegemini',
    color: '#2563eb',
    bgColor: 'linear-gradient(90deg, #2563eb 0%, #8b5cf6 100%)',
  },
];

export const PROMPT_PROVIDER_IDS = new Set(PROMPT_PROVIDERS.map((p) => p.id));

async function fetchProviderPrompts(providerId) {
  const response = await axios.get(`/prompt-catalog/provider/${providerId}`);
  return response.data?.data || null;
}

/**
 * Provider metadata for UI tabs (static). Prompt bodies load from DB via `provider/:provider`.
 */
export async function getProviderMetadataList() {
  return PROMPT_PROVIDERS.map((provider) => ({
    id: provider.id,
    title: provider.title,
    description: `${provider.title} prompt pack`,
    color: provider.color || '',
    bgColor: provider.bgColor || '',
    icon: provider.icon,
    imageSrc: provider.imageSrc,
    redirectUrl: '',
    detailTitle: provider.title,
    promptCount: 0,
    categoryCount: 0,
    hasPrompts: true,
  }));
}

export async function getProviderPromptDetail(providerId) {
  const provider = PROMPT_PROVIDERS.find((entry) => entry.id === providerId);
  if (!provider) return null;

  try {
    const data = await fetchProviderPrompts(providerId);
    if (data) return data;
    return null;
  } catch {
    return null;
  }
}
