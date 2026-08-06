'use client';

import { createTheme } from '@mui/material/styles';

import { INTL_NAVY, INTL_NAVY_DEEP, INTL_RED, INTL_SOFT_BG } from './intl-brand';

export function createAppTheme() {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: INTL_RED,
        dark: '#9a0000',
        light: '#d63333',
        contrastText: '#ffffff',
      },
      secondary: {
        main: INTL_NAVY,
        dark: INTL_NAVY_DEEP,
        light: '#1a3a7a',
        contrastText: '#ffffff',
      },
      text: {
        primary: '#0f1a2e',
        secondary: '#3d4f6f',
      },
      background: {
        default: INTL_SOFT_BG,
        paper: '#ffffff',
      },
      divider: '#d8dee8',
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
