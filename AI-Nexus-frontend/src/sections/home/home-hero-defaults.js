import { paths } from 'src/routes/paths';

import { HOME_HERO_FALLBACK_IMAGE } from './home-hero-assets';

// ----------------------------------------------------------------------

export { HOME_HERO_FALLBACK_IMAGE };

export const DEFAULT_HOME_HERO_CONTENT = {
  // badge: 'A NATIONAL INITIATIVE',
  headline: 'AI Fluency for',
  headlineAccent: 'the Future of Business',
  headlineColor: '',
  headlineAccentColor: '',
  description:
    "Singapore's movement to build AI-ready professionals and future-ready organisations.",
  cta: {
    label: 'Join the Movement',
    href: '#join-movement',
    icon: 'mingcute:arrow-right-line',
    buttonColor: '',
    buttonTextColor: '',
  },
  secondaryCtas: [
    {
      label: 'Check Eligibility',
      href: '#funding-eligibility',
      icon: '',
      variant: 'outline-navy',
    },
    {
      label: 'Become an ISCA Member',
      href: paths.auth.membership.application,
      icon: 'mingcute:arrow-right-line',
      variant: 'outline-navy',
    },
    {
      label: 'For Employers',
      href: '#employers',
      icon: 'mingcute:arrow-right-line',
      variant: 'outline-navy',
    },
  ],
  statIconSize: 26,
  event: {
    startDateLabel: '',
    startDate: '',
    startTimeLabel: '',
    startTime: '',
  },
  stats: [
    {
      value: '20,000+',
      label: 'Professionals empowered',
      icon: 'solar:users-group-rounded-outline',
    },
    {
      value: '500+',
      label: 'Employers engaged',
      icon: 'solar:buildings-2-outline',
    },
    {
      value: '100+',
      label: 'Industry Partners and Growing',
      icon: 'solar:hand-shake-outline',
    },
    {
      value: 'One Movement.',
      label: 'A Future-Ready Profession.',
      icon: 'solar:star-outline',
    },
  ],
  backgroundImageUrl: HOME_HERO_FALLBACK_IMAGE,
};

function mapCtaColors(item, fallback = {}) {
  return {
    buttonColor: item?.buttonColor?.trim() || fallback.buttonColor || '',
    buttonTextColor: item?.buttonTextColor?.trim() || fallback.buttonTextColor || '',
  };
}

function mapSecondaryCtas(raw, defaults) {
  const list = Array.isArray(raw) ? raw.slice(0, 5) : [];
  const hasRemote = list.some(
    (item) => String(item?.label || '').trim() || String(item?.href || '').trim()
  );

  if (!hasRemote) {
    return defaults.map((fallback, index) => {
      const item = list[index] || {};
      return {
        label: item?.label?.trim() || fallback.label,
        href: item?.href?.trim() || fallback.href,
        icon: item?.icon?.trim() || fallback.icon,
        variant: item?.variant?.trim() || fallback.variant,
        ...mapCtaColors(item, fallback),
      };
    });
  }

  return list
    .map((item, index) => {
      const fallback = defaults[index] || {
        label: '',
        href: '',
        icon: '',
        variant: 'outline-navy',
        buttonColor: '',
        buttonTextColor: '',
      };
      return {
        label: item?.label?.trim() || fallback.label,
        href: item?.href?.trim() || fallback.href,
        icon: item?.icon?.trim() || fallback.icon,
        variant: item?.variant?.trim() || fallback.variant,
        ...mapCtaColors(item, fallback),
      };
    })
    .filter((row) => row.label?.trim() || row.href?.trim());
}

function mapStats(raw, defaults) {
  const list = Array.isArray(raw) ? raw : [];
  return defaults.map((fallback, index) => {
    const item = list[index] || {};
    const hasContent =
      String(item?.value || '').trim() ||
      String(item?.label || '').trim() ||
      String(item?.icon || '').trim();
    if (!hasContent) return { ...fallback };
    return {
      value: item?.value?.trim() || fallback.value,
      label: item?.label?.trim() || fallback.label,
      icon: item?.icon?.trim() || fallback.icon,
    };
  });
}

/**
 * Merge API hero settings with marketing defaults so the public hero matches the design brief.
 */
export function resolveHomeHeroData(appSettings = {}) {
  const remote = appSettings?.homeHeroContent || {};
  const defaults = DEFAULT_HOME_HERO_CONTENT;
  const remoteStats = Array.isArray(remote.stats) ? remote.stats : [];
  const hasRemoteCopy =
    String(remote?.headline || '').trim() ||
    String(remote?.headlineAccent || '').trim() ||
    String(remote?.description || '').trim() ||
    String(remote?.badge || '').trim();

  const imageFromSettings = appSettings?.homeHeroImageUrl?.trim() || '';

  return {
    badge: remote?.badge?.trim() || defaults.badge,
    headline: remote?.headline?.trim() || defaults.headline,
    headlineAccent: remote?.headlineAccent?.trim() || defaults.headlineAccent,
    headlineColor: remote?.headlineColor?.trim() || defaults.headlineColor,
    headlineAccentColor: remote?.headlineAccentColor?.trim() || defaults.headlineAccentColor,
    description: remote?.description?.trim() || defaults.description,
    cta: {
      label: remote?.cta?.label?.trim() || defaults.cta.label,
      href: remote?.cta?.href?.trim() || defaults.cta.href,
      icon: remote?.cta?.icon?.trim() || defaults.cta.icon,
      buttonColor: remote?.cta?.buttonColor?.trim() || defaults.cta.buttonColor || '',
      buttonTextColor: remote?.cta?.buttonTextColor?.trim() || defaults.cta.buttonTextColor || '',
    },
    secondaryCtas: mapSecondaryCtas(remote.secondaryCtas, defaults.secondaryCtas),
    statIconSize: Number.isFinite(Number(remote?.statIconSize))
      ? Math.max(16, Math.min(56, Math.round(Number(remote.statIconSize))))
      : defaults.statIconSize,
    event: {
      startDateLabel: remote?.event?.startDateLabel?.trim() || '',
      startDate: remote?.event?.startDate?.trim() || '',
      startTimeLabel: remote?.event?.startTimeLabel?.trim() || '',
      startTime: remote?.event?.startTime?.trim() || '',
    },
    stats: hasRemoteCopy && remoteStats.length
      ? mapStats(remoteStats, defaults.stats)
      : mapStats(remoteStats, defaults.stats),
    backgroundImageUrl: imageFromSettings || defaults.backgroundImageUrl,
    useDefaults: !hasRemoteCopy,
  };
}
