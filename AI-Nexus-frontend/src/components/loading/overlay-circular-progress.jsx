import Box from '@mui/material/Box';
import CircularProgress from 'src/components/loading/circular-progress';
import { alpha } from '@mui/material/styles';

/**
 * Generic overlay spinner.
 *
 * Use this for any "loading while keeping existing content" case:
 * - centered spinner (pagination)
 * - top spinner (filter/search refresh)
 */
export function OverlayCircularProgress({
  top = false,
  size = 32,
  zIndex = 2,
  borderRadius = 2,
  backgroundOpacity = 0.45,
  topPadding = { xs: 6, md: 8 },
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: top ? 'flex-start' : 'center',
        justifyContent: 'center',
        pt: top ? topPadding : 0,
        bgcolor: (theme) => alpha(theme.palette.background.default, backgroundOpacity),
        borderRadius,
        zIndex,
        pointerEvents: 'none',
      }}
    >
      <CircularProgress size={size} />
    </Box>
  );
}

