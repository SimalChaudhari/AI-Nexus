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
import { alpha } from '@mui/material/styles';

import { categoryIcons } from 'src/_mock/_category-icons';
import { Iconify } from 'src/components/iconify';
import { IconPickerDrawer } from './icon-picker-drawer';

export function EventAndStatsCard({
  heroContent,
  updateHeroStat,
  onStatIconSizeChange,
  onUploadStatIcon,
  uploadingStatIconIndex = null,
  visibleStatsCount,
  addVisibleStatRow,
  removeVisibleStatRow,
}) {
  const ICON_SIZE_OPTIONS = [16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 52, 56];
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconToolStatIndex, setIconToolStatIndex] = useState(0);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const fileInputRefs = useRef({});

  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () => availableCategoryIcons.filter((iconName) => iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())),
    [availableCategoryIcons, iconSearchQuery]
  );

  const openIconPicker = (index) => {
    setIconToolStatIndex(index);
    setIconSearchQuery('');
    setIconToolOpen(true);
  };

  const triggerUpload = (index) => {
    fileInputRefs.current[index]?.click();
  };

  const handleUpload = async (index, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadStatIcon) return;
    await onUploadStatIcon(index, file);
  };

  const statIconPreview = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return <Iconify icon="mingcute:apps-line" width={18} />;
    const isImagePath =
      /^https?:\/\//i.test(value) || value.startsWith('/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
    if (isImagePath) {
      return <Box component="img" src={value} alt="" sx={{ width: 18, height: 18, objectFit: 'contain' }} />;
    }
    return <Iconify icon={value} width={18} />;
  };

  return (
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
            onClick={addVisibleStatRow}
            disabled={visibleStatsCount >= 4}
            sx={{ borderRadius: 999 }}
          >
            Add
          </Button>
        </Stack>

        <Grid container spacing={1}>
          <Grid item xs={12} sm={5} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="hero-stats-icon-size-label">Icon size (px)</InputLabel>
              <Select
                labelId="hero-stats-icon-size-label"
                label="Icon size (px)"
                value={heroContent?.statIconSize ?? 26}
                onChange={(e) => onStatIconSizeChange?.(e.target.value)}
              >
                {ICON_SIZE_OPTIONS.map((size) => (
                  <MenuItem key={`hero-stat-icon-size-${size}`} value={size}>
                    {size}px
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Grid container spacing={1}>
          {[0, 1, 2, 3].slice(0, visibleStatsCount).map((i) => (
            <Grid item xs={12} md={6} key={`hero-stat-${i}`}>
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
                      {`Stat ${i + 1}`}
                    </Typography>
                    {visibleStatsCount > 1 ? (
                      <IconButton size="small" color="error" onClick={() => removeVisibleStatRow(i)}>
                        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                      </IconButton>
                    ) : null}
                  </Stack>

                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        size="small"
                        label="Label"
                        value={heroContent.stats[i]?.label || ''}
                        onChange={(e) => updateHeroStat(i, 'label', e.target.value)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        size="small"
                        label="Value"
                        value={heroContent.stats[i]?.value || ''}
                        onChange={(e) => updateHeroStat(i, 'value', e.target.value)}
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
                      {statIconPreview(heroContent.stats[i]?.icon)}
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => openIconPicker(i)}>
                      Icon
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => triggerUpload(i)}
                      disabled={uploadingStatIconIndex === i}
                    >
                      {uploadingStatIconIndex === i ? 'Uploading...' : 'Image'}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="soft"
                      onClick={() => updateHeroStat(i, 'icon', '')}
                      disabled={!heroContent.stats[i]?.icon}
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
                  </Stack>

                  <input
                    ref={(node) => {
                      if (node) fileInputRefs.current[i] = node;
                      else delete fileInputRefs.current[i];
                    }}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => handleUpload(i, event)}
                  />
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>

        <IconPickerDrawer
          open={iconToolOpen}
          onClose={() => setIconToolOpen(false)}
          contextLabel={`stat ${iconToolStatIndex + 1}`}
          searchQuery={iconSearchQuery}
          onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
          filteredIcons={filteredCategoryIcons}
          selectedIcon={heroContent.stats?.[iconToolStatIndex]?.icon || ''}
          onSelectIcon={(iconName) => {
            updateHeroStat(iconToolStatIndex, 'icon', iconName);
            setIconToolOpen(false);
          }}
        />
      </Stack>
    </Card>
  );
}
