'use client';

import { useMemo } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

import { IntlAuthProvider } from 'src/auth/intl-auth-context';
import { IntlFlashToast } from 'src/components/intl-flash-toast/intl-flash-toast';
import { MotionLazy } from 'src/components/animate/motion-lazy';

import { createAppTheme } from './create-theme';

export function ThemeProvider({ children }) {
  const theme = useMemo(() => createAppTheme(), []);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <IntlAuthProvider>
        <MotionLazy>
          {children}
          <IntlFlashToast />
        </MotionLazy>
      </IntlAuthProvider>
    </MuiThemeProvider>
  );
}
