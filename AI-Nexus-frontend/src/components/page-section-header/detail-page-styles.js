import { FLUID_FONT_SIZES } from 'src/theme/fluid-typography';
import { HOME_SECTION_CARD_SX } from 'src/sections/home/home-section-styles';

// ----------------------------------------------------------------------

/** Full-width shell inside DashboardContent (matches 1400px customer pages). */
export const DETAIL_PAGE_WRAPPER_SX = {
  width: 1,
  maxWidth: '100%',
};

export const DETAIL_PAGE_CARD_SX = {
  ...HOME_SECTION_CARD_SX,
  overflow: 'visible',
};

export const DETAIL_PAGE_LIST_SHELL_SX = {
  ...HOME_SECTION_CARD_SX,
  width: 1,
  overflow: 'hidden',
};

export const DETAIL_PAGE_CARD_PADDING = { xs: 2, sm: 2.5, md: 3 };

export const DETAIL_PAGE_TITLE_SX = {
  m: 0,
  fontWeight: 700,
  fontSize: FLUID_FONT_SIZES.h5,
  lineHeight: 1.3,
  mb: { xs: 1.5, md: 2 },
};

export const DETAIL_PAGE_SECTION_TITLE_SX = {
  m: 0,
  fontWeight: 600,
  fontSize: 'clamp(0.9375rem, 0.88rem + 0.28vw, 1.125rem)',
  lineHeight: 1.4,
  mb: 2,
};

export const DETAIL_PAGE_META_ICON_SIZE = 16;

export const DETAIL_PAGE_CONTENT_SX = {
  typography: 'body2',
  fontSize: FLUID_FONT_SIZES.body2,
  lineHeight: 1.6,
};

/** Learning course details — compact fluid scale (softer than default h4/h2) */
const COURSE_DETAIL_FONT_SIZES = {
  title: 'clamp(1rem, 0.92rem + 0.4vw, 1.25rem)',
  section: 'clamp(0.875rem, 0.82rem + 0.25vw, 1rem)',
  price: 'clamp(1.0625rem, 0.95rem + 0.45vw, 1.3125rem)',
  subprice: 'clamp(0.9375rem, 0.88rem + 0.3vw, 1.0625rem)',
  rating: 'clamp(1.125rem, 0.98rem + 0.5vw, 1.4375rem)',
  richHeading: 'clamp(0.875rem, 0.82rem + 0.22vw, 0.9375rem)',
};

export const COURSE_DETAIL_PAGE_TITLE_SX = {
  m: 0,
  fontWeight: 600,
  fontSize: COURSE_DETAIL_FONT_SIZES.title,
  lineHeight: 1.35,
  letterSpacing: '-0.01em',
  mb: 0.5,
};

export const COURSE_DETAIL_META_SX = {
  fontSize: FLUID_FONT_SIZES.body2,
  lineHeight: 1.55,
  fontWeight: 400,
  color: 'text.secondary',
};

export const COURSE_DETAIL_SECTION_HEADING_SX = {
  m: 0,
  fontWeight: 600,
  fontSize: COURSE_DETAIL_FONT_SIZES.section,
  lineHeight: 1.4,
  mb: 1,
};

export const COURSE_DETAIL_SIDEBAR_PRICE_SX = {
  fontWeight: 600,
  fontSize: COURSE_DETAIL_FONT_SIZES.price,
  lineHeight: 1.3,
  letterSpacing: '-0.015em',
  color: 'secondary.main',
  mb: 0.5,
};

export const COURSE_DETAIL_SIDEBAR_SUBPRICE_SX = {
  fontWeight: 600,
  fontSize: COURSE_DETAIL_FONT_SIZES.subprice,
  lineHeight: 1.35,
  color: 'success.main',
  mb: 0.5,
};

export const COURSE_DETAIL_RATING_AVERAGE_SX = {
  fontWeight: 600,
  fontSize: COURSE_DETAIL_FONT_SIZES.rating,
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
};

export const COURSE_DETAIL_SIDEBAR_EMPHASIS_SX = {
  fontSize: FLUID_FONT_SIZES.body2,
  fontWeight: 600,
  lineHeight: 1.4,
};

export const COURSE_DETAIL_RICH_TEXT_SX = {
  ...DETAIL_PAGE_CONTENT_SX,
  color: 'text.secondary',
  lineHeight: 1.6,
  '& p': { my: 0.6 },
  '& ul, & ol': { my: 0.75, pl: 2.5 },
  '& li': { mb: 0.4 },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    mt: 1,
    mb: 0.5,
    fontSize: COURSE_DETAIL_FONT_SIZES.richHeading,
    fontWeight: 600,
    lineHeight: 1.4,
  },
};
