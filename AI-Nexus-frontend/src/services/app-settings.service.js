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
  const sourceCards = settings?.homeCardsContent;
  const sourceJoin = settings?.homeJoinContent;
  const sourceContactHero = settings?.contactHeroContent;
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
    contactHeroImageUrl: normalizeAssetUrl(settings?.contactHeroImageUrl || ''),
    courseDefaultImageUrl: normalizeAssetUrl(settings?.courseDefaultImageUrl || ''),
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
    homeCardsContent:
      sourceCards && typeof sourceCards === 'object'
        ? {
            heading: sourceCards?.heading != null ? String(sourceCards.heading) : '',
            headingAccent: sourceCards?.headingAccent != null ? String(sourceCards.headingAccent) : '',
            headingColor: sourceCards?.headingColor != null ? String(sourceCards.headingColor) : '',
            headingAccentColor:
              sourceCards?.headingAccentColor != null ? String(sourceCards.headingAccentColor) : '',
            subtitle: sourceCards?.subtitle != null ? String(sourceCards.subtitle) : '',
            cards: Array.isArray(sourceCards?.cards)
              ? sourceCards.cards.slice(0, 12).map((card) => ({
                  icon: card?.icon != null ? String(card.icon) : '',
                  title: card?.title != null ? String(card.title) : '',
                  description: card?.description != null ? String(card.description) : '',
                }))
              : [],
          }
        : null,
    homeJoinContent:
      sourceJoin && typeof sourceJoin === 'object'
        ? {
            heading: sourceJoin?.heading != null ? String(sourceJoin.heading) : '',
            subtitle: sourceJoin?.subtitle != null ? String(sourceJoin.subtitle) : '',
            ctaLabel: sourceJoin?.ctaLabel != null ? String(sourceJoin.ctaLabel) : '',
            ctaHref: sourceJoin?.ctaHref != null ? String(sourceJoin.ctaHref) : '',
            ctaIcon: sourceJoin?.ctaIcon != null ? String(sourceJoin.ctaIcon) : '',
          }
        : null,
    contactHeroContent:
      sourceContactHero && typeof sourceContactHero === 'object'
        ? {
            headingLine1:
              sourceContactHero?.headingLine1 != null ? String(sourceContactHero.headingLine1) : '',
            headingLine2:
              sourceContactHero?.headingLine2 != null ? String(sourceContactHero.headingLine2) : '',
            infoTitle: sourceContactHero?.infoTitle != null ? String(sourceContactHero.infoTitle) : '',
            infoSubtitle:
              sourceContactHero?.infoSubtitle != null ? String(sourceContactHero.infoSubtitle) : '',
            contacts: Array.isArray(sourceContactHero?.contacts)
              ? sourceContactHero.contacts.slice(0, 12).map((row) => ({
                  details: row?.details != null ? String(row.details) : '',
                  address: row?.address != null ? String(row.address) : '',
                  phone: row?.phone != null ? String(row.phone) : '',
                  email: row?.email != null ? String(row.email) : '',
                  whatsapp: row?.whatsapp != null ? String(row.whatsapp) : '',
                  website: row?.website != null ? String(row.website) : '',
                  addressIcon: row?.addressIcon != null ? String(row.addressIcon) : '',
                  phoneIcon: row?.phoneIcon != null ? String(row.phoneIcon) : '',
                  emailIcon: row?.emailIcon != null ? String(row.emailIcon) : '',
                  whatsappIcon: row?.whatsappIcon != null ? String(row.whatsappIcon) : '',
                  websiteIcon: row?.websiteIcon != null ? String(row.websiteIcon) : '',
                  lat: row?.lat != null ? Number(row.lat) : '',
                  lng: row?.lng != null ? Number(row.lng) : '',
                }))
              : [],
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

  async uploadContactHero(file) {
    const formData = new FormData();
    formData.append('hero', file);

    const response = await axios.post('/app-settings/contact-hero', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeContactHero() {
    const response = await axios.delete('/app-settings/contact-hero');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadCourseDefaultImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post('/app-settings/course-default-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeCourseDefaultImage() {
    const response = await axios.delete('/app-settings/course-default-image');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeHeroContent(payload) {
    const response = await axios.put('/app-settings/home-hero-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeCardsContent(payload) {
    const response = await axios.put('/app-settings/home-cards-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeJoinContent(payload) {
    const response = await axios.put('/app-settings/home-join-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateContactHeroContent(payload) {
    const response = await axios.put('/app-settings/contact-hero-content', payload || {});
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
