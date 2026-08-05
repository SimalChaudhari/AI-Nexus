/**
 * App-wide fluid typography — clamp scales smoothly on every screen.
 */

export const FLUID_FONT_SIZES = {
  display: 'clamp(1.45rem, 0.95rem + 2.35vw, 3.2rem)',
  h1: 'clamp(2rem, 1.35rem + 2.75vw, 4rem)',
  h2: 'clamp(1.75rem, 1.2rem + 2vw, 3rem)',
  h3: 'clamp(1.375rem, 1.08rem + 1.1vw, 2rem)',
  h4: 'clamp(1.125rem, 1rem + 0.65vw, 1.5rem)',
  h5: 'clamp(1rem, 0.92rem + 0.45vw, 1.25rem)',
  h6: 'clamp(0.9375rem, 0.88rem + 0.35vw, 1.125rem)',
  subtitle1: 'clamp(0.9375rem, 0.88rem + 0.3vw, 1rem)',
  subtitle2: 'clamp(0.8125rem, 0.76rem + 0.28vw, 0.875rem)',
  body1: 'clamp(0.9375rem, 0.86rem + 0.32vw, 1rem)',
  body2: 'clamp(0.8125rem, 0.74rem + 0.32vw, 0.9375rem)',
  caption: 'clamp(0.6875rem, 0.64rem + 0.22vw, 0.75rem)',
  overline: 'clamp(0.625rem, 0.58rem + 0.2vw, 0.75rem)',
  button: 'clamp(0.8125rem, 0.76rem + 0.28vw, 0.875rem)',
  lead: 'clamp(0.875rem, 0.8rem + 0.4vw, 1.125rem)',
  /** Home hero headline — compact but still prominent */
  heroHeadline: 'clamp(1.5rem, 0.95rem + 1.85vw, 2.25rem)',
  /** Home hero body copy */
  heroDescription: 'clamp(0.8125rem, 0.76rem + 0.32vw, 0.9375rem)',
  /** Large stat / price numbers */
  statLg: 'clamp(1.75rem, 1.35rem + 1.4vw, 2.65rem)',
  statMd: 'clamp(1.35rem, 1.05rem + 0.9vw, 2.15rem)',
  statSm: 'clamp(0.875rem, 0.82rem + 0.35vw, 1.0625rem)',
  /** Programme fees — SGD amounts */
  feePrice: 'clamp(1.25rem, 0.9rem + 1.15vw, 2.15rem)',
  /** e.g. "inclusive of 9% GST" */
  feePriceNote: 'clamp(0.6875rem, 0.62rem + 0.28vw, 0.8125rem)',
};

/** Aligns digits; use on prices, percentages, fee tables */
export const FLUID_NUMERIC_SX = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum"',
};

export const FLUID_TYPOGRAPHY = {
  display: {
    fontSize: FLUID_FONT_SIZES.display,
    lineHeight: { xs: 1.25, md: 1.2 },
    letterSpacing: { xs: '-0.01em', md: '-0.015em' },
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: FLUID_FONT_SIZES.display,
    lineHeight: { xs: 1.25, md: 1.2 },
    letterSpacing: { xs: '-0.01em', md: '-0.015em' },
    fontWeight: 700,
  },
  heroHeadline: {
    fontSize: FLUID_FONT_SIZES.heroHeadline,
    lineHeight: 1.1,
    letterSpacing: '-0.025em',
    fontWeight: 800,
  },
  heroDescription: {
    fontSize: FLUID_FONT_SIZES.heroDescription,
    lineHeight: { xs: 1.5, md: 1.55 },
    fontWeight: 400,
  },
  heroBadge: {
    fontSize: FLUID_FONT_SIZES.caption,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: FLUID_FONT_SIZES.subtitle1,
    lineHeight: 1.65,
    fontWeight: 400,
  },
  body: {
    fontSize: FLUID_FONT_SIZES.body1,
    lineHeight: 1.6,
  },
  bodySmall: {
    fontSize: FLUID_FONT_SIZES.body2,
    lineHeight: 1.55,
  },
  cardTitle: {
    fontSize: FLUID_FONT_SIZES.h3,
    lineHeight: 1.25,
    fontWeight: 700,
  },
  cardTitleSm: {
    fontSize: FLUID_FONT_SIZES.h5,
    lineHeight: 1.3,
    fontWeight: 700,
  },
  statValue: {
    fontSize: FLUID_FONT_SIZES.statLg,
    lineHeight: 1.1,
    fontWeight: 800,
  },
  statValueMd: {
    fontSize: FLUID_FONT_SIZES.statMd,
    lineHeight: 1.15,
    fontWeight: 800,
  },
  statLabel: {
    fontSize: FLUID_FONT_SIZES.statSm,
    lineHeight: 1.35,
    fontWeight: 500,
  },
  price: {
    fontSize: FLUID_FONT_SIZES.statMd,
    lineHeight: 1.15,
    fontWeight: 800,
  },
  feePrice: {
    fontSize: FLUID_FONT_SIZES.feePrice,
    lineHeight: 1.1,
    fontWeight: 800,
  },
  feePriceNote: {
    fontSize: FLUID_FONT_SIZES.feePriceNote,
    lineHeight: 1.45,
    fontWeight: 500,
  },
  label: {
    fontSize: FLUID_FONT_SIZES.caption,
    lineHeight: 1.4,
    fontWeight: 600,
  },
  micro: {
    fontSize: FLUID_FONT_SIZES.overline,
    lineHeight: 1.35,
    fontWeight: 500,
  },
};

export const FLUID_LINE_HEIGHTS = {
  display: { xs: 1.25, md: 1.2 },
  h1: 1.25,
  h2: 1.3,
  h3: 1.5,
  h4: 1.5,
  h5: 1.5,
  h6: 1.45,
  subtitle1: 1.5,
  subtitle2: 1.45,
  body1: 1.6,
  body2: 1.55,
  caption: 1.5,
  overline: 1.5,
  button: 1.45,
  lead: { xs: 1.6, md: 1.65 },
};

/** @param {keyof typeof FLUID_TYPOGRAPHY} variant */
export function fluidTypographySx(variant, extra = {}) {
  return { ...FLUID_TYPOGRAPHY[variant], ...extra };
}
