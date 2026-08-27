import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';

import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { HeroImageCard } from './hero-image-card';
import { IconPickerDrawer } from './icon-picker-drawer';
import { ColorPaletteField } from './color-palette-field';
import { HexColorToolDrawer } from './hex-color-tool-drawer';

const TABS = [
  { key: 'hero', title: 'Hero', icon: 'solar:flag-bold-duotone' },
  { key: 'global', title: 'Global Learning', icon: 'solar:global-bold-duotone' },
  { key: 'trust', title: 'Trust Bar', icon: 'solar:shield-check-bold-duotone' },
  { key: 'footer', title: 'Footer', icon: 'solar:layers-minimalistic-bold-duotone' },
];

/** Match backend `UPLOAD_INTL_LANDING_IMAGE_MAX_MB` (default 500). */
const INTL_LANDING_IMAGE_MAX_BYTES = 500 * 1024 * 1024;
const INTL_LANDING_IMAGE_ACCEPT = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
};
const INTL_LANDING_IMAGE_HELPER =
  'Accepted: JPG, PNG, GIF (including animated), WEBP, SVG — up to 500 MB.';

const TRUST_COLOR_PRESETS = [
  '#002060',
  '#C00000',
  '#0f766e',
  '#185FA5',
  '#7C3AED',
  '#EA580C',
  '#111827',
  '#16A34A',
];

