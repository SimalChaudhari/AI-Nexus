import axios from 'src/utils/axios';

const transformLanguage = (item) => ({
  id: item.id,
  title: item.title || '',
  deleted: !!item.deleted,
  createdAt: item.createdAt || null,
  updatedAt: item.updatedAt || null,
});

export const languageService = {
  async getAll() {
    const response = await axios.get('/languages');
    const list = response.data?.data || response.data || [];
    return Array.isArray(list) ? list.map(transformLanguage) : [];
  },

  async getById(id) {
    const response = await axios.get(`/languages/${id}`);
    const data = response.data?.data || response.data;
    return data ? transformLanguage(data) : null;
  },

  async create(data) {
    const response = await axios.post('/languages', data);
    const result = response.data?.data ?? response.data;
    return result ? transformLanguage(result) : response.data;
  },

  async update(id, data) {
    const response = await axios.put(`/languages/update/${id}`, data);
    const result = response.data?.language ?? response.data?.data ?? response.data;
    return result ? transformLanguage(result) : response.data;
  },

  async delete(id) {
    await axios.delete(`/languages/delete/${id}`);
    return id;
  },
};
