'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { INTL_NAVY, INTL_SOFT_BG } from 'src/theme/intl-brand';

const START_EVENT = 'intl-navigation-start';

/** Mark in-app navigation as pending so the content area can show a loader. */
export function notifyNavigationStart() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(START_EVENT));
}

export function CenteredLoader({ label = 'Loading…' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
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
      {label ? (
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: alpha(INTL_NAVY, 0.7) }}>
          {label}
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * Covers only the page body (layout chrome stays). Hides when the route changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onStart = () => setVisible(true);
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, []);

  useEffect(() => {
    setVisible(false);
  }, [pathname]);

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'grid',
        placeItems: 'center',
        bgcolor: INTL_SOFT_BG,
      }}
    >
      <CenteredLoader />
    </Box>
  );
}
