'use client';

import { Suspense } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { IntlSignInView } from 'src/sections/auth/intl-sign-in-view';

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      }
    >
      <IntlSignInView />
    </Suspense>
  );
}
