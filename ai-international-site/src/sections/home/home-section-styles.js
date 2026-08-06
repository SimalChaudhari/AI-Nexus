import { alpha } from '@mui/material/styles';

import { FLUID_FONT_SIZES } from 'src/theme/fluid-typography';

export const HOME_SECTION_RED = '#C00000';

export const HOME_DASHBOARD_CONTENT_SX = {
  width: 1,
  maxWidth: '100%',
  mx: 'auto',
  px: { xs: 1.25, sm: 2, md: 3, lg: 4 },
  pt: 0,
  pb: 0,
};

export const HOME_SECTION_TITLE_SX = {
  m: 0,
  fontWeight: 700,
  fontSize: FLUID_FONT_SIZES.h5,
  lineHeight: 1.25,
  color: 'secondary.main',
};

export const HOME_SECTION_UNDERLINE_SX = {
  width: { xs: 56, sm: 64 },
  height: 3,
  borderRadius: 999,
  background: (theme) =>
    `linear-gradient(90deg, ${HOME_SECTION_RED} 0%, ${theme.palette.secondary.main} 100%)`,
  boxShadow: `0 2px 8px ${alpha(HOME_SECTION_RED, 0.22)}`,
};
