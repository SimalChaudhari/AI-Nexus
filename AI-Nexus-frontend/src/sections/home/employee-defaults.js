import { normalizeEmployerContent } from './employer-defaults';

export const EMPLOYEE_BENEFITS_MAX = 6;
export const EMPLOYEE_LOGOS_MAX = 100;

const BENEFIT_ICON_COLORS = ['#E32B24', '#EE6A64', '#B7221D', '#E32B24'];
const TRUSTED_SECTION_LABEL = /trusted\s+by\s+leading\s+organisations/i;

function stripLegacyTrustedFields(source) {
  if (!source || typeof source !== 'object') return source;
  const next = { ...source };
  delete next.trustedLabel;
  delete next.stats;
  const label = String(next.benefitsLabel || '').trim();
  if (TRUSTED_SECTION_LABEL.test(label)) {
    next.benefitsLabel = '';
  }
  return next;
}

function normalizeBenefitsLabel(label) {
  const value = String(label || '').trim();
  if (!value || TRUSTED_SECTION_LABEL.test(value)) return '';
  return value;
}

export const DEFAULT_EMPLOYEE_CONTENT = {
  eyebrow: '',
  heading: '',
  headingAccent: '',
  subtitle: '',
  heroImageUrl: '',
  heroPanelTitle: '',
  heroPanelSubtitle: '',
  benefitsLabel: '',
  partnersHeading: '',
  logos: [],
  benefits: [],
  primaryCtaLabel: '',
  primaryCtaHref: '',
  secondaryCtaLabel: '',
  secondaryCtaHref: '',
};

export function formatEmployeeHeading(heading, headingAccent) {
  const main = String(heading || '').trim();
  const accent = String(headingAccent || '').trim();
  if (!main && !accent) return '';
  if (!accent) return main;
  if (!main) return accent;
  const mainWithoutTrailingPeriod = main.replace(/\.\s*$/, '');
  return `${mainWithoutTrailingPeriod} ${accent}`.trim();
}

export function normalizeEmployeeContent(source) {
  if (!source || typeof source !== 'object') {
    return { ...DEFAULT_EMPLOYEE_CONTENT, benefits: [] };
  }
  const cleaned = stripLegacyTrustedFields(source);
  const rawBenefits = Array.isArray(cleaned.benefits) ? cleaned.benefits : [];
  const rawLogos = Array.isArray(cleaned.logos) ? cleaned.logos : [];

  return {
    eyebrow: cleaned.eyebrow != null ? String(cleaned.eyebrow) : '',
    heading: cleaned.heading != null ? String(cleaned.heading) : '',
    headingAccent: cleaned.headingAccent != null ? String(cleaned.headingAccent) : '',
    subtitle: cleaned.subtitle != null ? String(cleaned.subtitle) : '',
    heroImageUrl: cleaned.heroImageUrl != null ? String(cleaned.heroImageUrl) : '',
    heroPanelTitle: cleaned.heroPanelTitle != null ? String(cleaned.heroPanelTitle) : '',
    heroPanelSubtitle: cleaned.heroPanelSubtitle != null ? String(cleaned.heroPanelSubtitle) : '',
    benefitsLabel: normalizeBenefitsLabel(cleaned.benefitsLabel),
    partnersHeading: cleaned.partnersHeading != null ? String(cleaned.partnersHeading) : '',
    logos: rawLogos.slice(0, EMPLOYEE_LOGOS_MAX).map((row) => ({
      name: row?.name != null ? String(row.name) : '',
      logoUrl: row?.logoUrl != null ? String(row.logoUrl) : '',
    })),
    benefits: rawBenefits.slice(0, EMPLOYEE_BENEFITS_MAX).map((row, index) => ({
      icon: row?.icon != null ? String(row.icon) : '',
      iconColor: row?.iconColor != null ? String(row.iconColor) : BENEFIT_ICON_COLORS[index % BENEFIT_ICON_COLORS.length],
      title: row?.title != null ? String(row.title) : '',
    })),
    primaryCtaLabel: cleaned.primaryCtaLabel != null ? String(cleaned.primaryCtaLabel) : '',
    primaryCtaHref: cleaned.primaryCtaHref != null ? String(cleaned.primaryCtaHref) : '',
    secondaryCtaLabel: cleaned.secondaryCtaLabel != null ? String(cleaned.secondaryCtaLabel) : '',
    secondaryCtaHref: cleaned.secondaryCtaHref != null ? String(cleaned.secondaryCtaHref) : '',
  };
}

