'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { INTL_NAVY, INTL_SOFT_BG } from 'src/theme/intl-brand';

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 2,
        textAlign: 'center',
        bgcolor: INTL_SOFT_BG,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800, color: INTL_NAVY }}>
        Page not found
      </Typography>
      <Typography sx={{ color: '#3d4f6f' }}>
        The page you are looking for does not exist.
      </Typography>
      <Button component={Link} href="/" variant="contained" color="primary">
        Back to International
      </Button>
    </Box>
  );
}
