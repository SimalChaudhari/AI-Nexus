export const CEO_LAUNCH_STATS_MAX = 4;

export function normalizeCeoLaunchContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      eyebrow: '',
      heading: '',
      subtitle: '',
      posterImageUrl: '',
      videoUrl: '',
      videoFileUrl: '',
      quote: '',
      statIconSize: null,
      stats: [],
      ctaLabel: '',
      ctaHref: '',
    };
  }
  const rawStats = Array.isArray(source.stats) ? source.stats : [];
  return {
    eyebrow: source.eyebrow != null ? String(source.eyebrow) : '',
    heading: source.heading != null ? String(source.heading) : '',
    subtitle: source.subtitle != null ? String(source.subtitle) : '',
    posterImageUrl: source.posterImageUrl != null ? String(source.posterImageUrl) : '',
    videoUrl: source.videoUrl != null ? String(source.videoUrl) : '',
    videoFileUrl: source.videoFileUrl != null ? String(source.videoFileUrl) : '',
    quote: source.quote != null ? String(source.quote) : '',
    statIconSize: Number.isFinite(Number(source.statIconSize))
      ? Math.max(16, Math.min(56, Math.round(Number(source.statIconSize))))
      : null,
    stats: rawStats.slice(0, CEO_LAUNCH_STATS_MAX).map((row) => ({
      value: row?.value != null ? String(row.value) : '',
      label: row?.label != null ? String(row.label) : '',
      icon: row?.icon != null ? String(row.icon) : '',
    })),
    ctaLabel: source.ctaLabel != null ? String(source.ctaLabel) : '',
    ctaHref: source.ctaHref != null ? String(source.ctaHref) : '',
  };
}

export function hasCeoLaunchContent(content) {
  const c = normalizeCeoLaunchContent(content);
  if (String(c.eyebrow || '').trim()) return true;
  if (String(c.heading || '').trim()) return true;
  if (String(c.subtitle || '').trim()) return true;
  if (String(c.posterImageUrl || '').trim()) return true;
  if (String(c.videoUrl || '').trim()) return true;
  if (String(c.videoFileUrl || '').trim()) return true;
  if (String(c.quote || '').trim()) return true;
  if (String(c.ctaLabel || '').trim()) return true;
  const stats = Array.isArray(c.stats) ? c.stats : [];
  return stats.some((s) => String(s?.value || '').trim() || String(s?.label || '').trim());
}

export function resolveCeoLaunchContent(source) {
  return normalizeCeoLaunchContent(source);
}
