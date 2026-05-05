/**
 * Shared typography scale for public hero sections + admin hero settings.
 * Keep heading/body hierarchy consistent across frontend and admin forms.
 */

const SECTION_MAIN_TITLE = {
  fontSize: {
    xs: 'clamp(0.88rem, 2.2vw + 0.5rem, 1.2rem)',
    sm: 'clamp(1.45rem, 2.9vw, 2rem)',
    md: 'clamp(2rem, 2.2vw, 2.45rem)',
    lg: '2.95rem',
    xl: '3.2rem',
  },
  lineHeight: { xs: 1.25, md: 1.2 },
  letterSpacing: { xs: '-0.01em', md: '-0.015em' },
  fontWeight: 700,
};

export const HERO_TYPOGRAPHY = {
  sectionMainTitle: SECTION_MAIN_TITLE,
  homeCardsHeading: {
    ...SECTION_MAIN_TITLE,
  },
  homeHeadline: {
    ...SECTION_MAIN_TITLE,
  },
  homeDescription: {
    fontSize: {
      xs: 'clamp(0.72rem, 0.9vw + 0.62rem, 0.84rem)',
      sm: 'clamp(0.86rem, 1.25vw, 1rem)',
      md: 'clamp(0.96rem, 1.1vw, 1.05rem)',
      lg: '1.125rem',
    },
    lineHeight: { xs: 1.6, md: 1.65 },
    fontWeight: 400,
  },
  sectionSubtitle: {
    fontSize: { xs: '0.9rem', md: '1rem' },
    lineHeight: 1.65,
    fontWeight: 400,
  },
  joinHeading: {
    ...SECTION_MAIN_TITLE,
  },
  joinSubtitle: {
    fontSize: { xs: '1.05rem', md: '1.25rem' },
    lineHeight: 1.6,
    fontWeight: 400,
  },
  adminCardTitle: {
    fontWeight: 700,
    fontSize: { xs: '1.05rem', md: '1.125rem' },
    lineHeight: 1.3,
  },
  adminCardDescription: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
    color: 'text.secondary',
  },
  contactInfoTitle: {
    ...SECTION_MAIN_TITLE,
  },
  contactInfoSubtitle: {
    fontSize: { xs: '0.9rem', sm: '0.98rem' },
    lineHeight: 1.6,
    fontWeight: 400,
  },
  footerStatValue: {
    fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2.15rem' },
    lineHeight: 1.15,
    letterSpacing: '-0.03em',
    fontWeight: 700,
  },
  footerMetaText: {
    fontSize: { xs: '0.8rem', sm: '0.875rem' },
    lineHeight: 1.55,
    fontWeight: 500,
  },
};

