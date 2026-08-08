'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { AuthCenteredMain } from './main';

const NAVY = '#002060';

// ----------------------------------------------------------------------

/**
 * International auth shell — soft navy/white brand surface (no decorative image).
 */
export function AuthCenteredLayout({ children, wide = false, sx }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f4f7fb',
        // Allow vertical scroll; overflow:hidden + MUI Select scroll-lock made the page jump/"flip".
        overflowX: 'hidden',
        overflowY: 'auto',
        scrollbarGutter: 'stable',
        '&::before': {
          content: "''",
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: `
            radial-gradient(ellipse 80% 55% at 12% -10%, ${alpha(NAVY, 0.14)} 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 100% 0%, ${alpha('#C00000', 0.06)} 0%, transparent 50%),
            linear-gradient(180deg, #eef3f9 0%, #f7f9fc 42%, #ffffff 100%)
          `,
        },
        ...sx,
      }}
    >
      <AuthCenteredMain wide={wide}>{children}</AuthCenteredMain>
    </Box>
  );
}
