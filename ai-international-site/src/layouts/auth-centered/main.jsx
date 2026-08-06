'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

const NAVY = '#002060';

// ----------------------------------------------------------------------

export function AuthCenteredMain({ children, wide = false, sx, ...other }) {
  return (
    <Box
      component="main"
      sx={{
        px: { xs: 1.5, sm: 2 },
        py: { xs: 2.5, sm: 5 },
        zIndex: 9,
        display: 'flex',
        flex: '1 1 auto',
        alignItems: { xs: 'stretch', md: 'center' },
        flexDirection: 'column',
        justifyContent: { xs: 'flex-start', md: 'center' },
        minHeight: '100dvh',
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          py: { xs: 2.5, sm: 4, md: 4.5 },
          px: { xs: 2, sm: 3, md: 3.5 },
          width: 1,
          borderRadius: { xs: 2, sm: 2.5 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: alpha('#ffffff', 0.96),
          border: `1px solid ${alpha(NAVY, 0.1)}`,
          boxShadow: {
            xs: `0 8px 28px ${alpha(NAVY, 0.06)}`,
            md: `0 16px 48px ${alpha(NAVY, 0.08)}`,
          },
          backdropFilter: 'blur(8px)',
          maxWidth: wide
            ? {
                xs: 1,
                sm: 640,
                md: 920,
                lg: 1040,
              }
            : {
                xs: 1,
                sm: 440,
              },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
