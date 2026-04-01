import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function ProductTableFiltersResult({
  filters,
  onFilters,
  //
  onResetFilters,
  //
  results,
}) {
  const handleRemoveKeyword = () => {
    onFilters('name', '');
  };

  return (
    <Stack spacing={1.5}>
      <Stack flexWrap="wrap" spacing={1} direction="row">
        {!!filters.name && (
          <Chip
            label={filters.name}
            size="small"
            onDelete={handleRemoveKeyword}
            deleteIcon={<Iconify icon="eva:close-fill" />}
          />
        )}
      </Stack>

      <Stack spacing={1} direction="row" alignItems="center" justifyContent="flex-end" flexGrow={1}>
        <Button
          color="error"
          onClick={onResetFilters}
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
        >
          Clear
        </Button>
      </Stack>
    </Stack>
  );
}
