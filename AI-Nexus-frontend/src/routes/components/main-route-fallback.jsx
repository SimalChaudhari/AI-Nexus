import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

/** Keeps header/footer visible while a lazy route chunk loads (no full-screen overlay). */
export function MainRouteFallback() {
  return (
    <Box
      aria-hidden
      sx={{
        flex: '1 1 auto',
        width: '100%',
        minHeight: '40vh',
      }}
    />
  );
}
