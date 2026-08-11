'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { INTL_NAVY } from 'src/theme/intl-brand';

// ----------------------------------------------------------------------

export function AuthCenteredMain({ children, wide = false, sx, ...other }) {
  return (
    <Box
      component="main"
      sx={{
        px: { xs: 1.25, sm: 2 },
        py: { xs: 1.5, sm: 2.5, md: 3 },
        zIndex: 9,
        display: 'flex',
        flex: '1 1 auto',
        alignItems: { xs: 'stretch', md: 'flex-start' },
        flexDirection: 'column',
        justifyContent: { xs: 'flex-start', md: 'center' },
        minHeight: '100dvh',
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          py: { xs: 1.75, sm: 2.25, md: 2.5 },
          px: { xs: 1.5, sm: 2.25, md: 2.75 },
          width: 1,
          mx: 'auto',
          borderRadius: { xs: 1.75, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#fff',
          border: `1px solid ${alpha(INTL_NAVY, 0.1)}`,
          boxShadow: `0 8px 28px ${alpha(INTL_NAVY, 0.06)}`,
          maxWidth: wide
            ? {
                xs: 1,
                sm: 720,
                md: 980,
                lg: 1040,
              }
            : {
                xs: 1,
                sm: 420,
              },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
