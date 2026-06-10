import { alpha } from '@mui/material/styles';

// Font sizes from the original Partner with ISCA HTML design (+ slight bump for readability).
// Colors stay aligned with the home page theme tokens.

export const PARTNER_EYEBROW_SX = {
  m: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

export const PARTNER_SECTION_TITLE_SX = {
  m: 0,
  mb: { xs: 3, md: 6 },
  fontSize: 34,
  fontWeight: 800,
  lineHeight: 1.25,
  color: 'secondary.main',
  textAlign: 'center',
};

export const PARTNER_SECTION_TITLE_LEFT_SX = {
  m: 0,
  mb: 1.5,
  fontSize: 30,
  fontWeight: 800,
  lineHeight: 1.25,
  color: 'secondary.main',
  textAlign: 'left',
};

export const PARTNER_BODY_SX = {
  m: 0,
  fontSize: 14,
  color: 'text.secondary',
  lineHeight: 1.7,
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
  fontSize: 16,
  fontWeight: 700,
  color: 'secondary.main',
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
  fontSize: 20,
  fontWeight: 800,
  lineHeight: 1.2,
};

export const PARTNER_STAT_LABEL_SX = {
  m: 0,
  mt: 0.25,
  fontSize: 13,
  color: 'text.secondary',
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
  fontSize: { xs: 28, md: 36 },
  fontWeight: 800,
  lineHeight: 1.25,
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
  fontSize: 15,
  fontWeight: 700,
};

export const PARTNER_HERO_EYEBROW_SX = {
  display: 'inline-flex',
  alignSelf: 'flex-start',
  px: 1.75,
  py: 0.5,
  borderRadius: '20px',
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'primary.main',
  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
  border: (theme) => `1.5px solid ${theme.palette.primary.main}`,
};

export const PARTNER_HERO_TITLE_SX = {
  m: 0,
  fontWeight: 800,
  fontSize: { xs: 32, md: 44 },
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
