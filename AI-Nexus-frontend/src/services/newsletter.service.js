import axios from 'src/utils/axios';
import { resolveAssetUrl } from 'src/utils/asset-url';
import { buildPaginationParams, mapPaginatedResponse } from 'src/utils/pagination-service';

const transformNewsletter = (newsletter) => ({
  id: newsletter._id || newsletter.id,
  title: newsletter.title || '',
  summary: newsletter.summary || '',
  format: newsletter.format === 'pdf' ? 'pdf' : 'html',
  fileUrl: resolveAssetUrl(newsletter.fileUrl || ''),
  originalFileName: newsletter.originalFileName || '',
  publishAt: newsletter.publishAt || null,
  sortOrder: newsletter.sortOrder ?? 0,
  isActive: newsletter.isActive !== false,
  createdAt: newsletter.createdAt || new Date(),
  updatedAt: newsletter.updatedAt || new Date(),
});

function appendNewsletterFields(formData, data) {
  formData.append('title', data.title || '');
  formData.append('summary', data.summary || '');
  formData.append('format', data.format === 'pdf' ? 'pdf' : 'html');
  formData.append('sortOrder', String(Number(data.sortOrder) || 0));
  formData.append('isActive', data.isActive === false ? 'false' : 'true');
  formData.append('publishAt', data.publishAt || '');
  if (data.file instanceof File) {
    formData.append('file', data.file);
  }
}

export const newsletterService = {
  async getAllNewsletters(params = {}) {
    const { includeUnpublished, ...rest } = params;
    const queryParams = buildPaginationParams(rest);
    const path = includeUnpublished ? '/newsletters/admin' : '/newsletters';
    const response = await axios.get(path, { params: queryParams });
    return mapPaginatedResponse(response.data, transformNewsletter, rest);
  },

  async getPublicNewsletters() {
    const response = await axios.get('/newsletters');
    const items = response.data?.data || response.data || [];
    return items.map(transformNewsletter);
  },

  async getNewsletterById(id, params = {}) {
    const path = params.includeUnpublished ? `/newsletters/admin/${id}` : `/newsletters/${id}`;
    const response = await axios.get(path);
    const newsletter = response.data?.data || response.data;
    return transformNewsletter(newsletter);
  },

  async getNewsletterHtml(id, params = {}) {
    const path = params.includeUnpublished
      ? `/newsletters/admin/${id}/html`
      : `/newsletters/${id}/html`;
    const response = await axios.get(path, {
      responseType: 'text',
      transformResponse: [(data) => data],
      headers: { Accept: 'text/html' },
    });
    return typeof response.data === 'string' ? response.data : String(response.data ?? '');
  },

  async createNewsletter(data) {
    const formData = new FormData();
    appendNewsletterFields(formData, data);
    const response = await axios.post('/newsletters', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const newsletter = response.data?.newsletter || response.data?.data || response.data;
    return transformNewsletter(newsletter);
  },

  async updateNewsletter(id, data) {
    const formData = new FormData();
    appendNewsletterFields(formData, data);
    const response = await axios.put(`/newsletters/update/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const newsletter = response.data?.newsletter || response.data?.data || response.data;
    return transformNewsletter(newsletter);
  },

  async deleteNewsletter(id) {
    const response = await axios.delete(`/newsletters/delete/${id}`);
    return response.data;
  },
};
