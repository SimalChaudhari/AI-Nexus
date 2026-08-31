'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { INTL_NAVY, INTL_SOFT_BG } from 'src/theme/intl-brand';

/**
 * Soft centered spinner for first paint / suspense — keeps soft bg (not blank white).
 */
export default function Loading() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: INTL_SOFT_BG,
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          bgcolor: '#fff',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 8px 24px rgba(0, 32, 96, 0.12)',
        }}
      >
        <CircularProgress size={26} thickness={4} sx={{ color: INTL_NAVY }} />
      </Box>
    </Box>
  );
}
