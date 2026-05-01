import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';

const ASSET_BASE_URL = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');

function normalizeAssetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function transformSettings(settings) {
  const sourceContent = settings?.homeHeroContent;
  const normalizedStats = Array.isArray(sourceContent?.stats)
    ? sourceContent.stats.slice(0, 3).map((item) => ({
        value: item?.value ? String(item.value) : '',
        label: item?.label ? String(item.label) : '',
        icon: item?.icon ? String(item.icon) : '',
      }))
    : [];

  return {
    logoUrl: normalizeAssetUrl(settings?.logoUrl || ''),
    homeHeroImageUrl: normalizeAssetUrl(settings?.homeHeroImageUrl || ''),
    homeHeroContent: sourceContent && typeof sourceContent === 'object'
      ? {
          headline: sourceContent.headline != null ? String(sourceContent.headline) : '',
          description: sourceContent.description != null ? String(sourceContent.description) : '',
          cta: {
            label: sourceContent?.cta?.label ? String(sourceContent.cta.label) : '',
            href: sourceContent?.cta?.href ? String(sourceContent.cta.href) : '',
            buttonColor:
              sourceContent?.cta?.buttonColor != null
                ? String(sourceContent.cta.buttonColor)
                : '',
            buttonTextColor:
              sourceContent?.cta?.buttonTextColor != null
                ? String(sourceContent.cta.buttonTextColor)
                : '',
            align: sourceContent?.cta?.align != null ? String(sourceContent.cta.align) : '',
          },
          event: {
            startDateLabel: sourceContent?.event?.startDateLabel ? String(sourceContent.event.startDateLabel) : '',
            startDate: sourceContent?.event?.startDate ? String(sourceContent.event.startDate) : '',
            startTimeLabel: sourceContent?.event?.startTimeLabel ? String(sourceContent.event.startTimeLabel) : '',
            startTime: sourceContent?.event?.startTime ? String(sourceContent.event.startTime) : '',
          },
          stats: normalizedStats,
        }
      : null,
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

  async updateHomeHeroContent(payload) {
    const response = await axios.put('/app-settings/home-hero-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
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
