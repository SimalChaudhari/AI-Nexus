import { alpha } from '@mui/material/styles';

export const CREDENTIAL_CARD_MIN_HEIGHT = 320;

export function getCredentialCardSx(theme) {
  return {
    p: { xs: 2, md: 2.25 },
    minHeight: { xs: CREDENTIAL_CARD_MIN_HEIGHT, md: CREDENTIAL_CARD_MIN_HEIGHT },
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
    bgcolor: 'background.paper',
    boxShadow: `0 6px 18px ${alpha(theme.palette.grey[500], 0.12)}`,
    position: 'relative',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    },
    '&:hover': {
      boxShadow: `0 10px 24px ${alpha(theme.palette.grey[500], 0.18)}`,
      transform: 'translateY(-2px)',
    },
  };
}

export const CREDENTIAL_GRID_PROPS = { xs: 12, sm: 6, md: 6, lg: 4 };
export const CREDENTIAL_GRID_SPACING = { xs: 2, sm: 2.5 };
