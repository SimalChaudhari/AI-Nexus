import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

function SectionTitleContent({ title }) {
  const theme = useTheme();
  const { primary, secondary } = theme.palette;

  return (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: secondary.main, mb: 1.5 }}>
        {title}
      </Typography>
      <Divider
        sx={{
          mb: 2.5,
          border: 'none',
          height: 2,
          borderRadius: 1,
          background: `linear-gradient(90deg, ${primary.main} 0%, ${alpha(secondary.main, 0.45)} 100%)`,
        }}
      />
    </>
  );
}

/** Section heading + gradient divider (use inside Grid container). */
export function MembershipFormSectionTitle({ title, firstSection = false }) {
  return (
    <Grid item xs={12} sx={{ mt: firstSection ? 0 : 2.5 }}>
      <SectionTitleContent title={title} />
    </Grid>
  );
}

/** Section heading + divider (use inside Stack / Paper). */
export function MembershipFormSectionTitleBlock({ title, firstSection = false, sx }) {
  return (
    <Box sx={{ mt: firstSection ? 0 : 2.5, width: 1, ...sx }}>
      <SectionTitleContent title={title} />
    </Box>
  );
}
