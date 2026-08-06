'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import heroEarthImage from 'src/assets/international/hero-earth.png';

import { AuthCenteredMain } from './main';

const NAVY = '#002060';
const heroEarthSrc =
  typeof heroEarthImage === 'string' ? heroEarthImage : heroEarthImage?.src;

// ----------------------------------------------------------------------

/**
 * International auth shell — navy/white brand surface + subtle earth atmosphere.
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
        overflow: 'hidden',
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
        '&::after': {
          content: "''",
          position: 'fixed',
          right: { xs: '-18%', md: '-6%' },
          bottom: { xs: '-8%', md: '-12%' },
          width: { xs: '78%', md: '52%' },
          maxWidth: 720,
          aspectRatio: '1 / 1',
          zIndex: 0,
          opacity: 0.14,
          backgroundImage: heroEarthSrc ? `url(${heroEarthSrc})` : 'none',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          pointerEvents: 'none',
          filter: 'saturate(0.85)',
        },
        ...sx,
      }}
    >
      <AuthCenteredMain wide={wide}>{children}</AuthCenteredMain>
    </Box>
  );
}
