import { alpha } from '@mui/material/styles';

import { FLUID_FONT_SIZES } from 'src/theme/fluid-typography';

// Shared section eyebrow + title metrics — same font size/family on every Partner with ISCA section.

/** Eyebrow text — hero pill, CTA pill, and plain section eyebrows all use this */
export const PARTNER_EYEBROW_TEXT_SX = {
  fontSize: {
    xs: FLUID_FONT_SIZES.overline,
    md: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
  },
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  lineHeight: 1.4,
};

export const PARTNER_EYEBROW_SX = {
  m: 0,
  ...PARTNER_EYEBROW_TEXT_SX,
  color: 'text.secondary',
  overflowWrap: 'break-word',
};

/** Section h2 title — Benefits, Dashboard, How it works, FAQ, CTA */
export const PARTNER_SECTION_TITLE_TEXT_SX = {
  fontSize: FLUID_FONT_SIZES.h3,
  fontWeight: 800,
  lineHeight: 1.25,
  letterSpacing: '-0.02em',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
};

export const PARTNER_SECTION_TITLE_SX = {
  m: 0,
  mb: { xs: 3, md: 6 },
  ...PARTNER_SECTION_TITLE_TEXT_SX,
  color: 'secondary.main',
  textAlign: 'center',
};

/** @deprecated Use PARTNER_SECTION_TITLE_TEXT_SX via SectionTitle align="left" */
export const PARTNER_SECTION_TITLE_LEFT_SX = {
  m: 0,
  mb: 1.5,
  ...PARTNER_SECTION_TITLE_TEXT_SX,
  color: 'secondary.main',
  textAlign: 'left',
};

export const PARTNER_BODY_SX = {
  m: 0,
  fontSize: 'clamp(0.8125rem, 0.76rem + 0.28vw, 0.875rem)',
  color: 'text.secondary',
  lineHeight: 1.7,
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
};

export const PARTNER_BODY_MD_SX = {
  m: 0,
  fontSize: 15,
  color: 'text.secondary',
  lineHeight: 1.8,
};

export const PARTNER_CARD_TITLE_SX = {
  m: 0,
  mb: 1,
  fontSize: 'clamp(0.875rem, 0.8rem + 0.4vw, 1rem)',
  fontWeight: 700,
  lineHeight: 1.35,
  color: 'secondary.main',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
};

export const PARTNER_FEATURE_TITLE_SX = {
  m: 0,
  mb: 0.375,
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.35,
  color: 'secondary.main',
};

export const PARTNER_STAT_VALUE_SX = {
  m: 0,
  fontSize: 'clamp(0.75rem, 0.65rem + 0.55vw, 1.125rem)',
  fontWeight: 800,
  lineHeight: 1.25,
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
};

export const PARTNER_STAT_LABEL_SX = {
  m: 0,
  mt: 0.25,
  fontSize: 'clamp(0.625rem, 0.56rem + 0.32vw, 0.75rem)',
  lineHeight: 1.35,
  color: 'text.secondary',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
};

export const PARTNER_MOCKUP_LABEL_SX = {
  m: 0,
  fontSize: 10,
  fontWeight: 700,
  color: 'text.secondary',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

export const PARTNER_MOCKUP_STAT_VALUE_SX = {
  m: 0,
  fontSize: 28,
  fontWeight: 800,
  lineHeight: 1.1,
};

export const PARTNER_MOCKUP_META_SX = {
  m: 0,
  fontSize: 11,
  color: 'text.secondary',
};

export const PARTNER_MOCKUP_NAME_SX = {
  m: 0,
  fontSize: 12,
  fontWeight: 600,
  color: 'secondary.main',
};

export const PARTNER_MOCKUP_AVATAR_SX = {
  fontSize: 10,
  fontWeight: 800,
};

export const PARTNER_MOCKUP_PILL_SX = {
  fontSize: 10,
  fontWeight: 700,
};

export const PARTNER_MOCKUP_HEADER_LOGO_SX = {
  fontSize: 11,
  fontWeight: 800,
};

export const PARTNER_MOCKUP_HEADER_TITLE_SX = {
  m: 0,
  fontSize: 14,
  fontWeight: 700,
  color: '#fff',
};

export const PARTNER_MOCKUP_HEADER_SUB_SX = {
  m: 0,
  fontSize: 11,
  color: 'rgba(255,255,255,0.72)',
};

export const PARTNER_MOCKUP_TAB_SX = {
  fontSize: 13,
  fontWeight: 600,
};

export const PARTNER_STEP_TITLE_SX = {
  m: 0,
  mb: 1,
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.35,
  color: 'secondary.main',
};

export const PARTNER_STEP_BODY_SX = {
  m: 0,
  fontSize: 13,
  color: 'text.secondary',
  lineHeight: 1.7,
};

export const PARTNER_FAQ_QUESTION_SX = {
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.4,
  color: 'secondary.main',
};

export const PARTNER_FAQ_ANSWER_SX = {
  m: 0,
  pb: 2.5,
  fontSize: 15,
  color: 'text.secondary',
  lineHeight: 1.8,
};

export const PARTNER_CTA_TITLE_SX = {
  m: 0,
  mb: 1.75,
  ...PARTNER_SECTION_TITLE_TEXT_SX,
  textAlign: 'center',
  color: '#fff',
};

export const PARTNER_CTA_BODY_SX = {
  m: 0,
  mb: 4.5,
  fontSize: 16,
  color: '#7ba0d0',
  lineHeight: 1.8,
};

export const PARTNER_BUTTON_TEXT_SX = {
  fontSize: {
    xs: 'clamp(0.75rem, 0.68rem + 0.4vw, 0.875rem)',
    md: 'clamp(0.875rem, 0.82rem + 0.2vw, 0.9375rem)',
  },
  fontWeight: 700,
  lineHeight: 1.3,
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
};

export const PARTNER_HERO_EYEBROW_SX = {
  display: 'inline-flex',
  alignSelf: 'flex-start',
  px: 1.75,
  py: 0.5,
  borderRadius: '20px',
  ...PARTNER_EYEBROW_TEXT_SX,
  color: 'primary.main',
  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
  border: (theme) => `1.5px solid ${theme.palette.primary.main}`,
};

export const PARTNER_HERO_TITLE_SX = {
  m: 0,
  ...PARTNER_SECTION_TITLE_TEXT_SX,
  lineHeight: 1.15,
  color: 'secondary.main',
};

export const PARTNER_HERO_BODY_SX = {
  m: 0,
  maxWidth: 500,
  fontSize: 16,
  lineHeight: 1.8,
  color: 'text.secondary',
};
