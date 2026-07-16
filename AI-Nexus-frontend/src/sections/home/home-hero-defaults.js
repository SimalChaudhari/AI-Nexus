// ----------------------------------------------------------------------

function mapCtaColors(item) {
  return {
    buttonColor: item?.buttonColor?.trim() || '',
    buttonTextColor: item?.buttonTextColor?.trim() || '',
  };
}

function mapSecondaryCtas(raw) {
  const list = Array.isArray(raw) ? raw.slice(0, 5) : [];
  return list
    .map((item) => ({
      label: item?.label?.trim() || '',
      href: item?.href?.trim() || '',
      icon: item?.icon?.trim() || '',
      variant: item?.variant?.trim() || 'outline-navy',
      ...mapCtaColors(item),
    }))
    .filter((row) => row.label?.trim() || row.href?.trim());
}

function mapStats(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .slice(0, 4)
    .map((item) => ({
      value: item?.value?.trim() || '',
      label: item?.label?.trim() || '',
      icon: item?.icon?.trim() || '',
    }))
    .filter((row) => row.value || row.label || row.icon);
}

/**
 * Resolve hero settings from API data only.
 */
export function resolveHomeHeroData(appSettings = {}) {
  const remote = appSettings?.homeHeroContent || {};
  const hasRemoteCopy =
    String(remote?.headline || '').trim() ||
    String(remote?.headlineAccent || '').trim() ||
    String(remote?.description || '').trim() ||
    String(remote?.badgeLogoUrl || '').trim();

  const imageFromSettings = appSettings?.homeHeroImageUrl?.trim() || '';

  return {
    badgeLogoUrl: remote?.badgeLogoUrl?.trim() || '',
    headline: remote?.headline?.trim() || '',
    headlineAccent: remote?.headlineAccent?.trim() || '',
    headlineColor: remote?.headlineColor?.trim() || '',
    headlineAccentColor: remote?.headlineAccentColor?.trim() || '',
    description: remote?.description?.trim() || '',
    cta: {
      label: remote?.cta?.label?.trim() || '',
      href: remote?.cta?.href?.trim() || '',
      icon: remote?.cta?.icon?.trim() || '',
      buttonColor: remote?.cta?.buttonColor?.trim() || '',
      buttonTextColor: remote?.cta?.buttonTextColor?.trim() || '',
    },
    secondaryCtas: mapSecondaryCtas(remote.secondaryCtas),
    statIconSize: Number.isFinite(Number(remote?.statIconSize))
      ? Math.max(16, Math.min(56, Math.round(Number(remote.statIconSize))))
      : 26,
    event: {
      startDateLabel: remote?.event?.startDateLabel?.trim() || '',
      startDate: remote?.event?.startDate?.trim() || '',
      startTimeLabel: remote?.event?.startTimeLabel?.trim() || '',
      startTime: remote?.event?.startTime?.trim() || '',
    },
    stats: mapStats(remote.stats),
    backgroundImageUrl: imageFromSettings,
    useDefaults: !hasRemoteCopy,
  };
}
