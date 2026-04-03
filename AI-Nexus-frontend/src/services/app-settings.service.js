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
};