function CompactIconButton({ icon, onClick, title }) {
  return (
    <IconButton
      size="small"
      onClick={onClick}
      title={title}
      sx={{
        width: 40,
        height: 40,
        borderRadius: 1,
        border: (t) => `1px solid ${t.palette.divider}`,
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      <Iconify icon={icon || 'solar:star-bold-duotone'} width={20} />
    </IconButton>
  );
}

function IconSelectField({ label, icon, onPick }) {
  return (
    <Stack spacing={0.75}>
      {label ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {label}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1} alignItems="center">
        <CompactIconButton icon={icon} onClick={onPick} title="Choose icon" />
        <Button size="small" variant="outlined" onClick={onPick}>
          Change icon
        </Button>
      </Stack>
    </Stack>
  );
}

export function InternationalLandingSettingsCard({
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
  globalImageFile,
  globalImageUrl,
  globalImageSubmitting,
  onGlobalImageDrop,
  onGlobalImageDelete,
  onGlobalImageSave,
  onGlobalImageClearOrRemove,
}) {
  const [tab, setTab] = useState('hero');
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconDraft, setIconDraft] = useState(null);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [colorToolOpen, setColorToolOpen] = useState(false);
  const [colorToolIndex, setColorToolIndex] = useState(0);
  const [toolStartColor, setToolStartColor] = useState('#002060');
  const [toolEndColor, setToolEndColor] = useState('#C00000');

  const hero = content?.hero || {};
  const global = content?.globalLearning || {};
  const side = global.sideCard || {};
  const trustItems = Array.isArray(content?.trustItems) ? content.trustItems : [];
  const footer = content?.footer || {};
  const columns = Array.isArray(footer.columns) ? footer.columns : [];
  const social = Array.isArray(footer.social) ? footer.social : [];
  const points = Array.isArray(global.points) ? global.points : [];

  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () =>
      availableCategoryIcons.filter((iconName) =>
        iconName.toLowerCase().includes(String(iconSearchQuery || '').toLowerCase())
      ),
    [availableCategoryIcons, iconSearchQuery]
  );

  const patch = (updater) => setContent((prev) => updater({ ...(prev || {}) }));

  const openIconPicker = (draft) => {
    setIconDraft(draft);
    setIconSearchQuery('');
    setIconToolOpen(true);
  };

  const openColorTool = (index) => {
    const current = String(trustItems[index]?.accent || '#002060');
    setColorToolIndex(index);
    setToolStartColor(current.startsWith('#') ? current : '#002060');
    setToolEndColor('#C00000');
    setColorToolOpen(true);
  };

  const applyTrustAccent = (value) => {
    patch((prev) => {
      const next = [...(prev.trustItems || [])];
      if (!next[colorToolIndex]) return prev;
      next[colorToolIndex] = { ...next[colorToolIndex], accent: value };
      return { ...prev, trustItems: next };
    });
    setColorToolOpen(false);
  };

  const selectedIconValue = () => {
    if (!iconDraft) return '';
    if (iconDraft.kind === 'side') return side.icon || '';
    if (iconDraft.kind === 'trust') return trustItems[iconDraft.index]?.icon || '';
    if (iconDraft.kind === 'social') return social[iconDraft.index]?.icon || '';
    return '';
  };

  const applyIcon = (iconName) => {
    if (!iconDraft) return;
    if (iconDraft.kind === 'side') {
      patch((prev) => ({
        ...prev,
        globalLearning: {
          ...prev.globalLearning,
          sideCard: { ...prev.globalLearning?.sideCard, icon: iconName },
        },
      }));
    } else if (iconDraft.kind === 'trust') {
      patch((prev) => {
        const next = [...(prev.trustItems || [])];
        next[iconDraft.index] = { ...next[iconDraft.index], icon: iconName };
        return { ...prev, trustItems: next };
      });
    } else if (iconDraft.kind === 'social') {
      patch((prev) => {
        const next = [...(prev.footer?.social || [])];
        next[iconDraft.index] = { ...next[iconDraft.index], icon: iconName };
        return { ...prev, footer: { ...prev.footer, social: next } };
      });
    }
    setIconToolOpen(false);
    setIconDraft(null);
  };

  return (
    <>
      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5, ...HERO_TYPOGRAPHY.adminCardTitle }}>
              International Landing
            </Typography>
            <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
              Edit the AI Nexus International landing page — hero, Global Learning section, trust
              bar, and footer. Changes appear on the international site after save.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {TABS.map((item) => (
              <Button
                key={item.key}
                size="small"
                variant={tab === item.key ? 'contained' : 'outlined'}
                startIcon={<Iconify icon={item.icon} width={16} />}
                onClick={() => setTab(item.key)}
              >
                {item.title}
              </Button>
            ))}
          </Stack>

          <Divider />

          {tab === 'hero' ? (
            <Stack spacing={2.5}>
              <HeroImageCard
                title="Landing hero image"
                description="Upload the right-side hero / globe image shown on the International landing page. GIF is supported."
                saveLabel="Upload hero image"
                accept={INTL_LANDING_IMAGE_ACCEPT}
                maxSize={INTL_LANDING_IMAGE_MAX_BYTES}
                helperText={INTL_LANDING_IMAGE_HELPER}
                heroFile={heroFile}
                heroUrl={heroUrl || hero.heroImageUrl || ''}
                heroSubmitting={heroSubmitting}
                onDrop={onHeroDrop}
                onDelete={onHeroDelete}
                onSave={onHeroSave}
                onClearOrRemove={onHeroClearOrRemove}
              />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Eyebrow"
                    value={hero.eyebrow || ''}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, eyebrow: e.target.value },
                      }))
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Title line 1"
                    value={hero.titleLine1 || ''}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, titleLine1: e.target.value },
                      }))
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Title line 2"
                    value={hero.titleLine2 || ''}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, titleLine2: e.target.value },
                      }))
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Body"
                    value={hero.body || ''}
                    onChange={(e) =>
                      patch((prev) => ({ ...prev, hero: { ...prev.hero, body: e.target.value } }))
                    }
                  />
                </Grid>
              </Grid>
            </Stack>
          ) : null}

          {tab === 'global' ? (
            <Stack spacing={2}>
              <HeroImageCard
                title="Global Learning image"
                description="Upload the middle image in the Global Learning Experience section. GIF is supported."
                saveLabel="Upload Global Learning image"
                accept={INTL_LANDING_IMAGE_ACCEPT}
                maxSize={INTL_LANDING_IMAGE_MAX_BYTES}
                helperText={INTL_LANDING_IMAGE_HELPER}
                heroFile={globalImageFile}
                heroUrl={globalImageUrl || global.imageUrl || ''}
                heroSubmitting={globalImageSubmitting}
                onDrop={onGlobalImageDrop}
                onDelete={onGlobalImageDelete}
                onSave={onGlobalImageSave}
                onClearOrRemove={onGlobalImageClearOrRemove}
              />
              <TextField
                fullWidth
                label="Section title"
                value={global.title || ''}
                onChange={(e) =>
                  patch((prev) => ({
                    ...prev,
                    globalLearning: { ...prev.globalLearning, title: e.target.value },
                  }))
                }
              />
              <Typography variant="subtitle2">Bullet points</Typography>
              {points.map((point, index) => (
                <Stack key={`point-${index}`} direction="row" spacing={1} alignItems="center">
                  <TextField
                    fullWidth
                    size="small"
                    label={`Point ${index + 1}`}
                    value={point}
                    onChange={(e) =>
                      patch((prev) => {
                        const nextPoints = [...(prev.globalLearning?.points || [])];
                        nextPoints[index] = e.target.value;
                        return {
                          ...prev,
                          globalLearning: { ...prev.globalLearning, points: nextPoints },
                        };
                      })
                    }
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        globalLearning: {
                          ...prev.globalLearning,
                          points: (prev.globalLearning?.points || []).filter((_, i) => i !== index),
                        },
                      }))
                    }
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={() =>
                  patch((prev) => ({
                    ...prev,
                    globalLearning: {
                      ...prev.globalLearning,
                      points: [...(prev.globalLearning?.points || []), ''],
                    },
                  }))
                }
              >
                Add point
              </Button>
              <Divider />
              <Divider />
              <Card
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === 'light' ? 'grey.50' : 'background.neutral'),
                }}
              >
                <Stack spacing={2.25}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Side card
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                      Shown on the right of the Global Learning section. Fill fields one by one.
                    </Typography>
                  </Box>

                  <IconSelectField
                    label="1. Icon"
                    icon={side.icon}
                    onPick={() => openIconPicker({ kind: 'side' })}
                  />

                  <TextField
                    fullWidth
                    label="2. Title"
                    value={side.title || ''}
                    placeholder="For Professionals. By Professionals."
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        globalLearning: {
                          ...prev.globalLearning,
                          sideCard: { ...prev.globalLearning?.sideCard, title: e.target.value },
                        },
                      }))
                    }
                  />

                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="3. Body"
                    value={side.body || ''}
                    placeholder="Short supporting text for the side card…"
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        globalLearning: {
                          ...prev.globalLearning,
                          sideCard: { ...prev.globalLearning?.sideCard, body: e.target.value },
                        },
                      }))
                    }
                  />

                  <Box
                    sx={{
                      mt: 0.5,
                      p: 2,
                      borderRadius: 1.5,
                      border: (t) => `1px dashed ${t.palette.divider}`,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontWeight: 700, displaySpacing: 0.4 }}
                    >
                      PREVIEW
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mt: 1.25 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'primary.lighter',
                          color: 'primary.main',
                          flexShrink: 0,
                        }}
                      >
                        <Iconify icon={side.icon || 'solar:star-bold-duotone'} width={22} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {side.title || 'Side card title'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                          {side.body || 'Side card body text will appear here.'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              </Card>
            </Stack>
          ) : null}

          {tab === 'trust' ? (
            <Stack spacing={1.75}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                useFlexGap
                spacing={1}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Trust bar
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Compact highlight items under Global Learning.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  disabled={trustItems.length >= 8}
                  onClick={() =>
                    patch((prev) => ({
                      ...prev,
                      trustItems: [
                        ...(prev.trustItems || []),
                        {
                          icon: 'solar:star-bold-duotone',
                          line1: '',
                          line2: '',
                          accent: '#002060',
                        },
                      ],
                    }))
                  }
                >
                  Add item
                </Button>
              </Stack>

              {trustItems.length ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 1.75,
                  }}
                >
                  {trustItems.map((item, index) => (
                    <Card key={`trust-${index}`} variant="outlined" sx={{ p: 1.75, height: 1 }}>
                      <Stack spacing={1.5}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Item {index + 1}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={trustItems.length <= 1}
                            onClick={() =>
                              patch((prev) => ({
                                ...prev,
                                trustItems: (prev.trustItems || []).filter((_, i) => i !== index),
                              }))
                            }
                            title="Remove"
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <CompactIconButton
                            icon={item.icon}
                            onClick={() => openIconPicker({ kind: 'trust', index })}
                            title="Change icon"
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openIconPicker({ kind: 'trust', index })}
                          >
                            Change icon
                          </Button>
                        </Stack>

                        <TextField
                          size="small"
                          fullWidth
                          label="Line 1"
                          value={item.line1 || ''}
                          onChange={(e) =>
                            patch((prev) => {
                              const next = [...(prev.trustItems || [])];
                              next[index] = { ...next[index], line1: e.target.value };
                              return { ...prev, trustItems: next };
                            })
                          }
                        />
                        <TextField
                          size="small"
                          fullWidth
                          label="Line 2"
                          value={item.line2 || ''}
                          onChange={(e) =>
                            patch((prev) => {
                              const next = [...(prev.trustItems || [])];
                              next[index] = { ...next[index], line2: e.target.value };
                              return { ...prev, trustItems: next };
                            })
                          }
                        />

                        <ColorPaletteField
                          label="Accent color"
                          value={item.accent || ''}
                          onChange={(value) =>
                            patch((prev) => {
                              const next = [...(prev.trustItems || [])];
                              next[index] = { ...next[index], accent: value };
                              return { ...prev, trustItems: next };
                            })
                          }
                          presets={TRUST_COLOR_PRESETS}
                          onOpenGenerator={() => openColorTool(index)}
                          generatorLabel="Generate Color"
                        />
                      </Stack>
                    </Card>
                  ))}
                </Box>
              ) : null}
            </Stack>
          ) : null}

          {tab === 'footer' ? (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  General
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
                    gap: 1.5,
                  }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    label="Tagline"
                    value={footer.tagline || ''}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, tagline: e.target.value },
                      }))
                    }
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Copyright"
                    helperText="Use {year} for current year"
                    value={footer.copyrightText || ''}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, copyrightText: e.target.value },
                      }))
                    }
                  />
                </Box>
              </Box>

              <Divider />

              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Social
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="mingcute:add-line" width={16} />}
                    disabled={social.length >= 6}
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          social: [
                            ...(prev.footer?.social || []),
                            { icon: 'mdi:linkedin', href: '' },
                          ],
                        },
                      }))
                    }
                  >
                    Add
                  </Button>
                </Stack>

                <Stack spacing={1}>
                  {social.map((item, index) => (
                    <Stack
                      key={`social-${index}`}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        px: 1,
                        py: 0.75,
                        borderRadius: 1,
                        border: (t) => `1px solid ${t.palette.divider}`,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <CompactIconButton
                        icon={item.icon}
                        onClick={() => openIconPicker({ kind: 'social', index })}
                        title="Choose icon"
                      />
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="https://..."
                        value={item.href || ''}
                        onChange={(e) =>
                          patch((prev) => {
                            const next = [...(prev.footer?.social || [])];
                            next[index] = { ...next[index], href: e.target.value };
                            return { ...prev, footer: { ...prev.footer, social: next } };
                          })
                        }
                      />
                      <IconButton
                        size="small"
                        color="error"
                        disabled={social.length <= 1}
                        onClick={() =>
                          patch((prev) => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              social: (prev.footer?.social || []).filter((_, i) => i !== index),
                            },
                          }))
                        }
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Columns
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="mingcute:add-line" width={16} />}
                    disabled={columns.length >= 4}
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          columns: [
                            ...(prev.footer?.columns || []),
                            { title: '', links: [{ label: '', href: '' }] },
                          ],
                        },
                      }))
                    }
                  >
                    Add column
                  </Button>
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 1.5,
                    alignItems: 'start',
                  }}
                >
                  {columns.map((col, colIndex) => (
                    <Box
                      key={`col-${colIndex}`}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        border: (t) => `1px solid ${t.palette.divider}`,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            size="small"
                            fullWidth
                            label="Title"
                            value={col.title || ''}
                            onChange={(e) =>
                              patch((prev) => {
                                const next = [...(prev.footer?.columns || [])];
                                next[colIndex] = { ...next[colIndex], title: e.target.value };
                                return { ...prev, footer: { ...prev.footer, columns: next } };
                              })
                            }
                          />
                          <IconButton
                            size="small"
                            color="error"
                            disabled={columns.length <= 1}
                            onClick={() =>
                              patch((prev) => ({
                                ...prev,
                                footer: {
                                  ...prev.footer,
                                  columns: (prev.footer?.columns || []).filter(
                                    (_, i) => i !== colIndex
                                  ),
                                },
                              }))
                            }
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                          </IconButton>
                        </Stack>

                        {(col.links || []).map((link, linkIndex) => (
                          <Stack
                            key={`link-${colIndex}-${linkIndex}`}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <TextField
                              size="small"
                              label="Label"
                              value={link.label || ''}
                              onChange={(e) =>
                                patch((prev) => {
                                  const nextCols = [...(prev.footer?.columns || [])];
                                  const nextLinks = [...(nextCols[colIndex]?.links || [])];
                                  nextLinks[linkIndex] = {
                                    ...nextLinks[linkIndex],
                                    label: e.target.value,
                                  };
                                  nextCols[colIndex] = {
                                    ...nextCols[colIndex],
                                    links: nextLinks,
                                  };
                                  return {
                                    ...prev,
                                    footer: { ...prev.footer, columns: nextCols },
                                  };
                                })
                              }
                              sx={{ flex: 1, minWidth: 0 }}
                            />
                            <TextField
                              size="small"
                              label="URL"
                              value={link.href || ''}
                              onChange={(e) =>
                                patch((prev) => {
                                  const nextCols = [...(prev.footer?.columns || [])];
                                  const nextLinks = [...(nextCols[colIndex]?.links || [])];
                                  nextLinks[linkIndex] = {
                                    ...nextLinks[linkIndex],
                                    href: e.target.value,
                                  };
                                  nextCols[colIndex] = {
                                    ...nextCols[colIndex],
                                    links: nextLinks,
                                  };
                                  return {
                                    ...prev,
                                    footer: { ...prev.footer, columns: nextCols },
                                  };
                                })
                              }
                              sx={{ flex: 1, minWidth: 0 }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                patch((prev) => {
                                  const nextCols = [...(prev.footer?.columns || [])];
                                  nextCols[colIndex] = {
                                    ...nextCols[colIndex],
                                    links: (nextCols[colIndex]?.links || []).filter(
                                      (_, i) => i !== linkIndex
                                    ),
                                  };
                                  return {
                                    ...prev,
                                    footer: { ...prev.footer, columns: nextCols },
                                  };
                                })
                              }
                            >
                              <Iconify icon="mingcute:close-line" width={16} />
                            </IconButton>
                          </Stack>
                        ))}

                        <Button
                          size="small"
                          color="inherit"
                          startIcon={<Iconify icon="mingcute:add-line" width={14} />}
                          onClick={() =>
                            patch((prev) => {
                              const nextCols = [...(prev.footer?.columns || [])];
                              nextCols[colIndex] = {
                                ...nextCols[colIndex],
                                links: [
                                  ...(nextCols[colIndex]?.links || []),
                                  { label: '', href: '' },
                                ],
                              };
                              return { ...prev, footer: { ...prev.footer, columns: nextCols } };
                            })
                          }
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Add link
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Stack>
          ) : null}

          <Box>
            <LoadingButton variant="contained" loading={submitting} onClick={onSave}>
              Save International Landing
            </LoadingButton>
          </Box>
        </Stack>
      </Card>

      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => {
          setIconToolOpen(false);
          setIconDraft(null);
        }}
        contextLabel={
          iconDraft?.kind === 'side'
            ? 'side card'
            : iconDraft?.kind === 'trust'
              ? 'trust bar item'
              : iconDraft?.kind === 'social'
                ? 'footer social icon'
                : 'item'
        }
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(e) => setIconSearchQuery(e.target.value)}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={selectedIconValue()}
        onSelectIcon={applyIcon}
      />

      <HexColorToolDrawer
        open={colorToolOpen}
        onClose={() => setColorToolOpen(false)}
        startColor={toolStartColor}
        endColor={toolEndColor}
        onStartColorChange={(event) => setToolStartColor(event.target.value)}
        onEndColorChange={(event) => setToolEndColor(event.target.value)}
        headingColor={toolStartColor}
        accentColor={toolEndColor}
        onApplyHeadingColor={() => applyTrustAccent(toolStartColor)}
        onApplyAccentColor={() => applyTrustAccent(toolEndColor)}
        title="Trust bar color"
        description="Pick a color or type HEX, then apply it to this trust item."
        startLabel="Primary HEX"
        endLabel="Secondary HEX"
        applyStartLabel="Apply"
        applyEndLabel="Apply"
      />
    </>
  );
}
