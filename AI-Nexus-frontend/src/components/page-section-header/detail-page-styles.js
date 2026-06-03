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
  fontWeight: 700,
  fontSize: FLUID_FONT_SIZES.h6,
  lineHeight: 1.35,
  mb: 2,
};

export const DETAIL_PAGE_META_ICON_SIZE = 16;

export const DETAIL_PAGE_CONTENT_SX = {
  typography: 'body2',
  fontSize: FLUID_FONT_SIZES.body2,
  lineHeight: 1.6,
};
