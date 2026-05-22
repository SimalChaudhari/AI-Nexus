import TextField from '@mui/material/TextField';

import { INPUT_LABEL_ABOVE, MEMBERSHIP_SELECT_MENU_PROPS } from 'src/utils/membership-form-ui';

// ----------------------------------------------------------------------

/**
 * Outlined TextField with labels above the input (same as Salesforce create form).
 */
export function MembershipFormTextField({
  InputLabelProps,
  SelectProps,
  MenuProps,
  select,
  size = 'medium',
  fullWidth = true,
  ...other
}) {
  const mergedSelectProps = select
    ? {
        ...SelectProps,
        MenuProps: {
          ...MEMBERSHIP_SELECT_MENU_PROPS,
          ...SelectProps?.MenuProps,
          ...MenuProps,
        },
      }
    : SelectProps;

  return (
    <TextField
      select={select}
      size={size}
      fullWidth={fullWidth}
      SelectProps={mergedSelectProps}
      InputLabelProps={{
        ...INPUT_LABEL_ABOVE,
        ...InputLabelProps,
        sx: {
          ...INPUT_LABEL_ABOVE.sx,
          ...InputLabelProps?.sx,
        },
      }}
      {...other}
    />
  );
}
