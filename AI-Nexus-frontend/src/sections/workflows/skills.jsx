import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function Skills() {
  const theme = useTheme();

  return (
    <Box>
      <Box sx={{ mb: { xs: 2.5, md: 3 }, maxWidth: 720 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: 'text.primary',
            letterSpacing: '-0.02em',
            fontSize: { xs: 'clamp(1.125rem, 5vw + 0.25rem, 1.5rem)', sm: '1.5rem' },
            lineHeight: 1.25,
          }}
        >
          Skills
        </Typography>
        <Box
          sx={{
            mt: 1,
            mb: 0.25,
            width: 48,
            height: 3,
            borderRadius: 1,
            background: (t) =>
              `linear-gradient(90deg, ${t.palette.primary.main}, ${alpha(t.palette.secondary.main, 0.85)})`,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: 'text.secondary',
            mt: 0.75,
            fontSize: { xs: 'clamp(0.6875rem, 2.4vw + 0.42rem, 0.8125rem)', sm: '0.75rem' },
            lineHeight: 1.55,
          }}
        >
          Discover reusable AI skills you can apply across workflows and playbooks.
        </Typography>
      </Box>

      <Box
        sx={{
          py: { xs: 8, md: 12 },
          px: 2,
          textAlign: 'center',
          borderRadius: 2,
          border: `1px dashed ${alpha(theme.palette.grey[500], 0.3)}`,
          bgcolor: alpha(theme.palette.grey[500], 0.04),
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Skills
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Coming soon...
        </Typography>
      </Box>
    </Box>
  );
}
