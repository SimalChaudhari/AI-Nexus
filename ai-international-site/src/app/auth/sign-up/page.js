'use client';

import { Suspense } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { IntlSignUpView } from 'src/sections/auth/intl-sign-up-view';

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      }
    >
      <IntlSignUpView />
    </Suspense>
  );
}
