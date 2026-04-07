import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function SpeakerTableFiltersResult({ filters, totalResults, onResetPage, sx, ...other }) {
  const canReset = !!filters.state.name;

  return (
    <Stack
      flexGrow={1}
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ p: 2.5, pt: 0, ...sx }}
      {...other}
    >
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {canReset && (
          <Chip
            size="small"
            label={filters.state.name}
            onDelete={() => filters.setState({ name: '' })}
          />
        )}
      </Stack>

      {canReset && (
        <Button
          color="error"
          size="small"
          onClick={onResetPage}
          startIcon={<Iconify icon="solar:restart-bold" />}
        >
          Reset
        </Button>
      )}
    </Stack>
  );
}
