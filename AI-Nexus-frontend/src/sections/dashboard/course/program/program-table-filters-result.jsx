import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { Iconify } from 'src/components/iconify';

export function ProgramTableFiltersResult({ filters, totalResults, onResetPage, sx }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={sx}>
      {filters.state.name ? (
        <Chip size="small" label={filters.state.name} onDelete={() => { onResetPage(); filters.setState({ name: '' }); }} />
      ) : null}
      <Button color="error" onClick={() => { onResetPage(); filters.onResetState(); }} startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}>
        Clear
      </Button>
      <Box component="span" sx={{ typography: 'body2' }}><strong>{totalResults}</strong> results</Box>
    </Stack>
  );
}
