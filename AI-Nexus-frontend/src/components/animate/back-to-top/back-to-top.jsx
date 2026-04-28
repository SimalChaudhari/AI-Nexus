import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function BackToTop({ value = 0, sx, ...other }) {
  const { pathname } = useLocation();

  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollHeight = document.documentElement.scrollHeight || 0;
      const viewportHeight = window.innerHeight || 0;
      const denominator = Math.max(scrollHeight - viewportHeight, 1);
      const progressPercent = (scrollTop / denominator) * 100;
      const normalized = Math.max(0, Math.min(100, Math.round(progressPercent)));
      setProgress(normalized);
      setShow(progressPercent > value);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [value, pathname]);

  // On route/page change, hide initially; it will appear again after scroll threshold.
  useEffect(() => {
    setShow(false);
    setProgress(0);
  }, [pathname]);

  return (
    <Fab
      aria-label="Back to top"
      onClick={backToTop}
      sx={{
        width: 52,
        height: 52,
        position: 'fixed',
        transform: 'scale(0)',
        right: { xs: 24, md: 32 },
        bottom: { xs: 92, md: 104 },
        zIndex: (theme) => theme.zIndex.speedDial,
        bgcolor: 'background.paper',
        color: 'secondary.main',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        boxShadow: (theme) => theme.shadows[8],
        transition: (theme) => theme.transitions.create(['transform', 'box-shadow']),
        ...(show && { transform: 'scale(1)' }),
        '&:hover': {
          bgcolor: 'background.paper',
          boxShadow: (theme) => theme.shadows[12],
        },
        ...sx,
      }}
      {...other}
    >
      <CircularProgress
        variant="determinate"
        value={100}
        size={44}
        thickness={4}
        sx={{
          position: 'absolute',
          color: (theme) => theme.palette.grey[300],
        }}
      />
      <CircularProgress
        variant="determinate"
        value={progress}
        size={44}
        thickness={4}
        sx={{
          position: 'absolute',
          color: 'secondary.main',
        }}
      />
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          bgcolor: 'secondary.main',
          color: 'secondary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        <Iconify width={16} icon="solar:double-alt-arrow-up-bold-duotone" />
      </Box>
    </Fab>
  );
}
