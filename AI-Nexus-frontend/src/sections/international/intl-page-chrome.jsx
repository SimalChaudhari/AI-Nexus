import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { FLUID_FONT_SIZES } from 'src/theme/home-typography';
import {
  HOME_SECTION_BG,
  HOME_SECTION_UNDERLINE_SX,
} from 'src/sections/home/home-section-styles';

// ----------------------------------------------------------------------

export const NAVY = '#1C4270';

export const INTL_PAGE_SHELL_SX = {
  minHeight: {
    xs: 'calc(100dvh - var(--layout-header-mobile-height))',
    md: 'calc(100dvh - var(--layout-header-desktop-height))',
  },
  bgcolor: '#fff',
  backgroundImage: HOME_SECTION_BG,
  py: { xs: 4, md: 6 },
};

export const INTL_CONTAINER_SX = {
  maxWidth: 1400,
  px: { xs: 2, sm: 3, md: 4 },
};

export function IntlPageHeader({
  eyebrow = 'AI Nexus · International',
  title,
  subtitle,
  action,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
        mb: { xs: 3, md: 4 },
      }}
    >
      <Box sx={{ textAlign: 'left', maxWidth: 720 }}>
        <Typography
          sx={{
            mb: 1,
            color: '#000',
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Typography>

        <Typography
          component="h1"
          sx={{
            m: 0,
            fontWeight: 800,
            fontSize: FLUID_FONT_SIZES.h3,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: NAVY,
          }}
        >
          {title}
        </Typography>

        <Box sx={{ ...HOME_SECTION_UNDERLINE_SX, mx: 0, mt: 1.5, mb: 1.5 }} />

        {subtitle ? (
          <Typography
            sx={{
              m: 0,
              color: NAVY,
              opacity: 0.78,
              fontSize: FLUID_FONT_SIZES.body1,
              lineHeight: 1.55,
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      {action || null}
    </Box>
  );
}

export function IntlChangeRegionButton({ onClick }) {
  return (
    <Button
      variant="outlined"
      onClick={onClick}
      startIcon={<Iconify icon="solar:global-bold-duotone" width={18} />}
      sx={{
        alignSelf: { xs: 'flex-start', sm: 'flex-start' },
        flexShrink: 0,
        textTransform: 'none',
        fontWeight: 700,
        borderRadius: '10px',
        borderColor: alpha(NAVY, 0.28),
        color: NAVY,
        px: 2,
        py: 1,
        '&:hover': {
          borderColor: NAVY,
          bgcolor: alpha(NAVY, 0.04),
        },
      }}
    >
      Change region
    </Button>
  );
}

export function IntlPageFrame({ children }) {
  return (
    <Box sx={INTL_PAGE_SHELL_SX}>
      <Container maxWidth={false} sx={INTL_CONTAINER_SX}>
        {children}
      </Container>
    </Box>
  );
}
