import axios from 'src/utils/axios';

import chatgptIcon from 'src/assets/ai/chatgpt.webp';
import claudeIcon from 'src/assets/ai/claude.webp';
import geminiIcon from 'src/assets/ai/gemini.webp';

export const PROMPT_PROVIDER_ICONS = {
  chatgpt: chatgptIcon,
  claude: claudeIcon,
  gemini: geminiIcon,
};

/** Brand palettes: accent `color`, soft surfaces `lightColor*`, CTA `bgColor*`. */
export const PROMPT_PROVIDERS = [
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    imageSrc: chatgptIcon,
    icon: 'simple-icons:openai',
    color: '#159981',
    lightColor: '#e8faf7',
    lightColorHover: '#d4f5f0',
    buttonBorder: '#5eead4',
    bgColor: 'linear-gradient(90deg, #159981 0%, #30D2B4 100%)',
    bgColorHover: 'linear-gradient(90deg, #128070 0%, #28b9a0 100%)',
  },
  {
    id: 'claude',
    title: 'Claude',
    imageSrc: claudeIcon,
    icon: 'simple-icons:anthropic',
    color: '#d97706',
    lightColor: '#fffbeb',
    lightColorHover: '#fef3c7',
    buttonBorder: '#fcd34d',
    bgColor: 'linear-gradient(90deg, #ea580c 0%, #f59e0b 100%)',
    bgColorHover: 'linear-gradient(90deg, #c2410c 0%, #d97706 100%)',
  },
  {
    id: 'gemini',
    title: 'Gemini',
    imageSrc: geminiIcon,
    icon: 'simple-icons:googlegemini',
    color: '#7B61FF',
    lightColor: '#F0F4FF',
    lightColorHover: '#E8EDFF',
    buttonBorder: '#C4B5FD',
    bgColor: 'linear-gradient(90deg, #7B61FF 0%, #9B7BFF 100%)',
    bgColorHover: 'linear-gradient(90deg, #6B51EF 0%, #8B6BEF 100%)',
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
