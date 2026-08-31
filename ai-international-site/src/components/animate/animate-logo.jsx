'use client';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { Logo } from 'src/components/logo';

// ----------------------------------------------------------------------
/** Same animated logo treatment as login / signup pages. */

export function AnimateLogo2({ logo, sx, ...other }) {
  return (
    <Box
      alignItems="center"
      justifyContent="center"
      sx={{
        width: 96,
        height: 96,
        position: 'relative',
        alignItems: 'center',
        display: 'inline-flex',
        justifyContent: 'center',
        ...sx,
      }}
      {...other}
    >
      {logo ?? (
        <Logo
          disableLink
          width={64}
          height={40}
          sx={{
            zIndex: 9,
            width: 64,
            maxWidth: 72,
            height: 40,
            maxHeight: 44,
            objectFit: 'contain',
          }}
        />
      )}

      <Box
        component={m.div}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, ease: 'linear', repeat: Infinity }}
        sx={{
          width: 1,
          height: 1,
          opacity: 0.16,
          borderRadius: '50%',
          position: 'absolute',
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0)} 50%, ${theme.palette.primary.main} 100%)`,
        }}
      />
    </Box>
  );
}
