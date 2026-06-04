import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

/** Inline required marker (labels, table headers, checkbox text). */
export function RequiredMark() {
  return (
    <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }} aria-hidden>
      {' *'}
    </Box>
  );
}
