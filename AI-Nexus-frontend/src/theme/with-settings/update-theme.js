import PRIMARY_COLOR from './primary-color.json';
import { components as coreComponents } from '../core/components';
import { brandPalette } from '../core/brand-system';
import { hexToRgbChannel, createPaletteChannel } from '../styles';
import { grey as coreGreyPalette, primary as corePrimaryPalette } from '../core/palette';
import { customShadows as coreCustomShadows } from '../core/custom-shadows';

// ----------------------------------------------------------------------

/**
 * [1] settings @primaryColor
 * [2] settings @contrast
 */

export function updateCoreWithSettings(theme, settings) {
  const { colorSchemes, customShadows } = theme;
  const brandPrimary = getPalettePrimary();

  return {
    ...theme,
    colorSchemes: {
      ...colorSchemes,
      light: {
        palette: {
          ...colorSchemes?.light?.palette,
          primary: brandPrimary,
          /** [2] */
          background: {
            ...colorSchemes?.light?.palette?.background,
            default: getBackgroundDefault(settings.contrast),
            defaultChannel: hexToRgbChannel(getBackgroundDefault(settings.contrast)),
          },
        },
      },
      dark: {
        palette: {
          ...colorSchemes?.dark?.palette,
          primary: brandPrimary,
        },
      },
    },
    customShadows: {
      ...customShadows,
      primary: coreCustomShadows('light').primary,
    },
  };
}

// ----------------------------------------------------------------------

export function updateComponentsWithSettings(settings) {
  const components = {};

  /** [2] */
  if (settings.contrast === 'hight') {
    const MuiCard = {
      styleOverrides: {
        root: ({ theme, ownerState }) => {
          let rootStyles = {};
          if (typeof coreComponents?.MuiCard?.styleOverrides?.root === 'function') {
            rootStyles =
              coreComponents.MuiCard.styleOverrides.root({
                ownerState,
                theme,
              }) ?? {};
          }

          return {
            ...rootStyles,
            boxShadow: theme.customShadows.z1,
          };
        },
      },
    };

    components.MuiCard = MuiCard;
  }

  return { components };
}

// ----------------------------------------------------------------------

const PRIMARY_COLORS = {
  default: brandPalette.primary,
  cyan: PRIMARY_COLOR.cyan,
  purple: PRIMARY_COLOR.purple,
  blue: PRIMARY_COLOR.blue,
  orange: PRIMARY_COLOR.orange,
  red: PRIMARY_COLOR.red,
  brown: PRIMARY_COLOR.brown,
  'ai-nexus': PRIMARY_COLOR['ai-nexus'],
  'ai-nexus-yellow': PRIMARY_COLOR['ai-nexus-yellow'],
};

function getPalettePrimary(primaryColorName) {
  const selectedPrimaryColor = PRIMARY_COLORS[primaryColorName] || PRIMARY_COLORS.default;
  const updatedPrimaryPalette = createPaletteChannel(selectedPrimaryColor);

  return primaryColorName === 'default' ? corePrimaryPalette : updatedPrimaryPalette;
}

function getBackgroundDefault(contrast) {
  /** [2] */
  return contrast === 'default' ? '#FFFFFF' : coreGreyPalette[200];
}
