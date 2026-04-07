import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from 'src/components/loading/circular-progress';
import { useTheme } from '@mui/material/styles';

import { apiLoading } from 'src/utils/api-loading';

// ----------------------------------------------------------------------

/**
 * Full-screen overlay with spinner when any API request is in progress.
 * Used inside dashboard layout so it only shows on admin routes.
 */
export function ApiLoadingOverlay() {
  const theme = useTheme();
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
      <CircularProgress size={48} sx={{ color: theme.palette.primary.main }} />
    </Box>
  );
}
