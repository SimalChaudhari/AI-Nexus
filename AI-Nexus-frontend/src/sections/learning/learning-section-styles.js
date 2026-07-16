import { FLUID_FONT_SIZES } from 'src/theme/fluid-typography';

// ----------------------------------------------------------------------

export const LEARNING_SECTION_HEADER_WRAPPER_SX = {
  mb: { xs: 1.5, md: 2 },
};

export const LEARNING_SECTION_HEADER_ICON_BOX_SX = {
  width: { xs: 32, md: 36 },
  height: { xs: 32, md: 36 },
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 1.25,
  flexShrink: 0,
};

export const LEARNING_SECTION_HEADER_TITLE_SX = {
  m: 0,
  fontWeight: 700,
  fontSize: FLUID_FONT_SIZES.h5,
  lineHeight: 1.25,
};

export const LEARNING_SECTION_HEADER_SUBTITLE_SX = {
  color: 'text.secondary',
  lineHeight: 1.4,
  display: 'block',
};
