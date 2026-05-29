import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { CONFIG } from 'src/config-global';
import { EMPLOYEE_BENEFITS_MAX } from 'src/sections/home/employee-defaults';
import { HeroImageCard } from './hero-image-card';

const emptyBenefit = () => ({
  icon: 'solar:book-bookmark-bold-duotone',
  title: '',
});

function resolvePreviewUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export function EmployeeSettingsCard({
  content,
  setContent,
  submitting,
  onSave,
  heroFile,
  heroUrl,
  heroSubmitting,
  onHeroDrop,
  onHeroDelete,
  onHeroSave,
  onHeroClearOrRemove,
}) {
  const benefits = Array.isArray(content?.benefits) ? content.benefits : [];
  const displayHeroUrl = resolvePreviewUrl(heroUrl || content?.heroImageUrl);

  const updateBenefit = (index, field, value) => {
    setContent((prev) => {
      const rows = [...(prev.benefits || [])];
      while (rows.length <= index) rows.push(emptyBenefit());
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, benefits: rows };
    });
  };

  const addBenefit = () => {
    if (benefits.length >= EMPLOYEE_BENEFITS_MAX) return;
    setContent((prev) => ({
      ...prev,
      benefits: [...(prev.benefits || []), emptyBenefit()],
    }));
  };

  const removeBenefit = (index) => {
    setContent((prev) => ({
      ...prev,
      benefits: (prev.benefits || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <Stack spacing={3}>
      <HeroImageCard
        title="Employee section — hero image"
        description="Upload the wide image shown on the right of the learners section on the home page."
        saveLabel="Save employee hero image"
        heroFile={heroFile}
        heroUrl={displayHeroUrl}
        heroSubmitting={heroSubmitting}
        onDrop={onHeroDrop}
        onDelete={onHeroDelete}
        onSave={onHeroSave}
        onClearOrRemove={onHeroClearOrRemove}
      />

      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Employee / learners section
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Headline, CTAs, benefit cards, and text on the hero image panel.
            </Typography>
          </Box>

          <TextField
            label="Eyebrow (e.g. FOR LEARNERS & PROFESSIONALS)"
            value={content?.eyebrow || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, eyebrow: e.target.value }))}
            fullWidth
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Heading line 1"
                value={content?.heading || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Heading accent (gradient word)"
                value={content?.headingAccent || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, headingAccent: e.target.value }))}
                fullWidth
              />
            </Grid>
          </Grid>

          <TextField
            label="Subtitle (HTML allowed)"
            value={content?.subtitle || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, subtitle: e.target.value }))}
            fullWidth
            multiline
            minRows={2}
          />

          <Divider />

          <Typography variant="subtitle2">Hero panel text (on image or placeholder)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Panel title"
                value={content?.heroPanelTitle || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, heroPanelTitle: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Panel subtitle"
                value={content?.heroPanelSubtitle || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, heroPanelSubtitle: e.target.value }))}
                fullWidth
              />
            </Grid>
          </Grid>

          <Divider />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Primary CTA label"
                value={content?.primaryCtaLabel || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, primaryCtaLabel: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Primary CTA link"
                value={content?.primaryCtaHref || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, primaryCtaHref: e.target.value }))}
                fullWidth
                placeholder="/learning"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Secondary CTA label"
                value={content?.secondaryCtaLabel || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, secondaryCtaLabel: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Secondary CTA link"
                value={content?.secondaryCtaHref || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, secondaryCtaHref: e.target.value }))}
                fullWidth
                placeholder="/contact"
              />
            </Grid>
          </Grid>

          <Divider />

          <TextField
            label="Benefits section label"
            value={content?.benefitsLabel || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, benefitsLabel: e.target.value }))}
            fullWidth
          />

          <TextField
            label="Supporting partners heading"
            value={content?.partnersHeading || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, partnersHeading: e.target.value }))}
            fullWidth
            placeholder="Supporting Partners"
            helperText="Shown above scrolling partner logos. Employer section heading is used if this is empty."
          />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2">Benefits (up to {EMPLOYEE_BENEFITS_MAX})</Typography>
            <Button variant="outlined" onClick={addBenefit} disabled={benefits.length >= EMPLOYEE_BENEFITS_MAX}>
              Add benefit
            </Button>
          </Stack>

          {benefits.map((row, index) => (
            <Box
              key={`admin-employee-benefit-${index}`}
              sx={{ p: 2, borderRadius: 1, border: (theme) => `1px dashed ${theme.palette.divider}` }}
            >
              <Stack spacing={1.5}>
                <TextField
                  label="Icon (Iconify name)"
                  value={row.icon || ''}
                  onChange={(e) => updateBenefit(index, 'icon', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Title"
                  value={row.title || ''}
                  onChange={(e) => updateBenefit(index, 'title', e.target.value)}
                  fullWidth
                />
                <Button color="inherit" onClick={() => removeBenefit(index)}>
                  Remove benefit
                </Button>
              </Stack>
            </Box>
          ))}

          <LoadingButton variant="contained" loading={submitting} onClick={onSave}>
            Save employee section
          </LoadingButton>
        </Stack>
      </Card>
    </Stack>
  );
}
