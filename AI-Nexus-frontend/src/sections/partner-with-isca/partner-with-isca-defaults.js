import {
  PARTNER_ISCA_BENEFITS,
  PARTNER_ISCA_DASHBOARD_FEATURES,
  PARTNER_ISCA_FAQS,
  PARTNER_ISCA_STATS,
  PARTNER_ISCA_STEPS,
} from './partner-with-isca-content';

export const PARTNER_STATS_MAX = 4;
export const PARTNER_BENEFITS_MAX = 6;
export const PARTNER_DASHBOARD_FEATURES_MAX = 8;
export const PARTNER_STEPS_MAX = 3;
export const PARTNER_FAQS_MAX = 20;
export const PARTNER_HERO_ACTIONS_MAX = 4;

const DEFAULT_HERO_ACTIONS = [
  { label: 'Register Corporate Account', variant: 'red', scrollTo: 'register', href: '' },
  { label: 'How it works', variant: 'outline', scrollTo: 'how-it-works', href: '' },
  { label: 'View Programme Details', variant: 'outline', scrollTo: '', href: '/' },
  { label: 'View Benefits', variant: 'outline', scrollTo: 'benefits', href: '' },
];

export const DEFAULT_PARTNER_WITH_ISCA_CONTENT = {
  hero: {
    eyebrow: 'For Employers & HR Teams',
    headline: 'Upskill your team.',
    headlineAccent: 'Track every step.',
    description:
      "Give your accounting and finance staff access to Singapore's government-endorsed AI Fluency Programme. Your corporate dashboard shows who has enrolled, who is progressing, and who is ready to download their certificate.",
    heroImageUrl: '',
    placeholderText:
      'Place your hero image here\nRecommended: professionals at work,\ne.g. two colleagues at a laptop',
    actions: DEFAULT_HERO_ACTIONS,
  },
  stats: PARTNER_ISCA_STATS.map((row) => ({ ...row })),
  benefits: {
    eyebrow: 'Corporate Benefits',
    title: 'Everything HR needs to manage AI upskilling at scale',
    items: PARTNER_ISCA_BENEFITS.map((row) => ({ ...row })),
  },
  dashboard: {
    eyebrow: 'Corporate Dashboard',
    title: "A complete view of your team's AI readiness",
    description:
      'From the moment a staff member links their account with your company code, they appear in your dashboard. Track who is enrolled, who has finished, and who needs a nudge — all in one place.',
    features: PARTNER_ISCA_DASHBOARD_FEATURES.map((row) => ({ ...row })),
    mockupImageUrl: '',
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'Get your team enrolled in three steps',
    note: 'No technical setup required',
    steps: PARTNER_ISCA_STEPS.map((row) => ({ ...row })),
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Common questions from HR teams',
    items: PARTNER_ISCA_FAQS.map((row) => ({ ...row })),
  },
  cta: {
    eyebrow: 'For Employers',
    title: 'Ready to build an AI-fluent finance team?',
    description:
      "Register your corporate account today and get your unique company code ready. Your team's AI upskilling journey starts here.",
    buttonLabel: 'Register Corporate Account',
    buttonHref: '/auth/corporate-sign-up',
  },
};

function normalizeAction(row) {
  const variant = String(row?.variant || 'outline').trim() === 'red' ? 'red' : 'outline';
  return {
    label: row?.label != null ? String(row.label) : '',
    variant,
    scrollTo: row?.scrollTo != null ? String(row.scrollTo) : '',
    href: row?.href != null ? String(row.href) : '',
  };
}

function normalizeBenefitItem(row) {
  return {
    icon: row?.icon != null ? String(row.icon) : '',
    iconTone: row?.iconTone != null ? String(row.iconTone) : 'navy',
    title: row?.title != null ? String(row.title) : '',
    description: row?.description != null ? String(row.description) : '',
  };
}

function normalizeStep(row) {
  return {
    icon: row?.icon != null ? String(row.icon) : '',
    badge: row?.badge != null ? String(row.badge) : '',
    title: row?.title != null ? String(row.title) : '',
    description: row?.description != null ? String(row.description) : '',
    done: Boolean(row?.done),
  };
}

function normalizeFaqItem(row) {
  return {
    question: row?.question != null ? String(row.question) : '',
    answer: row?.answer != null ? String(row.answer) : '',
  };
}

