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
    icon: '',
    buttonColor: '',
    buttonTextColor: '',
    align: '',
  },
  secondaryCtas: [],
  event: {
    startDateLabel: '',
    startDate: '',
    startTimeLabel: '',
    startTime: '',
  },
  stats: [],
  backgroundImageUrl: '',
};

function mapSecondaryCtas(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, 2).map((item) => ({
    label: item?.label?.trim() || '',
    href: item?.href?.trim() || '',
    icon: item?.icon?.trim() || '',
  }));
}

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
      icon: remote?.cta?.icon?.trim() || '',
      buttonColor: remote?.cta?.buttonColor?.trim() || '',
      buttonTextColor: remote?.cta?.buttonTextColor?.trim() || '',
      align: remote?.cta?.align?.trim() || '',
    },
    secondaryCtas: mapSecondaryCtas(remote.secondaryCtas),
    event: {
      startDateLabel: remoteEvent?.startDateLabel?.trim() || '',
      startDate: remoteEvent?.startDate?.trim() || '',
      startTimeLabel: remoteEvent?.startTimeLabel?.trim() || '',
      startTime: remoteEvent?.startTime?.trim() || '',
    },
    stats: remoteStats.slice(0, 4).map((item) => ({
      value: item?.value?.trim() || '',
      label: item?.label?.trim() || '',
      icon: item?.icon?.trim() || '',
    })),
    backgroundImageUrl: appSettings?.homeHeroImageUrl?.trim() || '',
  };
}
