import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';

const ASSET_BASE_URL = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');

function normalizeAssetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function transformSettings(settings) {
  return {
    logoUrl: normalizeAssetUrl(settings?.logoUrl || ''),
    homeHeroImageUrl: normalizeAssetUrl(settings?.homeHeroImageUrl || ''),
  };
}

function normalizePersonaMappings(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((row) => ({
      persona: String(row?.persona || '').trim(),
      courseIds: Array.isArray(row?.courseIds)
        ? [...new Set(row.courseIds.map((id) => String(id || '').trim()).filter(Boolean))]
        : [],
    }))
    .filter((row) => row.persona);
}

export const appSettingsService = {
  async getPublic() {
    const response = await axios.get('/app-settings');
    const data = response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await axios.post('/app-settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeLogo() {
    const response = await axios.delete('/app-settings/logo');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeHero(file) {
    const formData = new FormData();
    formData.append('hero', file);

    const response = await axios.post('/app-settings/home-hero', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeHero() {
    const response = await axios.delete('/app-settings/home-hero');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async getPersonaCourseMappings() {
    const response = await axios.get('/app-settings/persona-course-mappings');
    return normalizePersonaMappings(response.data?.data || []);
  },

  async updatePersonaCourseMappings(mappings) {
    const response = await axios.put('/app-settings/persona-course-mappings', {
      mappings: normalizePersonaMappings(mappings),
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return normalizePersonaMappings(data?.personaCourseMappings || []);
  },

  async getMyRecommendations() {
    const response = await axios.get('/app-settings/recommendations/me');
    const data = response.data?.data || {};
    return {
      persona: data?.persona ? String(data.persona) : null,
      courseIds: Array.isArray(data?.courseIds) ? data.courseIds : [],
    };
  },
};
