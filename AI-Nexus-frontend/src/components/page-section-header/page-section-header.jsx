import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { FLUID_FONT_SIZES } from 'src/theme/fluid-typography';

// ----------------------------------------------------------------------

export const PAGE_SECTION_HEADER_SX = {
  textAlign: 'left',
  mb: { xs: 2, md: 3 },
};

export function PageSectionHeader({ title, description, sx }) {
  return (
    <Box sx={{ ...PAGE_SECTION_HEADER_SX, ...sx }}>
      <Typography
        component="h1"
        sx={{
          m: 0,
          fontWeight: 700,
          fontSize: FLUID_FONT_SIZES.h3,
          lineHeight: 1.25,
          color: 'text.primary',
          mb: description ? 1 : 0,
        }}
      >
        {title}
      </Typography>
      {description ? (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: FLUID_FONT_SIZES.body2,
            lineHeight: 1.55,
            display: 'block',
            maxWidth: 720,
          }}
        >
          {description}
        </Typography>
      ) : null}
    </Box>
  );
}
