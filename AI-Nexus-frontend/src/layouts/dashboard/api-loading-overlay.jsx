import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import { LoadingScreen } from 'src/components/loading-screen';

import { apiLoading } from 'src/utils/api-loading';

// ----------------------------------------------------------------------

/**
 * Full-screen overlay with spinner when any API request is in progress.
 * Used inside dashboard layout so it only shows on admin routes.
 */
export function ApiLoadingOverlay() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => apiLoading.subscribe(setPendingCount), []);

  if (pendingCount <= 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: (t) => t.palette.background.default,
        opacity: 0.9,
      }}
    >
      <LoadingScreen sx={{ minHeight: 220, px: 0 }} />
    </Box>
  );
}
