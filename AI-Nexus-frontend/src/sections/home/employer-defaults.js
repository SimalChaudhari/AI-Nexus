export const DEFAULT_EMPLOYER_CONTENT = {
  heading: '',
  subtitle: '',
  heroImageUrl: '',
  benefits: [],
  ctaLabel: '',
  ctaHref: '',
};

/** Preview copy when admin has not saved employer section yet */
export const DUMMY_EMPLOYER_CONTENT = {
  heading: 'For employers',
  subtitle:
    '<p>Upskill your workforce with a structured AI fluency programme — flexible for teams, aligned with national skills initiatives, and easy to sponsor.</p>',
  benefits: [
    {
      icon: 'solar:chart-2-bold-duotone',
      title: 'Productivity at scale',
      description:
        'Help employees use AI tools safely and effectively across finance, operations, and customer-facing work.',
    },
    {
      icon: 'mingcute:user-group-line',
      title: 'Team-wide fluency',
      description:
        'Shared curriculum and pathways so departments learn the same foundations, not siloed experiments.',
    },
    {
      icon: 'solar:wallet-money-bold-duotone',
      title: 'Funding support',
      description:
        'Eligible organisations and learners may access subsidies — we can guide you through options.',
    },
    {
      icon: 'solar:buildings-2-bold-duotone',
      title: 'Partnership ready',
      description:
        'Co-branded enrolment, reporting, and L&D alignment for enterprise and SME workforce plans.',
    },
  ],
  ctaLabel: 'Talk to us about team enrolment',
  ctaHref: '/contact',
};

export const EMPLOYER_BENEFITS_MAX = 6;

export function normalizeEmployerContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      ...DEFAULT_EMPLOYER_CONTENT,
      benefits: [],
    };
  }
  const rawBenefits = Array.isArray(source.benefits) ? source.benefits : [];
  return {
    heading: source.heading != null ? String(source.heading) : '',
    subtitle: source.subtitle != null ? String(source.subtitle) : '',
    heroImageUrl: source.heroImageUrl != null ? String(source.heroImageUrl) : '',
    benefits: rawBenefits.slice(0, EMPLOYER_BENEFITS_MAX).map((row) => ({
      icon: row?.icon != null ? String(row.icon) : '',
      title: row?.title != null ? String(row.title) : '',
      description: row?.description != null ? String(row.description) : '',
    })),
    ctaLabel: source.ctaLabel != null ? String(source.ctaLabel) : '',
    ctaHref: source.ctaHref != null ? String(source.ctaHref) : '',
  };
}

export function hasEmployerContent(content) {
  const c = content || {};
  if (String(c.heroImageUrl || '').trim()) return true;
  if (String(c.heading || '').trim()) return true;
  if (String(c.subtitle || '').trim()) return true;
  if (String(c.ctaLabel || '').trim() && String(c.ctaHref || '').trim()) return true;
  const benefits = Array.isArray(c.benefits) ? c.benefits : [];
  return benefits.some((r) => r?.title?.trim() || r?.description?.trim());
}

export function isEmployerContentEmpty(source) {
  if (!source || typeof source !== 'object') return true;
  return !hasEmployerContent(normalizeEmployerContent(source));
}

/** API content when saved; otherwise dummy preview data */
export function resolveEmployerContent(source) {
  if (isEmployerContentEmpty(source)) {
    return normalizeEmployerContent(DUMMY_EMPLOYER_CONTENT);
  }
  return normalizeEmployerContent(source);
}
