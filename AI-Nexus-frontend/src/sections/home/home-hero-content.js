/**
 * Hero data is loaded only from backend app-settings (admin).
 * No marketing copy defaults on the frontend.
 */
export const EMPTY_HERO_DATA = {
  headline: '',
  description: '',
  cta: {
    label: '',
    href: '',
    buttonColor: '',
    buttonTextColor: '',
    align: '',
  },
  event: {
    startDateLabel: '',
    startDate: '',
    startTimeLabel: '',
    startTime: '',
  },
  stats: [],
  backgroundImageUrl: '',
};

/**
 * Map public app-settings API response to hero shape. Missing fields stay empty.
 */
export function buildHomeHeroData(appSettings = {}) {
  const remote = appSettings?.homeHeroContent || {};
  const remoteStats = Array.isArray(remote.stats) ? remote.stats : [];
  const remoteEvent = remote?.event || {};

  return {
    headline: remote?.headline?.trim() || '',
    description: remote?.description?.trim() || '',
    cta: {
      label: remote?.cta?.label?.trim() || '',
      href: remote?.cta?.href?.trim() || '',
      buttonColor: remote?.cta?.buttonColor?.trim() || '',
      buttonTextColor: remote?.cta?.buttonTextColor?.trim() || '',
      align: remote?.cta?.align?.trim() || '',
    },
    event: {
      startDateLabel: remoteEvent?.startDateLabel?.trim() || '',
      startDate: remoteEvent?.startDate?.trim() || '',
      startTimeLabel: remoteEvent?.startTimeLabel?.trim() || '',
      startTime: remoteEvent?.startTime?.trim() || '',
    },
    stats: remoteStats.slice(0, 3).map((item) => ({
      value: item?.value?.trim() || '',
      label: item?.label?.trim() || '',
      icon: item?.icon?.trim() || '',
    })),
    backgroundImageUrl: appSettings?.homeHeroImageUrl?.trim() || '',
  };
}
