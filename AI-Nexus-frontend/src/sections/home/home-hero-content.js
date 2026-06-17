import { resolveHomeHeroData } from './home-hero-defaults';

/**
 * Hero data is loaded from backend app-settings (admin), merged with design defaults.
 */
export const EMPTY_HERO_DATA = {
  badgeLogoUrl: '',
  headline: '',
  headlineAccent: '',
  headlineColor: '',
  headlineAccentColor: '',
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

/**
 * Map public app-settings API response to hero shape.
 */
export function buildHomeHeroData(appSettings = {}) {
  return resolveHomeHeroData(appSettings);
}
