import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';

import { Iconify } from 'src/components/iconify';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { useCurriculumCourseSearch } from './use-curriculum-course-search';

// ----------------------------------------------------------------------

export function CurriculumAddCoursesDrawer({
  open,
  onClose,
  excludeIds = [],
  maxCourses = 20,
  currentCount = 0,
  submitting = false,
  onConfirm,
}) {
  const [draftCourses, setDraftCourses] = useState([]);
  const slotsLeft = Math.max(0, maxCourses - currentCount);

  const {
    options,
    inputValue,
    loading,
    loadingMore,
    hasNextPage,
    open: listOpen,
    setOpen: setListOpen,
    handleInputChange,
    handleListboxScroll,
    clearInput,
    resetAndFetch,
  } = useCurriculumCourseSearch({
    excludeIds,
    enabled: open && slotsLeft > 0,
  });

  const closeDrawer = useCallback(() => {
    setDraftCourses([]);
    clearInput();
    onClose?.();
  }, [clearInput, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closeDrawer]);

  useEffect(() => {
    if (!open) return;
    setDraftCourses([]);
    clearInput();
    setListOpen(true);
  }, [open, clearInput, setListOpen]);

  const handleConfirm = () => {
    if (!draftCourses.length) return;
    const allowed = draftCourses.slice(0, slotsLeft);
    onConfirm?.(allowed);
    closeDrawer();
  };

  const mergedOptions = [...draftCourses, ...options].filter(
    (course, index, arr) => course?.id && arr.findIndex((c) => c.id === course.id) === index
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={closeDrawer}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 0 } }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" sx={HERO_TYPOGRAPHY.adminCardTitle}>
            Add courses
          </Typography>
          <IconButton onClick={closeDrawer} aria-label="Close add courses">
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>

        <Stack spacing={2.5} sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Search and select one or more courses, then click Add courses. You can add up to{' '}
            {slotsLeft} more ({currentCount} / {maxCourses} already on the curriculum).
          </Typography>

          {slotsLeft === 0 ? (
            <Typography variant="body2" sx={{ color: 'warning.main' }}>
              Maximum number of courses reached. Remove a course from the list to add another.
            </Typography>
          ) : (
            <Autocomplete
              multiple
              fullWidth
              disableCloseOnSelect
              open={listOpen}
              onOpen={() => setListOpen(true)}
              onClose={() => setListOpen(false)}
              disabled={submitting}
              options={mergedOptions}
              value={draftCourses}
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onChange={(_, newValue) => {
                const next = (newValue || []).slice(0, slotsLeft);
                setDraftCourses(next);
              }}
              loading={loading}
              filterOptions={(items) => items}
              getOptionLabel={(option) => option?.title || ''}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              noOptionsText={
                loading
                  ? 'Searching courses...'
                  : inputValue.trim()
                    ? 'No courses found'
                    : 'Type to search courses'
              }
              ListboxProps={{
                onScroll: handleListboxScroll,
                sx: { maxHeight: 320 },
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {option.title}
                    </Typography>
                    {option.modulesCount > 0 ? (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {option.modulesCount} module{option.modulesCount === 1 ? '' : 's'}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.title}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search courses"
                  placeholder="Search by course name..."
                  helperText={[
                    draftCourses.length
                      ? `${draftCourses.length} selected`
                      : 'Select multiple courses from the list',
                    loadingMore ? 'Loading more…' : null,
                    !loading && hasNextPage && mergedOptions.length > 0 ? 'Scroll for more' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              slotProps={{
                popper: { sx: { zIndex: (theme) => theme.zIndex.modal + 2 } },
              }}
            />
          )}
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          justifyContent="flex-end"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Button color="inherit" variant="outlined" onClick={closeDrawer} disabled={submitting}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleConfirm}
            disabled={!draftCourses.length || submitting || slotsLeft === 0}
            loading={submitting}
          >
            Add courses{draftCourses.length ? ` (${draftCourses.length})` : ''}
          </LoadingButton>
        </Stack>
      </Stack>
    </Drawer>
  );
}
