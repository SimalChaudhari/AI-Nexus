import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function ContactForm() {
  return (
    <Stack
      spacing={2.5}
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: 2,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        boxShadow: (theme) => theme.customShadows.z8,
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ mb: 0.75, fontWeight: 700 }}>
          Start Your Project <Box component="span" sx={{ color: 'primary.main' }}>Today</Box>
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Share your project details with us, and we&apos;ll get back to you within 24 hours.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Full Name *" placeholder="John Doe" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Email Address *" placeholder="john@example.com" />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Phone Number *" placeholder="+91 XXXXX XXXXX" />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Project Details *" placeholder="Tell us about your project..." multiline rows={4} />
        </Grid>
      </Grid>

      <Button size="large" variant="contained" sx={{ py: 1.25 }}>
        Send Message
      </Button>
    </Stack>
  );
}