/** Hero copy, image, benefits, and CTAs shown in the learners section above the journey timeline. */
export function hasEmployeeHeroContent(content) {
  const c = content || {};
  if (String(c.heroImageUrl || '').trim()) return true;
  if (String(c.eyebrow || '').trim()) return true;
  if (String(c.heading || '').trim() || String(c.headingAccent || '').trim()) return true;
  if (String(c.subtitle || '').trim()) return true;
  if (String(c.primaryCtaLabel || '').trim() && String(c.primaryCtaHref || '').trim()) return true;
  if (String(c.secondaryCtaLabel || '').trim() && String(c.secondaryCtaHref || '').trim()) return true;
  const benefits = Array.isArray(c.benefits) ? c.benefits : [];
  return benefits.some((r) => r?.title?.trim());
}

export function hasEmployeePartnerContent(content) {
  const c = content || {};
  if (String(c.partnersHeading || '').trim()) return true;
  const logos = Array.isArray(c.logos) ? c.logos : [];
  return logos.some((r) => r?.name?.trim() || r?.logoUrl?.trim());
}

export function hasEmployeeContent(content) {
  return hasEmployeeHeroContent(content) || hasEmployeePartnerContent(content);
}

export function isEmployeeContentEmpty(source) {
  if (!source || typeof source !== 'object') return true;
  return !hasEmployeeContent(normalizeEmployeeContent(source));
}

export function isEmployeeHeroContentEmpty(source) {
  if (!source || typeof source !== 'object') return true;
  return !hasEmployeeHeroContent(normalizeEmployeeContent(source));
}

/** Map legacy employer API shape into employee section when dedicated API is empty */
export function mapEmployerToEmployee(employer) {
  if (!employer || typeof employer !== 'object') return null;
  return normalizeEmployeeContent({
    eyebrow: '',
    heading: String(employer.heading || '').trim(),
    headingAccent: '',
    subtitle: employer.subtitle,
    heroImageUrl: employer.heroImageUrl,
    heroPanelTitle: '',
    heroPanelSubtitle: '',
    benefitsLabel: '',
    benefits: (employer.benefits || []).map((row) => ({ ...row, iconColor: undefined })),
    primaryCtaLabel: employer.ctaLabel,
    primaryCtaHref: employer.ctaHref,
    secondaryCtaLabel: '',
    secondaryCtaHref: '',
  });
}

function normalizeEmployerForMerge(source) {
  if (!source || typeof source !== 'object') return null;
  return normalizeEmployeeContent(mapEmployerToEmployee(source));
}

function resolvePartnersHeading(employeeHeading, employerSource) {
  const fromEmployee = String(employeeHeading || '').trim();
  if (fromEmployee) return fromEmployee;
  const employer = employerSource && typeof employerSource === 'object' ? employerSource : null;
  return String(employer?.partnersHeading || '').trim();
}

export function resolveEmployeeContent(employeeSource, employerSource) {
  const employee = normalizeEmployeeContent(employeeSource);
  const employerMapped = normalizeEmployerForMerge(employerSource);
  const employerNorm =
    employerSource && typeof employerSource === 'object'
      ? normalizeEmployerContent(employerSource)
      : null;

  const partnerExtras = {
    partnersHeading: resolvePartnersHeading(employee.partnersHeading, employerNorm),
    logos: employee.logos,
  };

  if (hasEmployeeHeroContent(employee)) {
    const merged = {
      ...employee,
      ...partnerExtras,
    };
    if (!String(employee.heroImageUrl || '').trim() && employerMapped?.heroImageUrl) {
      merged.heroImageUrl = employerMapped.heroImageUrl;
    }
    return merged;
  }

  if (employerMapped && hasEmployeeHeroContent(employerMapped)) {
    return {
      ...employerMapped,
      ...partnerExtras,
    };
  }

  if (hasEmployeePartnerContent(employee)) {
    return {
      ...normalizeEmployeeContent(null),
      ...partnerExtras,
    };
  }

  return normalizeEmployeeContent(null);
}
