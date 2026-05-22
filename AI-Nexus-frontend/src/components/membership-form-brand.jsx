import Box from '@mui/material/Box';

import { Logo } from 'src/components/logo';

// ----------------------------------------------------------------------

const LOGO_HEIGHT = { xs: 48, sm: 56, md: 64 };

/** ISCA / site logo for membership full-page forms — natural width, fixed height. */
export function MembershipFormBrand({ sx }) {
  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        width: 'auto',
        ...sx,
      }}
    >
      <Logo
        disableLink
        sx={{
          width: 'auto',
          height: LOGO_HEIGHT,
          maxHeight: LOGO_HEIGHT,
          minHeight: 'unset',
          pointerEvents: 'none',
          '& img': {
            width: 'auto',
            height: '100%',
            maxHeight: LOGO_HEIGHT,
            display: 'block',
          },
        }}
      />
    </Box>
  );
}
