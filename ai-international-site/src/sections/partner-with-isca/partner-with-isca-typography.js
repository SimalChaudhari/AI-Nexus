import { alpha } from '@mui/material/styles';

import { FLUID_FONT_SIZES } from 'src/theme/fluid-typography';

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

export const PARTNER_SECTION_TITLE_TEXT_SX = {
  fontSize: FLUID_FONT_SIZES.h3,
  fontWeight: 800,
  lineHeight: 1.25,
  letterSpacing: '-0.02em',
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
