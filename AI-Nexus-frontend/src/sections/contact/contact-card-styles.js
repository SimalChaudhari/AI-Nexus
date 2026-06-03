import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

export const contactCardShellSx = {
  width: 1,
  flex: 1,
  minWidth: 0,
  borderRadius: '20px',
  overflow: 'hidden',
  border: (t) =>
    `1px solid ${t.palette.mode === 'dark' ? alpha(t.palette.common.white, 0.08) : alpha('#000', 0.06)}`,
  bgcolor: 'background.paper',
  boxShadow: (t) =>
    t.palette.mode === 'dark'
      ? `0 0 0 1px ${alpha(t.palette.common.black, 0.35)}`
      : '0 12px 40px rgba(15, 23, 42, 0.08)',
};

export const contactCardHeaderSx = {
  px: { xs: 2, sm: 2.5 },
  pt: { xs: 2, sm: 2.5 },
  pb: { xs: 1.5, sm: 1.75 },
  background: (t) =>
    t.palette.mode === 'dark'
      ? alpha(t.palette.primary.dark, 0.15)
      : `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.06)} 0%, transparent 100%)`,
};

export const contactCardBodySx = {
  px: { xs: 2, sm: 2.5 },
  py: { xs: 1.5, sm: 2 },
};

export const contactCardTitleSx = {
  mb: 0.5,
  fontWeight: 700,
  color: 'text.primary',
};

export const contactCardSubtitleSx = {
  color: 'text.secondary',
  lineHeight: 1.5,
};
