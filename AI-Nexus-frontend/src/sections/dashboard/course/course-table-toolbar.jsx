import { useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function CourseTableToolbar({ filters, onResetPage, options = {} }) {
  const { levels = [], types = [] } = options;

  const handleFilterName = useCallback(
    (event) => {
      onResetPage();
      filters.setState({ name: event.target.value });
    },
    [filters, onResetPage]
  );

  const handleFilterLevel = useCallback(
    (event) => {
      onResetPage();
      filters.setState({ level: event.target.value || '' });
    },
    [filters, onResetPage]
  );

  const handleFilterType = useCallback(
    (event) => {
      onResetPage();
      filters.setState({ type: event.target.value || '' });
    },
    [filters, onResetPage]
  );

  return (
    <>
      <Stack
        spacing={2}
        alignItems={{ xs: 'flex-end', md: 'center' }}
        direction={{ xs: 'column', md: 'row' }}
        sx={{ p: 2.5, pr: { xs: 2.5, md: 1 } }}
      >
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 160 } }}>
          <InputLabel id="course-filter-level-label">Level</InputLabel>
          <Select
            labelId="course-filter-level-label"
            value={filters.state.level || ''}
            onChange={handleFilterLevel}
            input={<OutlinedInput label="Level" />}
          >
            <MenuItem value="">All</MenuItem>
            {levels.map((level) => (
              <MenuItem key={level} value={level}>
                {level}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 140 } }}>
          <InputLabel id="course-filter-type-label">Type</InputLabel>
          <Select
            labelId="course-filter-type-label"
            value={filters.state.type || ''}
            onChange={handleFilterType}
            input={<OutlinedInput label="Type" />}
          >
            {types.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
          <TextField
            fullWidth
            value={filters.state.name}
            onChange={handleFilterName}
            placeholder="Search course..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Stack>
    </>
  );
}

