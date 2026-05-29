import { useCallback, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
import { CONFIG } from 'src/config-global';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { EMPLOYER_BENEFITS_MAX, EMPLOYER_LOGOS_MAX } from 'src/sections/home/employer-defaults';
import { HeroImageCard } from './hero-image-card';
import { IconPickerDrawer } from './icon-picker-drawer';

const emptyBenefit = () => ({ icon: 'solar:buildings-2-bold-duotone', title: '' });

function resolvePreviewUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export function EmployerSettingsCard({
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
  onUploadLogo,
  onRemoveLogo,
  uploadingLogoIndex = null,
}) {
  const benefits = Array.isArray(content?.benefits) ? content.benefits : [];
  const logos = Array.isArray(content?.logos) ? content.logos : [];
  const canAddLogo = logos.length < EMPLOYER_LOGOS_MAX;
  const displayHeroUrl = resolvePreviewUrl(heroUrl || content?.heroImageUrl);

  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconPickerIndex, setIconPickerIndex] = useState(null);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const canAddMore = benefits.length < EMPLOYER_BENEFITS_MAX;

  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () =>
      availableCategoryIcons.filter((iconName) =>
        iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())
      ),
    [availableCategoryIcons, iconSearchQuery]
  );

  const updateBenefit = useCallback(
    (index, field, value) => {
      setContent((prev) => {
        const rows = [...(prev.benefits || [])];
        while (rows.length <= index) rows.push(emptyBenefit());
        rows[index] = { ...rows[index], [field]: value };
        return { ...prev, benefits: rows };
      });
    },
    [setContent]
  );

  const addBenefit = () => {
    if (!canAddMore) return;
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

  const openIconPicker = (index) => {
    setIconPickerIndex(index);
    setIconSearchQuery('');
    setIconToolOpen(true);
  };

  return (
    <>
      <Stack spacing={3}>
        <HeroImageCard
          title="Employer section — main image"
          description="Upload the hero image for the home learners / employer section."
          saveLabel="Save employer image"
          heroFile={heroFile}
          heroUrl={displayHeroUrl}
          heroSubmitting={heroSubmitting}
          onDrop={onHeroDrop}
          onDelete={onHeroDelete}
          onSave={onHeroSave}
          onClearOrRemove={onHeroClearOrRemove}
        />

        <Card sx={{ p: 3, overflow: 'hidden' }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
                Employer section content
              </Typography>
              <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
                Heading, subtitle, CTA, benefits grid, and partner logos.
              </Typography>
            </Box>

            <TextField
              label="Section heading"
              value={content?.heading || ''}
              onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
              fullWidth
            />

            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Section subtitle</Typography>
              <Editor
                value={content?.subtitle || ''}
                onChange={(value) => setContent((prev) => ({ ...prev, subtitle: value }))}
                placeholder="Write employer section subtitle..."
                editable
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 140,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                  },
                }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="CTA label"
                value={content?.ctaLabel || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                fullWidth
              />
              <TextField
                label="CTA link"
                value={content?.ctaHref || ''}
                onChange={(e) => setContent((prev) => ({ ...prev, ctaHref: e.target.value }))}
                fullWidth
                placeholder="/contact"
              />
            </Stack>

            <Divider />

            <TextField
              label="Supporting partners heading (employee section)"
              value={content?.partnersHeading || ''}
              onChange={(e) => setContent((prev) => ({ ...prev, partnersHeading: e.target.value }))}
              fullWidth
              placeholder="Supporting Partners"
              helperText="Shown above the scrolling partner logos on the home page employee section."
            />

            <Stack spacing={1.25}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack spacing={0.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Company logos
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {logos.length} / {EMPLOYER_LOGOS_MAX}
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!canAddLogo || submitting}
                  onClick={() =>
                    setContent((prev) => ({
                      ...prev,
                      logos: [...(Array.isArray(prev?.logos) ? prev.logos : []), { name: '', logoUrl: '' }],
                    }))
                  }
                >
                  Add logo
                </Button>
              </Stack>
              {logos.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No logos yet. Click Add logo.
                </Typography>
              ) : null}
              <Grid container spacing={1.25}>
                {logos.map((row, index) => {
                  return (
                    <Grid key={`employer-logo-${index}`} item xs={12} sm={6} md={4} lg={3}>
                      <Stack
                        spacing={1}
                        sx={{
                          p: 1.2,
                          borderRadius: 1.5,
                          border: (theme) => `1px solid ${theme.palette.divider}`,
                          bgcolor: 'background.neutral',
                          height: 1,
                        }}
                      >
                        <TextField
                          size="small"
                          label={`Logo ${index + 1} name`}
                          value={row.name || ''}
                          onChange={(e) =>
                            setContent((prev) => {
                              const next = Array.isArray(prev?.logos) ? [...prev.logos] : [];
                              while (next.length <= index) next.push({ name: '', logoUrl: '' });
                              next[index] = { ...next[index], name: e.target.value };
                              return { ...prev, logos: next };
                            })
                          }
                        />
                        <Box
                          sx={{
                            height: 44,
                            borderRadius: 1,
                            border: (theme) => `1px dashed ${theme.palette.divider}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'background.paper',
                          }}
                        >
                          {row.logoUrl ? (
                            <Box component="img" src={resolvePreviewUrl(row.logoUrl)} alt="" sx={{ height: 28, maxWidth: '100%', objectFit: 'contain' }} />
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              No logo
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" component="label" disabled={uploadingLogoIndex === index}>
                            {uploadingLogoIndex === index ? 'Uploading...' : 'Upload'}
                            <input
                              hidden
                              type="file"
                              accept="image/*"
                              onChange={async (event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (!file) return;
                                await onUploadLogo?.(index, file);
                              }}
                            />
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={!String(row.logoUrl || '').trim() || uploadingLogoIndex === index}
                            onClick={() => onRemoveLogo?.(index)}
                          >
                            Remove
                          </Button>
                          <Button
                            size="small"
                            color="inherit"
                            variant="text"
                            disabled={uploadingLogoIndex === index}
                            onClick={() =>
                              setContent((prev) => ({
                                ...prev,
                                logos: (Array.isArray(prev?.logos) ? prev.logos : []).filter((_, i) => i !== index),
                              }))
                            }
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>

            <Divider />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
            >
              <Stack spacing={0.25}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Benefits
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {benefits.length} / {EMPLOYER_BENEFITS_MAX} items
                </Typography>
              </Stack>
              <Button variant="outlined" size="small" onClick={addBenefit} disabled={!canAddMore || submitting}>
                Add benefit
              </Button>
            </Stack>

            {benefits.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                No benefits yet. Home page shows icon + title only.
              </Typography>
            ) : null}

            <Grid container spacing={1.5}>
              {benefits.map((row, index) => (
                <Grid key={`admin-employer-benefit-${index}`} item xs={12} sm={6} md={4}>
                  <Stack
                    spacing={1.25}
                    sx={{
                      p: 1.5,
                      height: 1,
                      borderRadius: 1,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.neutral',
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          onClick={() => openIconPicker(index)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openIconPicker(index);
                            }
                          }}
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'background.paper',
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            color: 'primary.main',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Iconify icon={row?.icon || emptyBenefit().icon} width={20} />
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openIconPicker(index)}
                          disabled={submitting}
                        >
                          Change icon
                        </Button>
                      </Stack>
                      <Button size="small" color="inherit" onClick={() => removeBenefit(index)} disabled={submitting}>
                        Remove
                      </Button>
                    </Stack>

                    <TextField
                      size="small"
                      label="Title"
                      value={row.title || ''}
                      onChange={(e) => updateBenefit(index, 'title', e.target.value)}
                      fullWidth
                    />
                  </Stack>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
              <LoadingButton variant="contained" loading={submitting} onClick={onSave} sx={{ width: 'auto' }}>
                Save employer section
              </LoadingButton>
            </Box>
          </Stack>
        </Card>
      </Stack>

      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => {
          setIconToolOpen(false);
          setIconPickerIndex(null);
        }}
        contextLabel={
          iconPickerIndex != null ? `employer benefit ${iconPickerIndex + 1}` : 'employer benefit'
        }
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={
          iconPickerIndex != null
            ? benefits[iconPickerIndex]?.icon || emptyBenefit().icon
            : emptyBenefit().icon
        }
        onSelectIcon={(iconName) => {
          if (iconPickerIndex != null) {
            updateBenefit(iconPickerIndex, 'icon', iconName);
          }
          setIconToolOpen(false);
          setIconPickerIndex(null);
        }}
      />
    </>
  );
}
