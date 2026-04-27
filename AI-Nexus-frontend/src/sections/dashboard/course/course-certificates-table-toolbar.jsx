import { useCallback, useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete from '@mui/material/Autocomplete';

import { Iconify } from 'src/components/iconify';

export function CourseCertificatesTableToolbar({
  filters,
  onResetPage,
  userOptions = [],
  courseOptions = [],
}) {
  const [userInput, setUserInput] = useState(filters.state.userName || '');
  const [courseInput, setCourseInput] = useState(filters.state.courseTitle || '');

  useEffect(() => {
    setUserInput(filters.state.userName || '');
  }, [filters.state.userName]);

  useEffect(() => {
    setCourseInput(filters.state.courseTitle || '');
  }, [filters.state.courseTitle]);

  const handleFilterKeyword = useCallback(
    (event) => {
      onResetPage();
      filters.setState({ search: event.target.value });
    },
    [filters, onResetPage]
  );

  const applyUserNameFilter = useCallback(
    (value) => {
      onResetPage();
      filters.setState({ userName: value || '' });
    },
    [filters, onResetPage]
  );

  const applyCourseTitleFilter = useCallback(
    (value) => {
      onResetPage();
      filters.setState({ courseTitle: value || '' });
    },
    [filters, onResetPage]
  );

  return (
    <Stack
      spacing={2}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      direction={{ xs: 'column', md: 'row' }}
      sx={{ p: 2.5, pr: { xs: 2.5, md: 1 } }}
    >
      <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={filters.state.search}
          onChange={handleFilterKeyword}
          placeholder="Search by certificate no, user, email, or course..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ width: { xs: 1, md: 520 } }}>
        <Autocomplete
          fullWidth
          options={userOptions}
          value={filters.state.userName || ''}
          inputValue={userInput}
          onInputChange={(_, value) => setUserInput(value || '')}
          onChange={(_, value) => {
            const next = value || '';
            setUserInput(next);
            applyUserNameFilter(next);
          }}
          renderInput={(params) => <TextField {...params} placeholder="User name" />}
        />
        <Autocomplete
          fullWidth
          options={courseOptions}
          value={filters.state.courseTitle || ''}
          inputValue={courseInput}
          onInputChange={(_, value) => setCourseInput(value || '')}
          onChange={(_, value) => {
            const next = value || '';
            setCourseInput(next);
            applyCourseTitleFilter(next);
          }}
          renderInput={(params) => <TextField {...params} placeholder="Course title" />}
        />
      </Stack>
    </Stack>
  );
}
