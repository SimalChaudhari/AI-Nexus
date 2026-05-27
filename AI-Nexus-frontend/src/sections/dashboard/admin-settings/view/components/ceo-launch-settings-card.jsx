import { useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { categoryIcons } from 'src/_mock/_category-icons';
import { Iconify } from 'src/components/iconify';
import { Editor } from 'src/components/editor';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { CEO_LAUNCH_STATS_MAX } from 'src/sections/home/ceo-launch-defaults';
import { HeroImageCard } from './hero-image-card';
import { CeoLaunchVideoField } from './ceo-launch-video-field';
import { IconPickerDrawer } from './icon-picker-drawer';

export function CeoLaunchSettingsCard({
  content,
  setContent,
  submitting,
  onSave,
  posterFile,
  posterUrl,
  posterSubmitting,
  onPosterDrop,
  onPosterDelete,
  onPosterSave,
  onPosterClearOrRemove,
  videoFile,
  videoSubmitting,
  onVideoFileSelect,
  onVideoClearPending,
  onVideoSave,
  onVideoRemoveUploaded,
  onVideoRemoveAll,
  onUploadStatIcon,
  onRemoveStatIcon,
  uploadingStatIconIndex = null,
}) {
  const fileInputRefs = useRef({});
  const ICON_SIZE_OPTIONS = [16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 52, 56];
  const stats = Array.isArray(content?.stats) ? content.stats : [];
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconToolStatIndex, setIconToolStatIndex] = useState(0);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () =>
      availableCategoryIcons.filter((iconName) =>
        iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())
      ),
    [availableCategoryIcons, iconSearchQuery]
  );

  const updateStat = (index, field, value) => {
    setContent((prev) => {
      const rows = [...(Array.isArray(prev.stats) ? prev.stats : [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, stats: rows };
    });
  };

  const triggerIconUpload = (index) => {
    fileInputRefs.current[index]?.click();
  };

  const handleIconUpload = async (index, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadStatIcon) return;
    await onUploadStatIcon(index, file);
  };

  const openIconPicker = (index) => {
    setIconToolStatIndex(index);
    setIconSearchQuery('');
    setIconToolOpen(true);
  };

  const statIconPreview = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return <Iconify icon="mingcute:apps-line" width={16} />;
    const isImagePath =
      /^https?:\/\//i.test(value) || value.startsWith('/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
    if (isImagePath) {
      return <Box component="img" src={value} alt="" sx={{ width: 16, height: 16, objectFit: 'contain' }} />;
    }
    return <Iconify icon={value} width={16} />;
  };

  const addStat = () => {
    if (stats.length >= CEO_LAUNCH_STATS_MAX) return;
    setContent((prev) => ({
      ...prev,
      stats: [...(Array.isArray(prev.stats) ? prev.stats : []), { value: '', label: '', icon: '' }],
    }));
  };

  const removeStat = (index) => {
    setContent((prev) => ({
      ...prev,
      stats: (Array.isArray(prev.stats) ? prev.stats : []).filter((_, i) => i !== index),
    }));
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
              CEO launch video
            </Typography>
            <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
              Dark home section — eyebrow, heading, video, quote, stats, and play CTA.
            </Typography>
          </Box>

          <TextField
            label="Eyebrow"
            value={content?.eyebrow || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, eyebrow: e.target.value }))}
            placeholder="CEO LAUNCH VIDEO"
            fullWidth
          />
          <TextField
            label="Heading"
            value={content?.heading || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
            placeholder="Why AI Fluency Matters Now"
            fullWidth
          />

          <Stack spacing={0.75}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Subtitle
            </Typography>
            <Editor
              value={content?.subtitle || ''}
              onChange={(value) => setContent((prev) => ({ ...prev, subtitle: value }))}
              sx={{ minHeight: 120 }}
            />
          </Stack>

          <CeoLaunchVideoField
            videoUrl={content?.videoUrl || ''}
            onVideoUrlChange={(value) => {
              setContent((prev) => ({ ...prev, videoUrl: value }));
              if (String(value || '').trim() && videoFile) onVideoClearPending();
            }}
            videoFile={videoFile}
            onVideoFileSelect={onVideoFileSelect}
            onClearPendingFile={onVideoClearPending}
            uploadedVideoUrl={content?.videoFileUrl || ''}
            videoSubmitting={videoSubmitting}
            contentSubmitting={submitting}
            onVideoSave={onVideoSave}
            onRemoveUploadedVideo={onVideoRemoveUploaded}
            onRemoveAllVideo={onVideoRemoveAll}
          />

          <TextField
            label="Quote"
            value={content?.quote || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, quote: e.target.value }))}
            multiline
            minRows={3}
            fullWidth
          />

          <Card
            sx={{
              p: { xs: 1.5, md: 2 },
              borderRadius: 2.5,
              border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
              boxShadow: (theme) => `0 10px 28px ${alpha(theme.palette.primary.dark, 0.14)}`,
              background: (theme) =>
                `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.09)} 0%, ${theme.palette.background.paper} 34%)`,
            }}
          >
            <Stack spacing={1.75}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack spacing={0.25}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Hero stats
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Compact and premium stats editor
                  </Typography>
                </Stack>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Iconify icon="mingcute:add-line" width={16} />}
                  onClick={addStat}
                  disabled={stats.length >= CEO_LAUNCH_STATS_MAX || submitting}
                  sx={{ borderRadius: 999 }}
                >
                  Add
                </Button>
              </Stack>

              <Grid container spacing={1}>
                <Grid item xs={12} sm={5} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="ceo-stat-icon-size-label">Icon size (px)</InputLabel>
                    <Select
                      labelId="ceo-stat-icon-size-label"
                      label="Icon size (px)"
                      value={content?.statIconSize ?? 30}
                      onChange={(e) =>
                        setContent((prev) => ({
                          ...prev,
                          statIconSize: Math.max(16, Math.min(56, Number(e.target.value) || 30)),
                        }))
                      }
                    >
                      {ICON_SIZE_OPTIONS.map((size) => (
                        <MenuItem key={`ceo-stat-icon-size-${size}`} value={size}>
                          {size}px
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid container spacing={1}>
                {stats.map((row, index) => (
                  <Grid item xs={12} md={6} key={`ceo-stat-field-${index}`}>
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.86),
                        boxShadow: (theme) => `0 6px 14px ${alpha(theme.palette.common.black, 0.06)}`,
                        height: '100%',
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {`Stat ${index + 1}`}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeStat(index)}
                            disabled={submitting}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                          </IconButton>
                        </Stack>

                        <Grid container spacing={1}>
                          <Grid item xs={12} sm={7}>
                            <TextField
                              size="small"
                              label="Label"
                              value={row?.label || ''}
                              onChange={(e) => updateStat(index, 'label', e.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={5}>
                            <TextField
                              size="small"
                              label="Value"
                              value={row?.value || ''}
                              onChange={(e) => updateStat(index, 'value', e.target.value)}
                              fullWidth
                            />
                          </Grid>
                        </Grid>

                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1.2,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                              bgcolor: (theme) => alpha(theme.palette.primary.light, 0.14),
                              flexShrink: 0,
                            }}
                          >
                            {statIconPreview(row?.icon)}
                          </Box>
                          <Button size="small" variant="outlined" onClick={() => openIconPicker(index)}>
                            Icon
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => triggerIconUpload(index)}
                            disabled={uploadingStatIconIndex === index}
                          >
                            {uploadingStatIconIndex === index ? 'Uploading...' : 'Image'}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="soft"
                            onClick={() => updateStat(index, 'icon', '')}
                            disabled={!row?.icon}
                            sx={{
                              borderRadius: 999,
                              fontWeight: 600,
                              px: 1.25,
                              bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
                              color: (theme) => theme.palette.error.main,
                              '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.error.main, 0.2),
                              },
                            }}
                          >
                            Clear
                          </Button>
                          <input
                            ref={(node) => {
                              if (node) fileInputRefs.current[index] = node;
                            }}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(event) => handleIconUpload(index, event)}
                          />
                        </Stack>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Card>

          <TextField
            label="CTA label"
            value={content?.ctaLabel || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, ctaLabel: e.target.value }))}
            placeholder="Play CEO Message"
            fullWidth
          />
          <TextField
            label="CTA link (optional fallback if no video URL)"
            value={content?.ctaHref || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, ctaHref: e.target.value }))}
            fullWidth
          />

          <LoadingButton variant="contained" loading={submitting} onClick={() => onSave()} sx={{ alignSelf: 'flex-start' }}>
            Save CEO launch section
          </LoadingButton>
        </Stack>
      </Card>

      <HeroImageCard
        title="Video poster / thumbnail"
        description="Image shown behind the play button on the home page (CEO launch message)."
        saveLabel="Save poster image"
        heroFile={posterFile}
        heroUrl={posterUrl}
        heroSubmitting={posterSubmitting}
        onDrop={onPosterDrop}
        onDelete={onPosterDelete}
        onSave={onPosterSave}
        onClearOrRemove={onPosterClearOrRemove}
      />
      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => setIconToolOpen(false)}
        contextLabel={`CEO stat ${iconToolStatIndex + 1}`}
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={stats[iconToolStatIndex]?.icon || ''}
        onSelectIcon={(iconName) => {
          updateStat(iconToolStatIndex, 'icon', iconName);
          setIconToolOpen(false);
        }}
      />
    </Stack>
  );
}
