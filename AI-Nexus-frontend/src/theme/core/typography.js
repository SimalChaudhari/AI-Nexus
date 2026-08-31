import { setFont } from '../styles/utils';
import { brandFonts } from './brand-system';
import { FLUID_FONT_SIZES, FLUID_LINE_HEIGHTS } from '../fluid-typography';

// ----------------------------------------------------------------------

export const defaultFont = brandFonts.primary;

export const primaryFont = setFont(defaultFont);

export const secondaryFont = setFont(brandFonts.secondary);

export const montserratFont = setFont('Montserrat');

export const pacificoFont = setFont('Pacifico');

// Re-export for pages that need custom `sx`
export { FLUID_FONT_SIZES, FLUID_TYPOGRAPHY, fluidTypographySx } from '../fluid-typography';

// ----------------------------------------------------------------------

/** MUI typography — fluid clamp on every variant (all routes / menu pages). */
export const typography = {
  fontFamily: primaryFont,
  fontSecondaryFamily: secondaryFont,
  fontWeightLight: '300',
  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightSemiBold: '600',
  fontWeightBold: '700',
  h1: {
    fontWeight: 800,
    lineHeight: FLUID_LINE_HEIGHTS.h1,
    fontSize: FLUID_FONT_SIZES.h1,
    fontFamily: secondaryFont,
  },
  h2: {
    fontWeight: 800,
    lineHeight: FLUID_LINE_HEIGHTS.h2,
    fontSize: FLUID_FONT_SIZES.h2,
    fontFamily: secondaryFont,
  },
  h3: {
    fontWeight: 700,
    lineHeight: FLUID_LINE_HEIGHTS.h3,
    fontSize: FLUID_FONT_SIZES.h3,
    fontFamily: secondaryFont,
  },
  h4: {
    fontWeight: 700,
    lineHeight: FLUID_LINE_HEIGHTS.h4,
    fontSize: FLUID_FONT_SIZES.h4,
  },
  h5: {
    fontWeight: 700,
    lineHeight: FLUID_LINE_HEIGHTS.h5,
    fontSize: FLUID_FONT_SIZES.h5,
  },
  h6: {
    fontWeight: 600,
    lineHeight: FLUID_LINE_HEIGHTS.h6,
    fontSize: FLUID_FONT_SIZES.h6,
  },
  subtitle1: {
    fontWeight: 600,
    lineHeight: FLUID_LINE_HEIGHTS.subtitle1,
    fontSize: FLUID_FONT_SIZES.subtitle1,
  },
  subtitle2: {
    fontWeight: 600,
    lineHeight: FLUID_LINE_HEIGHTS.subtitle2,
    fontSize: FLUID_FONT_SIZES.subtitle2,
  },
  body1: {
    lineHeight: FLUID_LINE_HEIGHTS.body1,
    fontSize: FLUID_FONT_SIZES.body1,
  },
  body2: {
    lineHeight: FLUID_LINE_HEIGHTS.body2,
    fontSize: FLUID_FONT_SIZES.body2,
  },
  caption: {
    lineHeight: FLUID_LINE_HEIGHTS.caption,
    fontSize: FLUID_FONT_SIZES.caption,
  },
  overline: {
    fontWeight: 700,
    lineHeight: FLUID_LINE_HEIGHTS.overline,
    fontSize: FLUID_FONT_SIZES.overline,
    textTransform: 'uppercase',
  },
  button: {
    fontWeight: 700,
    lineHeight: FLUID_LINE_HEIGHTS.button,
    fontSize: FLUID_FONT_SIZES.button,
    textTransform: 'unset',
  },
};
