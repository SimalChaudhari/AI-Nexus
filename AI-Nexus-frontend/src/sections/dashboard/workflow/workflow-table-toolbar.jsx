import { useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function WorkflowTableToolbar({ filters, labels = [], tags = [], onResetPage }) {
  const handleFilterName = useCallback(
    (event) => {
      onResetPage();
      filters.setState({ name: event.target.value });
    },
    [filters, onResetPage]
  );

  const handleFilterLabels = useCallback(
    (event) => {
      const newValue =
        typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;

      onResetPage();
      filters.setState({ labelIds: newValue });
    },
    [filters, onResetPage]
  );

  const handleFilterTags = useCallback(
    (event) => {
      const newValue =
        typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;

      onResetPage();
      filters.setState({ tagIds: newValue });
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
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
          <InputLabel htmlFor="workflow-filter-labels-select-label">Labels</InputLabel>
          <Select
            multiple
            value={filters.state.labelIds || []}
            onChange={handleFilterLabels}
            input={<OutlinedInput label="Labels" />}
            renderValue={(selected) =>
              selected
                .map((labelId) => {
                  const label = labels.find((l) => l.id === labelId);
                  return label?.title || label?.name || labelId;
                })
                .join(', ')
            }
            inputProps={{ id: 'workflow-filter-labels-select-label' }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
          >
            {labels.map((label) => (
              <MenuItem key={label.id} value={label.id}>
                <Checkbox
                  disableRipple
                  size="small"
                  checked={filters.state.labelIds?.includes(label.id) || false}
                />
                {label.title || label.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
          <InputLabel htmlFor="workflow-filter-tags-select-label">Tags</InputLabel>
          <Select
            multiple
            value={filters.state.tagIds || []}
            onChange={handleFilterTags}
            input={<OutlinedInput label="Tags" />}
            renderValue={(selected) =>
              selected
                .map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  return tag?.title || tagId;
                })
                .join(', ')
            }
            inputProps={{ id: 'workflow-filter-tags-select-label' }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
          >
            {tags.map((tag) => (
              <MenuItem key={tag.id} value={tag.id}>
                <Checkbox
                  disableRipple
                  size="small"
                  checked={filters.state.tagIds?.includes(tag.id) || false}
                />
                {tag.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
          <TextField
            fullWidth
            value={filters.state.name}
            onChange={handleFilterName}
            placeholder="Search AI resources..."
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

