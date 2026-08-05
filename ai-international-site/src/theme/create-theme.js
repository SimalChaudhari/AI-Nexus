'use client';

import { createTheme } from '@mui/material/styles';

export function createAppTheme() {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#C00000',
        dark: '#9a0000',
        light: '#d63333',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#002060',
        dark: '#001545',
        light: '#1a3a7a',
        contrastText: '#ffffff',
      },
      text: {
        primary: '#0f1a2e',
        secondary: '#3d4f6f',
      },
      background: {
        default: '#ffffff',
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
