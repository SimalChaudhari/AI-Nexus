import { brandPalette, brandText } from './brand-system';
import { varAlpha, createPaletteChannel } from '../styles';

// ----------------------------------------------------------------------

// Grey
export const grey = createPaletteChannel(brandPalette.grey);

// Primary
export const primary = createPaletteChannel(brandPalette.primary);

// Secondary
export const secondary = createPaletteChannel(brandPalette.secondary);

// Info
export const info = createPaletteChannel(brandPalette.info);

// Success
export const success = createPaletteChannel(brandPalette.success);

// Warning
export const warning = createPaletteChannel(brandPalette.warning);

// Error
export const error = createPaletteChannel(brandPalette.error);

// Common
export const common = createPaletteChannel(brandPalette.common);

// Text
export const text = {
  light: createPaletteChannel({
    primary: brandText.light.primary,
    secondary: brandText.light.secondary,
    disabled: brandText.light.disabled,
  }),
  dark: createPaletteChannel({
    primary: brandText.dark.primary,
    secondary: brandText.dark.secondary,
    disabled: brandText.dark.disabled,
  }),
};

// Background
export const background = {
  light: createPaletteChannel({
    paper: '#FFFFFF',
    default: '#FFFFFF',
    neutral: grey[200],
  }),
  dark: createPaletteChannel({
    paper: grey[800],
    default: grey[900],
    neutral: '#28323D',
  }),
};

// Action
export const baseAction = {
  hover: varAlpha(grey['500Channel'], 0.08),
  selected: varAlpha(grey['500Channel'], 0.16),
  focus: varAlpha(grey['500Channel'], 0.24),
  disabled: varAlpha(grey['500Channel'], 0.8),
  disabledBackground: varAlpha(grey['500Channel'], 0.24),
  hoverOpacity: 0.08,
  disabledOpacity: 0.48,
};

export const action = {
  light: { ...baseAction, active: grey[600] },
  dark: { ...baseAction, active: grey[500] },
};

/*
 * Base palette
 */
export const basePalette = {
  primary,
  secondary,
  info,
  success,
  warning,
  error,
  grey,
  common,
  divider: varAlpha(grey['500Channel'], 0.2),
  action,
};

export const lightPalette = {
  ...basePalette,
  text: text.light,
  background: background.light,
  action: action.light,
};

export const darkPalette = {
  ...basePalette,
  text: text.dark,
  background: background.dark,
  action: action.dark,
};

// ----------------------------------------------------------------------

export const colorSchemes = {
  light: { palette: lightPalette },
  dark: { palette: darkPalette },
};
