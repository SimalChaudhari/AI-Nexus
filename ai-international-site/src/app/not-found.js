'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#002060' }}>
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
