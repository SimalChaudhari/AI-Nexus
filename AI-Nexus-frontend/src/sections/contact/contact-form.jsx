import { useCallback, useState } from 'react';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

import { ContactCardHeader } from './contact-card-header';
import { contactCardBodySx, contactCardShellSx } from './contact-card-styles';
import { buildWhatsAppMessageUrl, resolveWhatsAppUrl } from './utils/contact-hero-public-fields';

// ----------------------------------------------------------------------

export function ContactForm({ whatsappLink = '' }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    projectDetails: '',
  });

  const updateField = useCallback((field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }, []);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();

      const message = [
        'New contact form enquiry',
        '',
        `Name: ${form.fullName.trim()}`,
        `Email: ${form.email.trim()}`,
        `Phone: ${form.phone.trim()}`,
        '',
        'Message:',
        form.projectDetails.trim(),
      ].join('\n');

      const targetUrl = buildWhatsAppMessageUrl(whatsappLink, message);
      if (!targetUrl) return;

      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    },
    [form, whatsappLink]
  );

  const canSubmit =
    Boolean(form.fullName.trim()) &&
    Boolean(form.email.trim()) &&
    Boolean(form.phone.trim()) &&
    Boolean(form.projectDetails.trim()) &&
    Boolean(resolveWhatsAppUrl(whatsappLink));

  return (
    <Stack spacing={0} sx={contactCardShellSx} component="form" onSubmit={handleSubmit}>
      <ContactCardHeader
        title="Contact Us"
        titleHighlight="Us"
        subtitle="We're here to help! Fill in the form below and we'll get back to you within 24 hours."
      />

      <Box sx={{ ...contactCardBodySx, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2.5} sx={{ flex: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Full Name"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={updateField('fullName')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="email"
                label="Email Address"
                placeholder="Enter your email address"
                value={form.email}
                onChange={updateField('email')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Phone Number"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={updateField('phone')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Your Message"
                placeholder="Type your message here..."
                helperText="Please let us know how we can assist you."
                multiline
                rows={4}
                value={form.projectDetails}
                onChange={updateField('projectDetails')}
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            size="large"
            variant="contained"
            disabled={!canSubmit}
            sx={{ py: 1.25, alignSelf: 'flex-start' }}
          >
            Send Message
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
