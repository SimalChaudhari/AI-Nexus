'use client';

import { memo } from 'react';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { IntlAccountMenu } from 'src/components/intl-account-menu';
import { paths } from 'src/routes/paths';
import { INTL_NAVY, INTL_SOFT_BG } from 'src/theme/intl-brand';

// ----------------------------------------------------------------------

const NAVY = INTL_NAVY;
export const INTL_APP_TOPBAR_HEIGHT = 64;

/**
 * Fixed top bar — same on Learning dashboard and Profile.
 */
function IntlAppTopBarComponent() {
  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 1200,
        height: INTL_APP_TOPBAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        borderBottom: `1px solid ${alpha(NAVY, 0.08)}`,
        bgcolor: '#ffffff',
        backgroundImage: `
          radial-gradient(ellipse 70% 80% at 100% 0%, ${alpha(NAVY, 0.06)} 0%, transparent 55%)
        `,
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1320,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
          <Button
            component={Link}
            href={paths.international}
            prefetch
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            sx={{
              textTransform: 'none',
              color: alpha(NAVY, 0.65),
              px: 1.25,
              py: 0.75,
              minWidth: 0,
              minHeight: 40,
              fontWeight: 600,
              borderRadius: 1,
              position: 'relative',
              zIndex: 1,
              pointerEvents: 'auto',
              '&:hover': { bgcolor: alpha(NAVY, 0.04), color: NAVY },
            }}
          >
            Back to languages
          </Button>

          <IntlAccountMenu />
        </Stack>
      </Box>
    </Box>
  );
}

export const IntlAppTopBar = memo(IntlAppTopBarComponent);

export function IntlAppLayout({ children }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: INTL_SOFT_BG,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <IntlAppTopBar />
      <Box sx={{ height: INTL_APP_TOPBAR_HEIGHT, flexShrink: 0 }} aria-hidden />
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>{children}</Box>
    </Box>
  );
}
