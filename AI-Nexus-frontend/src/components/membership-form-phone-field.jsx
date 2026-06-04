import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';

import { FlagIcon } from 'src/components/iconify';
import { MembershipFormTextField } from 'src/components/membership-form-textfield';
import { MEMBERSHIP_SELECT_MENU_PROPS } from 'src/utils/membership-form-ui';
import {
  findDialOptionByCode,
  getNationalPhoneLimits,
  MEMBERSHIP_DIAL_CODE_OPTIONS,
  normalizeDialCode,
  sanitizeNationalPhoneNumber,
} from 'src/utils/membership-dial-codes';

// ----------------------------------------------------------------------

const DIAL_AUTOCOMPLETE_SX = {
  width: { xs: 100, sm: 112 },
  flexShrink: 0,
  '& .MuiOutlinedInput-root': {
    paddingRight: '6px !important',
    paddingLeft: '4px !important',
    '& fieldset': { border: 'none' },
    '&:hover fieldset': { border: 'none' },
    '&.Mui-focused fieldset': { border: 'none' },
  },
};

/**
 * Merged dial code + number UI. Still separate values — API payload unchanged.
 */
export function MembershipFormPhoneField({
  label,
  countryCode,
  number,
  onCountryCodeChange,
  onNumberChange,
  required = false,
  numberType = 'text',
  size = 'medium',
  fullWidth = true,
  lockDialCode = false,
  error = false,
  helperText,
  sx,
}) {
  const dialValue =
    findDialOptionByCode(countryCode) || findDialOptionByCode('65');
  const limits = getNationalPhoneLimits(countryCode);
  const displayHelper = error && helperText ? helperText : helperText ?? limits.hint;

  const emitNumberChange = (rawValue) => {
    const sanitized = sanitizeNationalPhoneNumber(rawValue, countryCode);
    onNumberChange?.({ target: { value: sanitized } });
  };

  const handleDialChange = (_e, opt) => {
    const newDial = opt ? normalizeDialCode(opt.dial) : '';
    onCountryCodeChange?.({ target: { value: newDial } });
    if (number) {
      const sanitized = sanitizeNationalPhoneNumber(number, newDial);
      if (sanitized !== number) {
        onNumberChange?.({ target: { value: sanitized } });
      }
    }
  };

  const dialPicker = (
    <Autocomplete
      size={size}
      options={MEMBERSHIP_DIAL_CODE_OPTIONS}
      value={dialValue}
      disabled={lockDialCode}
      disableClearable
      getOptionLabel={(opt) => (opt ? opt.display : '')}
      isOptionEqualToValue={(a, b) => a?.dial === b?.dial}
      onChange={handleDialChange}
      renderOption={(props, option) => (
        <li {...props} key={`${option.code}-${option.dial}`}>
          <FlagIcon
            code={option.code}
            sx={{ mr: 1, width: 22, height: 22, borderRadius: '50%' }}
          />
          {option.label} ({option.display})
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          hiddenLabel
          size={size}
          placeholder="+65"
          InputProps={{
            ...params.InputProps,
            startAdornment: dialValue?.code ? (
              <InputAdornment position="start" sx={{ ml: 0, mr: -0.5 }}>
                <FlagIcon
                  code={dialValue.code}
                  sx={{ width: 20, height: 20, borderRadius: '50%' }}
                />
              </InputAdornment>
            ) : (
              params.InputProps?.startAdornment
            ),
          }}
        />
      )}
      sx={DIAL_AUTOCOMPLETE_SX}
      ListboxProps={MEMBERSHIP_SELECT_MENU_PROPS.MenuListProps}
      componentsProps={{
        popper: { disableScrollLock: MEMBERSHIP_SELECT_MENU_PROPS.disableScrollLock },
        paper: MEMBERSHIP_SELECT_MENU_PROPS.PaperProps,
      }}
    />
  );

  return (
    <MembershipFormTextField
      label={label}
      required={required}
      error={error}
      helperText={displayHelper}
      type={numberType === 'number' ? 'tel' : numberType}
      value={number ?? ''}
      onChange={(e) => emitNumberChange(e.target.value)}
      size={size}
      fullWidth={fullWidth}
      placeholder={`${limits.max} digits`}
      inputProps={{
        inputMode: 'numeric',
        pattern: '[0-9]*',
        maxLength: limits.max,
      }}
      sx={sx}
      InputProps={{
        startAdornment: (
          <InputAdornment
            position="start"
            sx={{
              m: 0,
              mr: 0,
              ml: -0.5,
              height: 'auto',
              maxHeight: 'none',
              alignSelf: 'stretch',
              display: 'flex',
              alignItems: 'center',
              gap: 0,
            }}
          >
            {dialPicker}
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, my: 0.75, borderColor: 'divider' }}
            />
          </InputAdornment>
        ),
      }}
    />
  );
}
