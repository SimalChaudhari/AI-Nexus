'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { INTL_NAVY, INTL_RED, INTL_SOFT_PANEL } from 'src/theme/intl-brand';

import { AuthCenteredMain } from './main';

// ----------------------------------------------------------------------

/**
 * International auth shell — soft brand surface (no decorative image).
 */
export function AuthCenteredLayout({ children, wide = false, sx }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: INTL_SOFT_PANEL,
        overflowX: 'hidden',
        overflowY: 'auto',
        scrollbarGutter: 'stable',
        WebkitOverflowScrolling: 'touch',
        '&::before': {
          content: "''",
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 80% 55% at 12% -10%, ${alpha(INTL_NAVY, 0.12)} 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 100% 0%, ${alpha(INTL_RED, 0.05)} 0%, transparent 50%),
            linear-gradient(180deg, ${INTL_SOFT_PANEL} 0%, #f8fafc 48%, #ffffff 100%)
          `,
        },
        ...sx,
      }}
    >
      <AuthCenteredMain wide={wide}>{children}</AuthCenteredMain>
    </Box>
  );
}
