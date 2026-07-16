import axios from 'src/utils/axios';

export const promptCatalogService = {
  async getAdminCategoryGroups(params = {}) {
    const response = await axios.get('/prompt-catalog/admin/category-groups', { params });
    return {
      data: response?.data?.data || [],
      pagination: response?.data?.pagination || null,
    };
  },

  async getAdminCategoryOptions() {
    const result = await this.getAdminCategoryGroups({ page: 1, limit: 200 });
    const titles = (result.data || [])
      .map((row) => {
        const plain = String(row?.sampleSectionTitle || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (plain) return plain;
        if (row?.categoryKey === '__uncategorized__') return 'Uncategorized';
        return String(row?.categoryKey || '').trim();
      })
      .filter(Boolean);
    return [...new Set(titles)].sort((a, b) => a.localeCompare(b));
  },

  async getAdminPromptItems(params = {}) {
    const response = await axios.get('/prompt-catalog/items', { params });
    return {
      data: response?.data?.data || [],
      pagination: response?.data?.pagination || null,
    };
  },

  async createAdminPromptItem(payload) {
    const response = await axios.post('/prompt-catalog/admin/items', payload);
    return response?.data?.data || null;
  },

  async updateAdminPromptItem(id, payload) {
    const response = await axios.put(`/prompt-catalog/admin/items/${id}`, payload);
    return response?.data?.data || null;
  },

  async getAdminPromptItemById(id) {
    const response = await axios.get(`/prompt-catalog/admin/items/${id}`);
    return response?.data?.data || null;
  },

  async deleteAdminPromptItem(id) {
    const response = await axios.delete(`/prompt-catalog/admin/items/${id}`);
    return response?.data || { message: 'Prompt deleted successfully' };
  },

  async syncAdminPrompts() {
    const response = await axios.post('/prompt-catalog/admin/sync');
    return response?.data || { message: 'Prompts synced successfully' };
  },
};
