import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

import { ContactCardHeader } from './contact-card-header';
import { contactCardBodySx, contactCardShellSx } from './contact-card-styles';

// ----------------------------------------------------------------------

export function ContactForm() {
  return (
    <Stack spacing={0} sx={contactCardShellSx}>
      <ContactCardHeader
        title="Start Your Project Today"
        titleHighlight="Today"
        subtitle="Share your project details with us, and we'll get back to you within 24 hours."
      />

      <Box sx={{ ...contactCardBodySx, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2.5} sx={{ flex: 1 }}>
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
              <TextField
                fullWidth
                label="Project Details *"
                placeholder="Tell us about your project..."
                multiline
                rows={4}
              />
            </Grid>
          </Grid>

          <Button size="large" variant="contained" sx={{ py: 1.25, alignSelf: 'flex-start' }}>
            Send Message
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
