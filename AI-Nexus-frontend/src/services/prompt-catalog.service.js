import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';

function getServerOrigin() {
  const base = String(CONFIG.site.serverUrl || '').trim();
  return base.replace(/\/api\/?$/, '');
}

function resolveUploadUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/uploads/')) {
    return `${getServerOrigin()}${value}`;
  }
  return value;
}

function normalizeHtmlWithUploadUrls(html) {
  const value = String(html || '');
  if (!value) return '';
  return value.replace(/(<img[^>]+src=["'])(\/uploads\/[^"']+)(["'][^>]*>)/gi, (_, before, src, after) => {
    return `${before}${resolveUploadUrl(src)}${after}`;
  });
}

function stripHtmlText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSections(sections, options = {}) {
  const { preservePromptHtml = false } = options;
  if (!Array.isArray(sections)) return [];
  return sections.map((section) => ({
    title: section.title || '',
    items: Array.isArray(section.items)
      ? section.items.map((item) => ({
          useCase: stripHtmlText(item.useCase || item.use_case || ''),
          prompt: preservePromptHtml
            ? normalizeHtmlWithUploadUrls(item.prompt || item.body || '')
            : stripHtmlText(item.prompt || item.body || ''),
        }))
      : [],
  }));
}

function getCatalogStats(sections) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const categoryCount = safeSections.length;
  const promptCount = safeSections.reduce((sum, s) => sum + (Array.isArray(s.items) ? s.items.length : 0), 0);
  return { categoryCount, promptCount };
}

function getAllSectionsFromCategoryGroups(categoryGroups) {
  if (!categoryGroups || typeof categoryGroups !== 'object') return [];
  return Object.values(categoryGroups)
    .flatMap((packSections) => normalizeSections(packSections))
    .filter(Boolean);
}

export const promptCatalogService = {
  async getPublicCatalog() {
    const response = await axios.get('/prompt-catalog');
    return response.data?.data || response.data || {};
  },

  async getProviderMetadataList() {
    try {
      const payload = await this.getPublicCatalog();
      const providers = payload.providers || [];
      if (!providers.length) {
        return [];
      }
      return providers.map((entry) => {
        const categoryGroups = entry.promptPacks || {};
        const sections = getAllSectionsFromCategoryGroups(categoryGroups);
        const { promptCount, categoryCount } = getCatalogStats(sections);
        const hasPrompts = promptCount > 0;
        const toolName = entry.title || entry.provider;
        const firstCategory = Object.keys(categoryGroups)[0] || 'default';
        return {
          id: entry.provider,
          promptPackId: firstCategory,
          title: stripHtmlText(entry.title || entry.provider),
          description: stripHtmlText(entry.description || ''),
          color: entry.color || '',
          bgColor: entry.bgColor || entry.color || '',
          icon: entry.icon || '',
          redirectUrl: entry.redirectUrl || '',
          detailTitle: stripHtmlText(entry.detailTitle || entry.title || entry.provider),
          description: hasPrompts
            ? stripHtmlText(entry.description || '')
            : `No prompts available for ${toolName} yet. Please check back soon.`,
          promptCount,
          categoryCount,
          hasPrompts,
        };
      });
    } catch {
      return [];
    }
  },

  async getProviderPromptDetail(providerId) {
    try {
      const payload = await this.getPublicCatalog();
      const row = (payload.providers || []).find((item) => item.provider === providerId);
      if (!row) {
        return null;
      }
      const categoryGroups = row.promptPacks || {};
      const selectedCategory = Object.keys(categoryGroups)[0];
      const sections = normalizeSections((selectedCategory && categoryGroups?.[selectedCategory]) || [], {
        preservePromptHtml: true,
      });
      const { promptCount } = getCatalogStats(sections);
      const resolvedSections =
        promptCount > 0
          ? sections
          : [{ title: 'No prompts yet', items: [{ useCase: '', prompt: 'No prompts are available for this provider right now.' }] }];
      return {
        title: stripHtmlText(row.detailTitle || row.title || providerId),
        subtitle: '',
        sections: resolvedSections,
        toolTitle: stripHtmlText(row.title || providerId),
        toolIcon: row.icon || '',
        redirectUrl: row.redirectUrl || '',
        color: row.color || '',
        bgColor: row.bgColor || row.color || '',
      };
    } catch {
      return null;
    }
  },

  async getAdminRows() {
    const response = await axios.get('/prompt-catalog/admin');
    const rows = response.data?.data || [];
    return rows.map((row) => ({
      ...row,
      useCase: normalizeHtmlWithUploadUrls(row.useCase || ''),
      prompt: normalizeHtmlWithUploadUrls(row.prompt || ''),
      category: row.category ?? row.packId ?? null,
      providers: Array.isArray(row.providers)
        ? row.providers.map((provider) =>
            typeof provider === 'string'
              ? { value: provider, label: provider, icon: '', color: '', bgColor: '' }
              : provider
          )
        : [],
      providerValues: Array.isArray(row.providers)
        ? row.providers.map((provider) => (typeof provider === 'string' ? provider : provider?.value)).filter(Boolean)
        : [],
    }));
  },

  async createRow(payload) {
    const response = await axios.post('/prompt-catalog', payload);
    return response.data?.item || response.data;
  },

  async updateRow(id, payload) {
    const response = await axios.put(`/prompt-catalog/update/${id}`, payload);
    return response.data?.item || response.data;
  },

  async deleteRow(id) {
    const response = await axios.delete(`/prompt-catalog/delete/${id}`);
    return response.data;
  },

  async getAdminProviderProfiles() {
    const response = await axios.get('/prompt-catalog/providers/admin');
    return response.data?.data || [];
  },

  async getAdminProviderOptions() {
    const response = await axios.get('/prompt-catalog/providers/options/admin');
    return response.data?.data || [];
  },

  async createProviderProfile(payload) {
    const response = await axios.post('/prompt-catalog/providers', payload);
    return response.data?.item || response.data;
  },

  async updateProviderProfile(id, payload) {
    const response = await axios.put(`/prompt-catalog/providers/update/${id}`, payload);
    return response.data?.item || response.data;
  },

  async deleteProviderProfile(id) {
    const response = await axios.delete(`/prompt-catalog/providers/delete/${id}`);
    return response.data;
  },

  async uploadPromptImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post('/prompt-catalog/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return resolveUploadUrl(response.data?.url || '');
  },
};
