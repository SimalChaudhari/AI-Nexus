export const EMPLOYEE_BENEFITS_MAX = 6;

const BENEFIT_ICON_COLORS = ['#E32B24', '#EE6A64', '#B7221D', '#E32B24'];
const TRUSTED_SECTION_LABEL = /trusted\s+by\s+leading\s+organisations/i;

function stripLegacyTrustedFields(source) {
  if (!source || typeof source !== 'object') return source;
  const next = { ...source };
  delete next.trustedLabel;
  delete next.logos;
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
  benefits: [],
  primaryCtaLabel: '',
  primaryCtaHref: '',
  secondaryCtaLabel: '',
  secondaryCtaHref: '',
};

export const DUMMY_EMPLOYEE_CONTENT = {
  eyebrow: 'FOR LEARNERS & PROFESSIONALS',
  heading: 'Building AI-Ready Skills.',
  headingAccent: 'Together.',
  subtitle:
    '<p>Practical pathways to use AI confidently at work — from everyday tasks to team collaboration, with credentials employers recognise.</p>',
  heroImageUrl: '',
  heroPanelTitle: 'AI Workforce Transformation',
  heroPanelSubtitle: 'Learn. Apply. Grow with your team.',
  benefitsLabel: 'LEARNER BENEFITS',
  benefits: [
    {
      icon: 'solar:book-bookmark-bold-duotone',
      iconColor: BENEFIT_ICON_COLORS[0],
      title: 'Structured learning paths',
      description: 'Step-by-step modules designed for busy professionals — learn at your pace with clear outcomes.',
    },
    {
      icon: 'solar:chart-2-bold-duotone',
      iconColor: BENEFIT_ICON_COLORS[1],
      title: 'Work-ready skills',
      description: 'Apply AI safely in finance, operations, and customer-facing roles with real workplace scenarios.',
    },
    {
      icon: 'solar:rocket-2-bold-duotone',
      iconColor: BENEFIT_ICON_COLORS[2],
      title: 'Career momentum',
      description: 'Build a portfolio of applied projects and credentials that stand out to hiring managers.',
    },
    {
      icon: 'solar:settings-bold-duotone',
      iconColor: BENEFIT_ICON_COLORS[3],
      title: 'Community & support',
      description: 'Join cohorts, mentor sessions, and peer forums so you are never learning alone.',
    },
  ],
  primaryCtaLabel: 'Explore programmes',
  primaryCtaHref: '/learning',
  secondaryCtaLabel: 'Download brochure',
  secondaryCtaHref: '/contact',
};

export function normalizeEmployeeContent(source) {
  if (!source || typeof source !== 'object') {
    return { ...DEFAULT_EMPLOYEE_CONTENT, benefits: [] };
  }
  const cleaned = stripLegacyTrustedFields(source);
  const rawBenefits = Array.isArray(cleaned.benefits) ? cleaned.benefits : [];

  return {
    eyebrow: cleaned.eyebrow != null ? String(cleaned.eyebrow) : '',
    heading: cleaned.heading != null ? String(cleaned.heading) : '',
    headingAccent: cleaned.headingAccent != null ? String(cleaned.headingAccent) : '',
    subtitle: cleaned.subtitle != null ? String(cleaned.subtitle) : '',
    heroImageUrl: cleaned.heroImageUrl != null ? String(cleaned.heroImageUrl) : '',
    heroPanelTitle: cleaned.heroPanelTitle != null ? String(cleaned.heroPanelTitle) : '',
    heroPanelSubtitle: cleaned.heroPanelSubtitle != null ? String(cleaned.heroPanelSubtitle) : '',
    benefitsLabel: normalizeBenefitsLabel(cleaned.benefitsLabel),
    benefits: rawBenefits.slice(0, EMPLOYEE_BENEFITS_MAX).map((row, index) => ({
      icon: row?.icon != null ? String(row.icon) : '',
      iconColor: row?.iconColor != null ? String(row.iconColor) : BENEFIT_ICON_COLORS[index % BENEFIT_ICON_COLORS.length],
      title: row?.title != null ? String(row.title) : '',
      description: row?.description != null ? String(row.description) : '',
    })),
    primaryCtaLabel: cleaned.primaryCtaLabel != null ? String(cleaned.primaryCtaLabel) : '',
    primaryCtaHref: cleaned.primaryCtaHref != null ? String(cleaned.primaryCtaHref) : '',
    secondaryCtaLabel: cleaned.secondaryCtaLabel != null ? String(cleaned.secondaryCtaLabel) : '',
    secondaryCtaHref: cleaned.secondaryCtaHref != null ? String(cleaned.secondaryCtaHref) : '',
  };
}

export function hasEmployeeContent(content) {
  const c = content || {};
  if (String(c.heroImageUrl || '').trim()) return true;
  if (String(c.eyebrow || '').trim()) return true;
  if (String(c.heading || '').trim() || String(c.headingAccent || '').trim()) return true;
  if (String(c.subtitle || '').trim()) return true;
  if (String(c.primaryCtaLabel || '').trim() && String(c.primaryCtaHref || '').trim()) return true;
  const benefits = Array.isArray(c.benefits) ? c.benefits : [];
  return benefits.some((r) => r?.title?.trim() || r?.description?.trim());
}

export function isEmployeeContentEmpty(source) {
  if (!source || typeof source !== 'object') return true;
  return !hasEmployeeContent(normalizeEmployeeContent(source));
}

/** Map legacy employer API shape into employee section when dedicated API is empty */
export function mapEmployerToEmployee(employer) {
  if (!employer || typeof employer !== 'object') return null;
  const heading = String(employer.heading || '').trim();
  const parts = heading.split(/\s+/);
  const accent = parts.length > 1 ? parts.pop() : '';
  const main = parts.join(' ') || heading;
  return normalizeEmployeeContent({
    eyebrow: 'FOR LEARNERS & PROFESSIONALS',
    heading: main.endsWith('.') ? main : `${main}.`,
    headingAccent: accent ? (accent.endsWith('.') ? accent : `${accent}.`) : 'Together.',
    subtitle: employer.subtitle,
    heroImageUrl: employer.heroImageUrl,
    benefitsLabel: 'LEARNER BENEFITS',
    benefits: (employer.benefits || []).map((row) => ({ ...row, iconColor: undefined })),
    primaryCtaLabel: employer.ctaLabel,
    primaryCtaHref: employer.ctaHref,
    secondaryCtaLabel: 'Download brochure',
    secondaryCtaHref: '/contact',
  });
}

function normalizeEmployerForMerge(source) {
  if (!source || typeof source !== 'object') return null;
  return normalizeEmployeeContent(mapEmployerToEmployee(source));
}

export function resolveEmployeeContent(employeeSource, employerSource) {
  const employerMapped = normalizeEmployerForMerge(employerSource);

  if (!isEmployeeContentEmpty(employeeSource)) {
    const employee = normalizeEmployeeContent(employeeSource);
    if (!String(employee.heroImageUrl || '').trim() && employerMapped?.heroImageUrl) {
      return { ...employee, heroImageUrl: employerMapped.heroImageUrl };
    }
    return employee;
  }

  if (employerMapped && hasEmployeeContent(employerMapped)) return employerMapped;
  return normalizeEmployeeContent(DUMMY_EMPLOYEE_CONTENT);
}
