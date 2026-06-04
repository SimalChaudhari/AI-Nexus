import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

/**
 * Shared profile panel shell (Contact, Persona, ISCA) — equal height in grid rows.
 */
export function ProfileSectionCard({ title, subtitle, accent = 'secondary', headerAction, children, sx }) {
  const theme = useTheme();
  const paletteKey = accent === 'info' ? 'info' : accent === 'primary' ? 'primary' : 'secondary';
  const palette = theme.palette[paletteKey];

  return (
    <Box
      sx={{
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        p: 2.5,
        bgcolor: alpha(palette.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
        border: `1px solid ${alpha(palette.main, 0.22)}`,
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          mb: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 800, letterSpacing: 1, color: `${paletteKey}.dark`, display: 'block' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {headerAction}
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{children}</Box>
    </Box>
  );
}
