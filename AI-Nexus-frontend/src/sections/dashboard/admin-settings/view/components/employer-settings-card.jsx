import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from 'src/components/snackbar';
import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
import { CONFIG } from 'src/config-global';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { EMPLOYER_BENEFITS_MAX, EMPLOYER_LOGOS_MAX } from 'src/sections/home/employer-defaults';
import { HeroImageCard } from './hero-image-card';
import { IconPickerDrawer } from './icon-picker-drawer';

const emptyBenefit = () => ({ icon: 'solar:buildings-2-bold-duotone', title: '', description: '' });

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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft] = useState(emptyBenefit);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [iconToolOpen, setIconToolOpen] = useState(false);
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

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingIndex(null);
    setDraft(emptyBenefit());
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawer]);

  const openAddDrawer = () => {
    if (!canAddMore) return;
    setDrawerMode('add');
    setEditingIndex(null);
    setDraft(emptyBenefit());
    setDrawerOpen(true);
  };

  const openEditDrawer = (index) => {
    const row = benefits[index];
    if (!row) return;
    setDrawerMode('edit');
    setEditingIndex(index);
    setDraft({
      icon: String(row.icon || emptyBenefit().icon),
      title: String(row.title || ''),
      description: String(row.description || ''),
    });
    setDrawerOpen(true);
  };

  const toggleExpand = (index) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  const handleDrawerApply = () => {
    const title = String(draft.title || '').trim();
    if (!title) {
      toast.error('Benefit title is required');
      return;
    }

    const entry = {
      icon: String(draft.icon || emptyBenefit().icon).trim() || emptyBenefit().icon,
      title,
      description: String(draft.description || ''),
    };

    setContent((prev) => {
      const rows = [...(prev.benefits || [])];
      if (drawerMode === 'add') {
        return { ...prev, benefits: [...rows, entry] };
      }
      if (editingIndex != null && editingIndex >= 0) {
        rows[editingIndex] = entry;
        return { ...prev, benefits: rows };
      }
      return prev;
    });
    closeDrawer();
  };

  const handleDrawerDelete = () => {
    if (drawerMode !== 'edit' || editingIndex == null) return;
    setContent((prev) => ({
      ...prev,
      benefits: (prev.benefits || []).filter((_, i) => i !== editingIndex),
    }));
    closeDrawer();
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
                Heading, subtitle, and CTA. Use Add benefit — the editor opens in a right sidebar.
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
              <Button variant="outlined" onClick={openAddDrawer} disabled={!canAddMore || submitting}>
                Add benefit
              </Button>
            </Stack>

            <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
              {benefits.length === 0 ? (
                <Typography variant="body2" sx={{ py: 4, color: 'text.secondary', textAlign: 'center' }}>
                  No benefits yet. Click Add benefit to open the right sidebar editor.
                </Typography>
              ) : (
                benefits.map((row, index) => {
                  const label = String(row?.title || '').trim() || `Benefit ${index + 1}`;
                  const isExpanded = expandedIndex === index;
                  const description = String(row?.description || '').trim();
                  const isLast = index === benefits.length - 1;

                  return (
                    <Box key={`admin-employer-benefit-${index}`}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                        sx={{
                          pt: { xs: 1.5, sm: 2 },
                          pb: isExpanded ? 0.5 : { xs: 1.5, sm: 2 },
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            mt: 0.15,
                            flexShrink: 0,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'background.neutral',
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            color: 'primary.main',
                          }}
                        >
                          <Iconify icon={row?.icon || emptyBenefit().icon} width={20} />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              lineHeight: 1.5,
                              ...(isExpanded
                                ? { wordBreak: 'break-word' }
                                : {
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }),
                            }}
                          >
                            {label}
                          </Typography>

                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Typography
                              variant="body2"
                              sx={{ pt: 0.75, color: 'text.secondary', lineHeight: 1.6 }}
                            >
                              {description || 'No description yet.'}
                            </Typography>
                          </Collapse>
                        </Box>

                        <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                          <Tooltip title={isExpanded ? 'Hide details' : 'View details'}>
                            <IconButton
                              size="small"
                              onClick={() => toggleExpand(index)}
                              aria-label={isExpanded ? 'Hide details' : 'View details'}
                              color={isExpanded ? 'primary' : 'default'}
                            >
                              <Iconify icon="solar:eye-bold" width={20} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit benefit">
                            <IconButton
                              size="small"
                              onClick={() => openEditDrawer(index)}
                              disabled={submitting}
                              aria-label="Edit benefit"
                            >
                              <Iconify icon="solar:pen-bold" width={20} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                      {!isLast ? <Divider /> : null}
                    </Box>
                  );
                })
              )}
            </Box>

            <LoadingButton variant="contained" loading={submitting} onClick={onSave}>
              Save employer section
            </LoadingButton>
          </Stack>
        </Card>
      </Stack>

      {/* Right sidebar — benefit editor (open / close like FAQs) */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 0 } }}
      >
        <Stack sx={{ height: '100%' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="h6" sx={HERO_TYPOGRAPHY.adminCardTitle}>
              {drawerMode === 'add' ? 'Add benefit' : 'Edit benefit'}
            </Typography>
            <IconButton onClick={closeDrawer} aria-label="Close benefit editor">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>

          <Stack spacing={2.5} sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={(theme) => ({
                p: 1.25,
                borderRadius: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.neutral',
              })}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.paper',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                <Iconify icon={draft.icon || emptyBenefit().icon} width={24} />
              </Box>
              <Button
                variant="outlined"
                onClick={() => {
                  setIconSearchQuery('');
                  setIconToolOpen(true);
                }}
                sx={{ flex: 1 }}
              >
                Pick icon
              </Button>
            </Stack>

            <TextField
              label="Title"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              fullWidth
              autoFocus
            />

            <TextField
              label="Description"
              value={draft.description}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
              fullWidth
              multiline
              minRows={4}
            />
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            {drawerMode === 'edit' ? (
              <Button
                color="error"
                variant="outlined"
                onClick={handleDrawerDelete}
                disabled={submitting}
                sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
              >
                Delete
              </Button>
            ) : (
              <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
            )}

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button color="inherit" variant="outlined" onClick={closeDrawer} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleDrawerApply}
                disabled={submitting || !String(draft.title || '').trim()}
              >
                {drawerMode === 'add' ? 'Add' : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Drawer>

      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => setIconToolOpen(false)}
        contextLabel={
          drawerMode === 'add' ? 'new employer benefit' : `employer benefit ${(editingIndex ?? 0) + 1}`
        }
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={draft.icon || emptyBenefit().icon}
        onSelectIcon={(iconName) => {
          setDraft((prev) => ({ ...prev, icon: iconName }));
          setIconToolOpen(false);
        }}
      />
    </>
  );
}
