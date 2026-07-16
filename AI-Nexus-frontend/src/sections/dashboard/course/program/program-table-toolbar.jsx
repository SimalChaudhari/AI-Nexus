import { useCallback } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { Iconify } from 'src/components/iconify';

export function ProgramTableToolbar({ filters, onResetPage }) {
  const handleFilter = useCallback((e) => {
    onResetPage();
    filters.setState({ name: e.target.value });
  }, [filters, onResetPage]);

  return (
    <Stack sx={{ p: 2.5 }}>
      <TextField
        fullWidth
        value={filters.state.name}
        onChange={handleFilter}
        placeholder="Search program..."
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />
    </Stack>
  );
}
