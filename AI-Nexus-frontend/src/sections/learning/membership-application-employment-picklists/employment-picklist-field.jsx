import MenuItem from '@mui/material/MenuItem';

import { MembershipFormTextField } from 'src/components/membership-form-textfield';

import { buildEmploymentPicklistMenuOptions, getEmploymentPicklistSelectProps } from './utils';

// ----------------------------------------------------------------------

export function MembershipApplicationEmploymentPicklistField({
  label,
  value,
  onChange,
  options = [],
  loading = false,
  onOpen,
  required = false,
  size = 'small',
  fieldProps = {},
}) {
  const savedValue = String(value || '').trim();
  const menuOptions = buildEmploymentPicklistMenuOptions(savedValue, options);

  return (
    <MembershipFormTextField
      select
      label={label}
      size={size}
      fullWidth
      required={required}
      value={savedValue}
      onChange={onChange}
      SelectProps={getEmploymentPicklistSelectProps(onOpen)}
      {...fieldProps}
    >
      {!savedValue && (
        <MenuItem value="" disabled>
          {loading ? 'Loading options...' : ''}
        </MenuItem>
      )}
      {menuOptions.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </MembershipFormTextField>
  );
}
