/**
 * Home page typography — all sections use this fluid scale.
 */
import { FLUID_FONT_SIZES, FLUID_NUMERIC_SX, FLUID_TYPOGRAPHY } from './fluid-typography';

export { FLUID_FONT_SIZES, FLUID_TYPOGRAPHY, fluidTypographySx } from './fluid-typography';

/** @deprecated Use FLUID_TYPOGRAPHY — kept for admin settings + legacy imports */
export const HERO_TYPOGRAPHY = {
  sectionMainTitle: FLUID_TYPOGRAPHY.sectionTitle,
  homeCardsHeading: FLUID_TYPOGRAPHY.sectionTitle,
  homeHeadline: FLUID_TYPOGRAPHY.sectionTitle,
  homeDescription: FLUID_TYPOGRAPHY.heroDescription,
  sectionSubtitle: FLUID_TYPOGRAPHY.sectionSubtitle,
  joinHeading: FLUID_TYPOGRAPHY.sectionTitle,
  joinSubtitle: {
    fontSize: FLUID_FONT_SIZES.h5,
    lineHeight: 1.6,
    fontWeight: 400,
  },
  adminCardTitle: FLUID_TYPOGRAPHY.cardTitleSm,
  adminCardDescription: FLUID_TYPOGRAPHY.bodySmall,
  contactInfoTitle: FLUID_TYPOGRAPHY.sectionTitle,
  contactInfoSubtitle: FLUID_TYPOGRAPHY.sectionSubtitle,
  footerStatValue: FLUID_TYPOGRAPHY.statValueMd,
  footerMetaText: FLUID_TYPOGRAPHY.bodySmall,
};

export const HOME_TYPOGRAPHY = {
  ...FLUID_TYPOGRAPHY,
  ...HERO_TYPOGRAPHY,
  heroCta: { fontSize: FLUID_FONT_SIZES.button, fontWeight: 700 },
  heroStatValue: FLUID_TYPOGRAPHY.statLabel,
  heroStatLabel: FLUID_TYPOGRAPHY.micro,
  testimonialQuote: {
    fontSize: FLUID_FONT_SIZES.h4,
    lineHeight: 1.45,
    fontWeight: 600,
  },
  testimonialName: {
    fontSize: FLUID_FONT_SIZES.h5,
    lineHeight: 1.3,
    fontWeight: 700,
  },
  accordionTitle: FLUID_TYPOGRAPHY.cardTitle,
  moduleTitle: FLUID_TYPOGRAPHY.cardTitleSm,
  chip: FLUID_TYPOGRAPHY.label,
};

/** Shared h2 for curriculum, fees, FAQs, etc. */
export const HOME_SECTION_HEADING_SX = {
  m: 0,
  textAlign: 'left',
  color: 'secondary.main',
  fontWeight: 800,
  fontSize: FLUID_FONT_SIZES.h3,
  lineHeight: 1.2,
  letterSpacing: '-0.02em',
};

export const HOME_SECTION_BADGE_SX = {
  display: 'inline-flex',
  px: 1.5,
  py: 0.5,
  borderRadius: 1,
  fontWeight: 700,
  fontSize: FLUID_FONT_SIZES.overline,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

/** Prices + GST notes in programme fees card */
export const PROGRAMME_FEES_PRICE_SX = {
  ...FLUID_NUMERIC_SX,
  ...FLUID_TYPOGRAPHY.feePrice,
  whiteSpace: { xs: 'normal', sm: 'nowrap' },
  overflowWrap: 'anywhere',
  maxWidth: '100%',
};

export const PROGRAMME_FEES_PRICE_NOTE_SX = {
  ...FLUID_NUMERIC_SX,
  ...FLUID_TYPOGRAPHY.feePriceNote,
  color: 'text.secondary',
  display: 'block',
  mt: 0.5,
  maxWidth: { xs: '100%', sm: 280 },
  textAlign: { xs: 'left', sm: 'right' },
};

export const PROGRAMME_FEES_HTML_SX = {
  ...FLUID_TYPOGRAPHY.bodySmall,
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum"',
  '& p, & li, & span, & td, & th': {
    fontSize: 'inherit',
    lineHeight: 'inherit',
  },
  '& strong, & b': { fontWeight: 700 },
  '& em': { fontStyle: 'italic' },
};
