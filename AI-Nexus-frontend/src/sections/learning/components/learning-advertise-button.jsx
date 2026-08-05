import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const NAVIGATE_PATH = 'https://iscacademy.sg/practical-ai-series/';
const BUTTON_LABEL = 'ISCAcademy Practical AI series';

/**
 * Fixed vertical promo tab on the right edge (vertically centered).
 */
export function LearningAdvertiseButton() {
  const theme = useTheme();

  return (
    <Box
      component="button"
      type="button"
      aria-label={BUTTON_LABEL}
      onClick={() => window.open(NAVIGATE_PATH, '_blank', 'noopener,noreferrer')}
      sx={{
        position: 'fixed',
        right: 0,
        top: '50%',
        zIndex: theme.zIndex.speedDial,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        m: 0,
        px: 1,
        py: 1.75,
        border: 'none',
        cursor: 'pointer',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        boxShadow: theme.customShadows?.z8 || theme.shadows[8],
        transition: theme.transitions.create(['background-color', 'padding-right'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          bgcolor: 'primary.dark',
          pr: 1.5,
        },
      }}
    >
      <Iconify icon="solar:megaphone-bold-duotone" width={20} />
      <Box
        component="span"
        sx={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          typography: 'subtitle2',
          fontWeight: 700,
          letterSpacing: 1,
          lineHeight: 1.15,
          userSelect: 'none',
          maxHeight: '46vh',
        }}
      >
        {BUTTON_LABEL}
      </Box>
    </Box>
  );
}
