export const DEFAULT_CEO_LAUNCH_CONTENT = {
  eyebrow: 'CEO LAUNCH VIDEO',
  heading: 'Why AI Fluency Matters Now',
  subtitle:
    'AI is transforming the workforce — and fluency in AI tools will become essential for professionals across industries.',
  posterImageUrl: '',
  videoUrl: '',
  videoFileUrl: '',
  quote:
    'AI fluency will soon become as essential as digital literacy. The organisations that embrace AI today will define tomorrow\'s economy.',
  stats: [
    { value: '78%', label: 'of companies adopting AI' },
    { value: '40%+', label: 'productivity gains with AI' },
    { value: '2026', label: 'the decade of AI fluency' },
  ],
  ctaLabel: 'Play CEO Message',
  ctaHref: '',
};

export const CEO_LAUNCH_STATS_MAX = 4;

export function normalizeCeoLaunchContent(source) {
  if (!source || typeof source !== 'object') {
    return { ...DEFAULT_CEO_LAUNCH_CONTENT, stats: [...DEFAULT_CEO_LAUNCH_CONTENT.stats] };
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
    stats: rawStats.slice(0, CEO_LAUNCH_STATS_MAX).map((row) => ({
      value: row?.value != null ? String(row.value) : '',
      label: row?.label != null ? String(row.label) : '',
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
