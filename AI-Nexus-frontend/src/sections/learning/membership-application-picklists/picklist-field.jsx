import MenuItem from '@mui/material/MenuItem';

import { MembershipFormTextField } from 'src/components/membership-form-textfield';

import { buildMembershipPicklistMenuOptions, getMembershipPicklistSelectProps } from './utils';

// ----------------------------------------------------------------------

export function MembershipApplicationPicklistField({
  label,
  value,
  onChange,
  options = [],
  loading = false,
  onOpen,
  required = false,
  disabled = false,
  size = 'small',
  fieldProps = {},
}) {
  const savedValue = String(value || '').trim();
  const menuOptions = buildMembershipPicklistMenuOptions(savedValue, options);

  return (
    <MembershipFormTextField
      select
      label={label}
      size={size}
      fullWidth
      required={required}
      disabled={disabled}
      value={savedValue}
      onChange={onChange}
      SelectProps={getMembershipPicklistSelectProps(onOpen, menuOptions)}
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

/** @deprecated Use MembershipApplicationPicklistField */
export const MembershipApplicationEmploymentPicklistField = MembershipApplicationPicklistField;
