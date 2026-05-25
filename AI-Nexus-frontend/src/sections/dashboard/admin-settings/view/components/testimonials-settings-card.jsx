import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { TESTIMONIALS_MAX, INDUSTRY_QUOTES_MAX } from 'src/sections/home/testimonials-defaults';

const emptyTestimonial = () => ({ quote: '', name: '', role: '', avatarUrl: '' });
const emptyIndustryQuote = () => ({ quote: '', organisation: '', logoUrl: '' });

export function TestimonialsSettingsCard({
  content,
  setContent,
  submitting,
  onSave,
}) {
  const testimonials = Array.isArray(content?.testimonials) ? content.testimonials : [];
  const industryQuotes = Array.isArray(content?.industryQuotes) ? content.industryQuotes : [];

  const updateTestimonial = (index, field, value) => {
    setContent((prev) => {
      const rows = [...(prev.testimonials || [])];
      while (rows.length <= index) rows.push(emptyTestimonial());
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, testimonials: rows };
    });
  };

  const updateIndustryQuote = (index, field, value) => {
    setContent((prev) => {
      const rows = [...(prev.industryQuotes || [])];
      while (rows.length <= index) rows.push(emptyIndustryQuote());
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, industryQuotes: rows };
    });
  };

  const addTestimonial = () => {
    if (testimonials.length >= TESTIMONIALS_MAX) return;
    setContent((prev) => ({
      ...prev,
      testimonials: [...(prev.testimonials || []), emptyTestimonial()],
    }));
  };

  const removeTestimonial = (index) => {
    setContent((prev) => ({
      ...prev,
      testimonials: (prev.testimonials || []).filter((_, i) => i !== index),
    }));
  };

  const addIndustryQuote = () => {
    if (industryQuotes.length >= INDUSTRY_QUOTES_MAX) return;
    setContent((prev) => ({
      ...prev,
      industryQuotes: [...(prev.industryQuotes || []), emptyIndustryQuote()],
    }));
  };

  const removeIndustryQuote = (index) => {
    setContent((prev) => ({
      ...prev,
      industryQuotes: (prev.industryQuotes || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Testimonials & industry quotes
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Separate home page section: learner testimonials and industry pull-quotes.
          </Typography>
        </Box>

        <TextField
          label="Section heading"
          value={content?.heading || ''}
          onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
          fullWidth
        />
        <TextField
          label="Section subtitle (optional)"
          value={content?.subtitle || ''}
          onChange={(e) => setContent((prev) => ({ ...prev, subtitle: e.target.value }))}
          fullWidth
          multiline
          minRows={2}
        />

        <Divider />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">Testimonials</Typography>
          <Button variant="outlined" onClick={addTestimonial} disabled={testimonials.length >= TESTIMONIALS_MAX}>
            Add testimonial
          </Button>
        </Stack>

        {testimonials.map((row, index) => (
          <Box
            key={`admin-testimonial-${index}`}
            sx={{ p: 2, borderRadius: 1, border: (theme) => `1px dashed ${theme.palette.divider}` }}
          >
            <Stack spacing={1.5}>
              <TextField
                label="Quote"
                value={row.quote || ''}
                onChange={(e) => updateTestimonial(index, 'quote', e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Name"
                    value={row.name || ''}
                    onChange={(e) => updateTestimonial(index, 'name', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Badge line (e.g. Verified customer)"
                    value={row.role || ''}
                    onChange={(e) => updateTestimonial(index, 'role', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Avatar URL"
                    value={row.avatarUrl || ''}
                    onChange={(e) => updateTestimonial(index, 'avatarUrl', e.target.value)}
                    fullWidth
                    placeholder="/uploads/... or https://"
                  />
                </Grid>
              </Grid>
              <Button color="inherit" onClick={() => removeTestimonial(index)}>
                Remove testimonial
              </Button>
            </Stack>
          </Box>
        ))}

        <Divider />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">Industry quotes</Typography>
          <Button variant="outlined" onClick={addIndustryQuote} disabled={industryQuotes.length >= INDUSTRY_QUOTES_MAX}>
            Add industry quote
          </Button>
        </Stack>

        {industryQuotes.map((row, index) => (
          <Box
            key={`admin-industry-${index}`}
            sx={{ p: 2, borderRadius: 1, border: (theme) => `1px dashed ${theme.palette.divider}` }}
          >
            <Stack spacing={1.5}>
              <TextField
                label="Quote"
                value={row.quote || ''}
                onChange={(e) => updateIndustryQuote(index, 'quote', e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Organisation"
                    value={row.organisation || ''}
                    onChange={(e) => updateIndustryQuote(index, 'organisation', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Logo URL"
                    value={row.logoUrl || ''}
                    onChange={(e) => updateIndustryQuote(index, 'logoUrl', e.target.value)}
                    fullWidth
                    placeholder="/uploads/... or https://"
                  />
                </Grid>
              </Grid>
              <Button color="inherit" onClick={() => removeIndustryQuote(index)}>
                Remove quote
              </Button>
            </Stack>
          </Box>
        ))}

        <LoadingButton variant="contained" loading={submitting} onClick={onSave}>
          Save testimonials section
        </LoadingButton>
      </Stack>
    </Card>
  );
}
