'use client';

import { createTheme } from '@mui/material/styles';

import { INTL_NAVY, INTL_NAVY_DEEP, INTL_RED, INTL_SOFT_BG } from './intl-brand';

export function createAppTheme() {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: INTL_RED,
        dark: '#B7221D',
        light: '#EE6A64',
        contrastText: '#ffffff',
      },
      secondary: {
        main: INTL_NAVY,
        dark: INTL_NAVY_DEEP,
        light: '#5C7AA1',
        contrastText: '#ffffff',
      },
      text: {
        primary: '#1C4270',
        secondary: '#49617E',
      },
      background: {
        default: INTL_SOFT_BG,
        paper: '#ffffff',
      },
      divider: '#DFE3E8',
    },
    typography: {
      fontFamily:
        '"Public Sans", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    },
    shape: {
      borderRadius: 8,
    },
  });
}
