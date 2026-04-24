import axios from 'src/utils/axios';
import { resolveAssetUrl } from 'src/utils/asset-url';
import { buildPaginationParams, mapPaginatedResponse } from 'src/utils/pagination-service';

const transformSpeaker = (speaker) => ({
  id: speaker.id,
  name: speaker.name || '',
  profileimage: resolveAssetUrl(speaker.profileimage || ''),
  about: speaker.about || '',
  createdBy: speaker.createdBy || speaker.createdByName || speaker.created_by || null,
  createdAt: speaker.createdAt,
  updatedAt: speaker.updatedAt,
});

export const speakerService = {
  async getAll(params = {}) {
    const queryParams = buildPaginationParams(params);
    const response = await axios.get('/speakers', { params: queryParams });
    return mapPaginatedResponse(response.data, transformSpeaker, params);
  },

  async getById(id) {
    const response = await axios.get(`/speakers/${id}`);
    const data = response.data?.data || response.data;
    return data ? transformSpeaker(data) : null;
  },

  async create(data, profileimageFile = null) {
    const formData = new FormData();
    formData.append('name', data.name || '');
    if (data.about) formData.append('about', data.about);
    if (profileimageFile instanceof File) {
      formData.append('profileimage', profileimageFile);
    }
    const response = await axios.post('/speakers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const result = response.data?.speaker || response.data?.data || response.data;
    return transformSpeaker(result);
  },

  async update(id, data, profileimageFile = null) {
    const formData = new FormData();
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.about !== undefined) formData.append('about', data.about);
    if (data.profileimage === '') formData.append('profileimage', '');
    if (profileimageFile instanceof File) {
      formData.append('profileimage', profileimageFile);
    }
    const response = await axios.put(`/speakers/update/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const result = response.data?.speaker || response.data?.data || response.data;
    return result ? transformSpeaker(result) : null;
  },

  async delete(id) {
    await axios.delete(`/speakers/delete/${id}`);
  },
};
