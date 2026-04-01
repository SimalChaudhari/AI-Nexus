import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';

const ASSET_BASE_URL = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');

function normalizeLogoUrl(logoUrl) {
  if (!logoUrl) return '';
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${ASSET_BASE_URL}${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
}

function transformSettings(settings) {
  return {
    logoUrl: normalizeLogoUrl(settings?.logoUrl || ''),
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
};