export function normalizePartnerWithIscaContent(source) {
  const base = DEFAULT_PARTNER_WITH_ISCA_CONTENT;
  if (!source || typeof source !== 'object') {
    return JSON.parse(JSON.stringify(base));
  }

  const heroSource = source.hero && typeof source.hero === 'object' ? source.hero : {};
  const benefitsSource = source.benefits && typeof source.benefits === 'object' ? source.benefits : {};
  const dashboardSource = source.dashboard && typeof source.dashboard === 'object' ? source.dashboard : {};
  const howSource = source.howItWorks && typeof source.howItWorks === 'object' ? source.howItWorks : {};
  const faqSource = source.faq && typeof source.faq === 'object' ? source.faq : {};
  const ctaSource = source.cta && typeof source.cta === 'object' ? source.cta : {};

  const rawStats = Array.isArray(source.stats) ? source.stats : [];
  const rawActions = Array.isArray(heroSource.actions) ? heroSource.actions : [];
  const rawBenefits = Array.isArray(benefitsSource.items) ? benefitsSource.items : [];
  const rawFeatures = Array.isArray(dashboardSource.features) ? dashboardSource.features : [];
  const rawSteps = Array.isArray(howSource.steps) ? howSource.steps : [];
  const rawFaqs = Array.isArray(faqSource.items) ? faqSource.items : [];

  return {
    hero: {
      eyebrow: heroSource.eyebrow != null ? String(heroSource.eyebrow) : base.hero.eyebrow,
      headline: heroSource.headline != null ? String(heroSource.headline) : base.hero.headline,
      headlineAccent:
        heroSource.headlineAccent != null ? String(heroSource.headlineAccent) : base.hero.headlineAccent,
      description: heroSource.description != null ? String(heroSource.description) : base.hero.description,
      heroImageUrl: heroSource.heroImageUrl != null ? String(heroSource.heroImageUrl) : '',
      placeholderText:
        heroSource.placeholderText != null ? String(heroSource.placeholderText) : base.hero.placeholderText,
      actions: (rawActions.length ? rawActions : base.hero.actions)
        .slice(0, PARTNER_HERO_ACTIONS_MAX)
        .map(normalizeAction),
    },
    stats: (rawStats.length ? rawStats : base.stats)
      .slice(0, PARTNER_STATS_MAX)
      .map((row) => ({
        icon: row?.icon != null ? String(row.icon) : '',
        title: row?.title != null ? String(row.title) : '',
        label: row?.label != null ? String(row.label) : '',
      })),
    benefits: {
      eyebrow: benefitsSource.eyebrow != null ? String(benefitsSource.eyebrow) : base.benefits.eyebrow,
      title: benefitsSource.title != null ? String(benefitsSource.title) : base.benefits.title,
      items: (rawBenefits.length ? rawBenefits : base.benefits.items)
        .slice(0, PARTNER_BENEFITS_MAX)
        .map(normalizeBenefitItem),
    },
    dashboard: {
      eyebrow: dashboardSource.eyebrow != null ? String(dashboardSource.eyebrow) : base.dashboard.eyebrow,
      title: dashboardSource.title != null ? String(dashboardSource.title) : base.dashboard.title,
      description:
        dashboardSource.description != null ? String(dashboardSource.description) : base.dashboard.description,
      features: (rawFeatures.length ? rawFeatures : base.dashboard.features)
        .slice(0, PARTNER_DASHBOARD_FEATURES_MAX)
        .map((row) => ({
          title: row?.title != null ? String(row.title) : '',
          description: row?.description != null ? String(row.description) : '',
        })),
      mockupImageUrl:
        dashboardSource.mockupImageUrl != null ? String(dashboardSource.mockupImageUrl) : '',
    },
    howItWorks: {
      eyebrow: howSource.eyebrow != null ? String(howSource.eyebrow) : base.howItWorks.eyebrow,
      title: howSource.title != null ? String(howSource.title) : base.howItWorks.title,
      note: howSource.note != null ? String(howSource.note) : base.howItWorks.note,
      steps: (rawSteps.length ? rawSteps : base.howItWorks.steps)
        .slice(0, PARTNER_STEPS_MAX)
        .map(normalizeStep),
    },
    faq: {
      eyebrow: faqSource.eyebrow != null ? String(faqSource.eyebrow) : base.faq.eyebrow,
      title: faqSource.title != null ? String(faqSource.title) : base.faq.title,
      items: (rawFaqs.length ? rawFaqs : base.faq.items).slice(0, PARTNER_FAQS_MAX).map(normalizeFaqItem),
    },
    cta: {
      eyebrow: ctaSource.eyebrow != null ? String(ctaSource.eyebrow) : base.cta.eyebrow,
      title: ctaSource.title != null ? String(ctaSource.title) : base.cta.title,
      description: ctaSource.description != null ? String(ctaSource.description) : base.cta.description,
      buttonLabel: ctaSource.buttonLabel != null ? String(ctaSource.buttonLabel) : base.cta.buttonLabel,
      buttonHref: ctaSource.buttonHref != null ? String(ctaSource.buttonHref) : base.cta.buttonHref,
    },
  };
}

export function resolvePartnerWithIscaContent(source) {
  return normalizePartnerWithIscaContent(source);
}

export function resolvePartnerHeroImageUrl(appSettings) {
  const fromContent = String(appSettings?.partnerWithIscaContent?.hero?.heroImageUrl || '').trim();
  return fromContent;
}
