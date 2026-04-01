import Box from '@mui/material/Box';
import CircularProgress from 'src/components/loading/circular-progress';

/**
 * Reusable centered spinner block for inline loading states.
 * Use inside cards/sections where full overlay is not needed.
 */
export function CenteredCircularLoader({ size = 32, py = 3 }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py }}>
      <CircularProgress size={size} />
    </Box>
  );
}

