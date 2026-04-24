import Box from '@mui/material/Box';

import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

export function TableLoadingOverlay({ minHeight = 220 }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <LoadingScreen sx={{ minHeight, px: 0 }} />
    </Box>
  );
}

