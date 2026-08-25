'use client';

import Box from '@mui/material/Box';

import { CenteredLoader } from 'src/components/navigation-progress';
import { INTL_SOFT_BG } from 'src/theme/intl-brand';

export default function IntlAppLoading() {
  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 'calc(100dvh - 64px)',
        display: 'grid',
        placeItems: 'center',
        bgcolor: INTL_SOFT_BG,
      }}
    >
      <CenteredLoader />
    </Box>
  );
}
