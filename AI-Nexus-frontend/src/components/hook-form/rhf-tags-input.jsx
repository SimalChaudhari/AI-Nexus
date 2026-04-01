import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from 'src/components/loading/circular-progress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function RHFTagsInput({
  name,
  label,
  helperText,
  placeholder,
  options = [],
  loading = false,
  disableCloseOnSelect = false,
  showSearchIcon = false,
  searchBarInDropdown = false,
  searchPlaceholder = 'Search...',
  noOptionsText = 'Data not found',
  required,
  ...other
}) {
  const { control, setValue } = useFormContext();
  const [inputValue, setInputValue] = useState('');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Autocomplete
          {...field}
          multiple
          freeSolo={!searchBarInDropdown}
          disableCloseOnSelect={disableCloseOnSelect}
          options={options}
          noOptionsText={noOptionsText}
          value={field.value || []}
          inputValue={inputValue}
          onInputChange={(event, newInputValue, reason) => {
            setInputValue(newInputValue);
          }}
          filterOptions={(opts, params) => {
            const { inputValue: filterValue } = params;
            const filtered = opts.filter((option) => {
              const optionLabel = typeof option === 'string' ? option : option.label || option.title || '';
              return optionLabel.toLowerCase().includes(filterValue.toLowerCase());
            });

            // When search bar is in dropdown: only show matching options; never show typed text as a row
            if (searchBarInDropdown) {
              return filtered;
            }
            // When freeSolo (e.g. AI resource tags): allow typed value as new option
            if (filterValue && !filtered.some((opt) => {
              const optLabel = typeof opt === 'string' ? opt : opt.label || opt.title || '';
              return optLabel.toLowerCase() === filterValue.toLowerCase();
            })) {
              return [filterValue, ...filtered];
            }

            return filtered;
          }}
          onChange={(event, newValue) => {
            // Don't create tags immediately - just store them (strings or objects)
            // Tags will be created when the AI resource is saved
            setValue(name, newValue, { shouldValidate: false });

            // Also update tagIds if name is 'tags' (for backward compatibility)
            if (name === 'tags') {
              const tagIds = newValue.map((tag) => (typeof tag === 'string' ? null : tag.id)).filter(Boolean);
              setValue('tagIds', tagIds, { shouldValidate: false });
            }
          }}
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option;
            return option.label || option.title || '';
          }}
          isOptionEqualToValue={(option, value) => {
            if (typeof option === 'string' || typeof value === 'string') {
              return option === value;
            }
            return option.id === value.id;
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const tagProps = getTagProps({ index });
              const tagLabel = typeof option === 'string' ? option : option.label || option.title || '';
              return (
                <Chip
                  {...tagProps}
                  key={typeof option === 'string' ? option : option.id || index}
                  label={tagLabel}
                  variant="outlined"
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder}
              required={required}
              error={!!error}
              helperText={error ? error?.message : helperText}
              InputProps={{
                ...params.InputProps,
                startAdornment: showSearchIcon ? (
                  <>
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                    {params.InputProps.startAdornment}
                  </>
                ) : (
                  params.InputProps.startAdornment
                ),
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => {
            const optionLabel = typeof option === 'string' ? option : option.label || option.title || '';
            const value = field.value || [];
            const selected = value.some((v) =>
              typeof option === 'string' || typeof v === 'string' ? option === v : option.id === v.id
            );
            return (
              <Box component="li" {...props} key={typeof option === 'string' ? option : option.id}>
                <Checkbox
                  size="small"
                  disableRipple
                  checked={selected}
                  sx={{ mr: 1, py: 0.25 }}
                />
                {optionLabel}
              </Box>
            );
          }}
          {...other}
        />
      )}
    />
  );
}

