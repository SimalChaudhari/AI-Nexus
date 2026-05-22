import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { CountrySelect } from 'src/components/country-select';
import { getCountry } from 'src/components/country-select/utils';
import { FlagIcon } from 'src/components/iconify';
import { INPUT_LABEL_ABOVE } from 'src/utils/membership-form-ui';

// ----------------------------------------------------------------------

/**
 * Country name picker (Autocomplete). Stores country label string — API unchanged.
 */
export function MembershipFormCountrySelect({
  label,
  value,
  onChange,
  required = false,
  placeholder = 'Choose a country',
  fullWidth = true,
  disabled = false,
  hideLabel = false,
  size = 'medium',
  sx,
}) {
  const handleChange = (_event, newValue) => {
    onChange?.({ target: { value: newValue || '' } });
  };

  const renderInput = (params) => {
    const country = getCountry(value || params.inputProps.value);

    return (
      <TextField
        {...params}
        size={size}
        label={hideLabel ? undefined : label}
        hiddenLabel={hideLabel}
        required={required}
        placeholder={placeholder}
        InputLabelProps={{
          ...INPUT_LABEL_ABOVE,
          ...params.InputLabelProps,
        }}
        InputProps={{
          ...params.InputProps,
          startAdornment: (
            <>
              {country.code ? (
                <InputAdornment position="start" sx={{ ml: 0.5, mr: -0.25 }}>
                  <FlagIcon
                    code={country.code}
                    sx={{ width: 22, height: 22, borderRadius: '50%' }}
                  />
                </InputAdornment>
              ) : null}
              {params.InputProps.startAdornment}
            </>
          ),
        }}
      />
    );
  };

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto', ...sx }}>
      <CountrySelect
        id={label?.replace(/\s+/g, '-').toLowerCase() || 'country'}
        value={value ?? ''}
        onChange={handleChange}
        getValue="label"
        label={hideLabel ? undefined : label}
        hiddenLabel={hideLabel}
        fullWidth={fullWidth}
        disabled={disabled}
        disableClearable={false}
        renderInput={renderInput}
      />
    </Box>
  );
}
