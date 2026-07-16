export const DEFAULT_EMPLOYER_CONTENT = {
  heading: '',
  subtitle: '',
  heroImageUrl: '',
  benefits: [],
  logos: [],
  partnersHeading: '',
  ctaLabel: '',
  ctaHref: '',
};

export const EMPLOYER_BENEFITS_MAX = 6;
export const EMPLOYER_LOGOS_MAX = 50;

export function normalizeEmployerContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      ...DEFAULT_EMPLOYER_CONTENT,
      benefits: [],
    };
  }
  const rawBenefits = Array.isArray(source.benefits) ? source.benefits : [];
  const rawLogos = Array.isArray(source.logos) ? source.logos : [];
  return {
    heading: source.heading != null ? String(source.heading) : '',
    subtitle: source.subtitle != null ? String(source.subtitle) : '',
    heroImageUrl: source.heroImageUrl != null ? String(source.heroImageUrl) : '',
    benefits: rawBenefits.slice(0, EMPLOYER_BENEFITS_MAX).map((row) => ({
      icon: row?.icon != null ? String(row.icon) : '',
      title: row?.title != null ? String(row.title) : '',
    })),
    logos: rawLogos.slice(0, EMPLOYER_LOGOS_MAX).map((row) => ({
      name: row?.name != null ? String(row.name) : '',
      logoUrl: row?.logoUrl != null ? String(row.logoUrl) : '',
    })),
    partnersHeading: source.partnersHeading != null ? String(source.partnersHeading) : '',
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
  if (benefits.some((r) => r?.title?.trim())) return true;
  const logos = Array.isArray(c.logos) ? c.logos : [];
  return logos.some((r) => r?.name?.trim() || r?.logoUrl?.trim());
}

export function isEmployerContentEmpty(source) {
  if (!source || typeof source !== 'object') return true;
  return !hasEmployerContent(normalizeEmployerContent(source));
}

/** Saved API content only — no placeholder/dummy data. */
export function resolveEmployerContent(source) {
  return normalizeEmployerContent(source);
}
