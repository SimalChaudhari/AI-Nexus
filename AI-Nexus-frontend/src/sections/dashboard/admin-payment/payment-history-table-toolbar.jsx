import { useCallback } from 'react';

import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

export function PaymentHistoryTableToolbar({ filters, onResetPage }) {
  const handleFilterName = useCallback(
    (event) => {
      onResetPage();
      filters.setState({ name: event.target.value });
    },
    [filters, onResetPage]
  );

  const handleFilterStatus = useCallback(
    (event) => {
      onResetPage();
      filters.setState({ status: event.target.value });
    },
    [filters, onResetPage]
  );

  return (
    <Stack
      spacing={2}
      alignItems="stretch"
      direction={{ xs: 'column', md: 'row' }}
      sx={{ p: 2.5 }}
    >
      <TextField
        select
        fullWidth
        label="Status"
        value={filters.state.status}
        onChange={handleFilterStatus}
        sx={{
          width: 1,
          maxWidth: { md: 180 },
          flexShrink: 0,
        }}
      >
        <MenuItem value="all">All</MenuItem>
        <MenuItem value="paid">Paid</MenuItem>
        <MenuItem value="pending">Pending</MenuItem>
        <MenuItem value="failed">Failed</MenuItem>
        <MenuItem value="canceled">Canceled</MenuItem>
      </TextField>

      <TextField
        fullWidth
        value={filters.state.name}
        onChange={handleFilterName}
        placeholder="Search email, name, ref, voucher..."
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
