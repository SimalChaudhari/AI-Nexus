import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { categoryIcons } from 'src/_mock/_category-icons';
import { Iconify } from 'src/components/iconify';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { ColorPaletteField } from './color-palette-field';
import { HexColorToolDrawer } from './hex-color-tool-drawer';
import { IconPickerDrawer } from './icon-picker-drawer';

const CTA_LABEL_MAX_LENGTH = 32;
const MAX_HERO_CTA_BUTTONS = 6;
const CTA_BG_PRESETS = ['#D4F938', '#56C7DA', '#E32B24', '#1C4270', '#22C55E', '#FFAB00', '#7C3AED', '#111827'];
const CTA_TEXT_PRESETS = ['#1C252E', '#FFFFFF', '#111827', '#F9FAFB', '#0E223A', '#7A1714', '#065F46', '#B91C1C'];

const emptyCtaRow = () => ({ label: '', href: '', icon: '', buttonColor: '', buttonTextColor: '' });

function buildCtaRows(heroContent) {
  const primary = {
    label: heroContent?.cta?.label || '',
    href: heroContent?.cta?.href || '',
    icon: heroContent?.cta?.icon || '',
    buttonColor: heroContent?.cta?.buttonColor || '',
    buttonTextColor: heroContent?.cta?.buttonTextColor || '',
  };
  const secondary = Array.isArray(heroContent?.secondaryCtas) ? heroContent.secondaryCtas : [];
  const rows = [
    primary,
    ...secondary.map((row) => ({
      label: row?.label || '',
      href: row?.href || '',
      icon: row?.icon || '',
      buttonColor: row?.buttonColor || '',
      buttonTextColor: row?.buttonTextColor || '',
    })),
  ];

  return rows.length ? rows : [emptyCtaRow()];
}

function applyCtaRows(prev, rows) {
  const safeRows = rows.length ? rows : [emptyCtaRow()];
  const [first, ...rest] = safeRows;
  return {
    ...prev,
    cta: {
      ...(prev.cta || {}),
      label: first?.label || '',
      href: first?.href || '',
      icon: first?.icon || '',
      buttonColor: first?.buttonColor || '',
      buttonTextColor: first?.buttonTextColor || '',
    },
    secondaryCtas: rest.map((row) => ({
      label: row?.label || '',
      href: row?.href || '',
      icon: row?.icon || '',
      variant: 'outline-navy',
      buttonColor: row?.buttonColor || '',
      buttonTextColor: row?.buttonTextColor || '',
    })),
  };
}

/**
 * Hero CTA buttons — each row has label, link, icon, and optional colors.
 */
export function CtaButtonCard({ heroContent, setHeroContent }) {
  const [colorToolOpen, setColorToolOpen] = useState(false);
  const [colorToolRowIndex, setColorToolRowIndex] = useState(0);
  const [colorToolTarget, setColorToolTarget] = useState('background');
  const [toolStartColor, setToolStartColor] = useState('#E32B24');
  const [toolEndColor, setToolEndColor] = useState('#ffffff');
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconToolRowIndex, setIconToolRowIndex] = useState(0);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const ctaRows = useMemo(() => buildCtaRows(heroContent), [heroContent]);
  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () => availableCategoryIcons.filter((iconName) => iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())),
    [availableCategoryIcons, iconSearchQuery]
  );

  const updateRow = (index, field, value) => {
    setHeroContent((prev) => {
      const rows = buildCtaRows(prev);
      const next = [...rows];
      while (next.length <= index) next.push(emptyCtaRow());
      next[index] = { ...next[index], [field]: value };
      return applyCtaRows(prev, next);
    });
  };

  const addRow = () => {
    setHeroContent((prev) => {
      const rows = buildCtaRows(prev);
      if (rows.length >= MAX_HERO_CTA_BUTTONS) return prev;
      return applyCtaRows(prev, [...rows, emptyCtaRow()]);
    });
  };

  const removeRow = (index) => {
    if (index === 0) return;
    setHeroContent((prev) => {
      const rows = buildCtaRows(prev).filter((_, i) => i !== index);
      return applyCtaRows(prev, rows.length ? rows : [emptyCtaRow()]);
    });
  };

  const openColorTool = (index, target) => {
    const row = ctaRows[index] || emptyCtaRow();
    setColorToolRowIndex(index);
    setColorToolTarget(target);
    setToolStartColor(
      target === 'background' ? row.buttonColor || (index === 0 ? '#E32B24' : '#ffffff') : row.buttonTextColor || (index === 0 ? '#ffffff' : '#1C4270')
    );
    setToolEndColor(
      target === 'background' ? row.buttonTextColor || (index === 0 ? '#ffffff' : '#1C4270') : row.buttonColor || (index === 0 ? '#E32B24' : '#ffffff')
    );
    setColorToolOpen(true);
  };

  const applyToolColor = (field, value) => {
    updateRow(colorToolRowIndex, field, value);
  };
  const openIconTool = (index) => {
    setIconToolRowIndex(index);
    setIconSearchQuery('');
    setIconToolOpen(true);
  };

  const activeRow = ctaRows[colorToolRowIndex] || emptyCtaRow();

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
            CTA buttons
          </Typography>
          <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
            Add up to {MAX_HERO_CTA_BUTTONS} buttons. Each button can have its own background and text color. Leave
            colors empty to use the default style (red primary, navy outline).
          </Typography>
        </Box>

        <Stack spacing={2}>
          {ctaRows.map((row, index) => (
            <Box
              key={`hero-cta-row-${index}`}
              sx={{
                p: 2,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: index === 0 ? 'action.hover' : 'background.paper',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2">
                  {index === 0 ? 'Button 1 (primary)' : `Button ${index + 1}`}
                </Typography>
                {index > 0 ? (
                  <IconButton
                    size="small"
                    color="error"
                    aria-label={`Remove button ${index + 1}`}
                    onClick={() => removeRow(index)}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                  </IconButton>
                ) : null}
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Button name"
                    value={row.label}
                    onChange={(event) => updateRow(index, 'label', event.target.value)}
                    inputProps={{ maxLength: CTA_LABEL_MAX_LENGTH }}
                    fullWidth
                    helperText={`${String(row.label || '').length}/${CTA_LABEL_MAX_LENGTH} characters`}
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    label="Button link"
                    value={row.href}
                    onChange={(event) => updateRow(index, 'href', event.target.value)}
                    fullWidth
                    placeholder={index === 0 ? '#join-movement' : '#funding-eligibility'}
                    helperText="Hash link, in-app path, or https URL."
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.neutral',
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 1.2,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'background.paper',
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        flexShrink: 0,
                      }}
                    >
                      {row.icon ? <Iconify icon={row.icon} width={22} /> : <Iconify icon="mingcute:apps-line" width={22} />}
                    </Box>
                    <Button variant="outlined" onClick={() => openIconTool(index)} sx={{ flex: 1 }}>
                      Pick icon
                    </Button>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <ColorPaletteField
                    label="Background color"
                    value={row.buttonColor || ''}
                    onChange={(value) => updateRow(index, 'buttonColor', value)}
                    presets={CTA_BG_PRESETS}
                    onOpenGenerator={() => openColorTool(index, 'background')}
                    generatorLabel="Generate Color"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ColorPaletteField
                    label="Text color"
                    value={row.buttonTextColor || ''}
                    onChange={(value) => updateRow(index, 'buttonTextColor', value)}
                    presets={CTA_TEXT_PRESETS}
                    onOpenGenerator={() => openColorTool(index, 'text')}
                    generatorLabel="Generate Color"
                  />
                </Grid>
              </Grid>
            </Box>
          ))}
        </Stack>

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={addRow}
          disabled={ctaRows.length >= MAX_HERO_CTA_BUTTONS}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add button
        </Button>
      </Stack>

      <HexColorToolDrawer
        open={colorToolOpen}
        onClose={() => setColorToolOpen(false)}
        startColor={toolStartColor}
        endColor={toolEndColor}
        onStartColorChange={(event) => setToolStartColor(event.target.value)}
        onEndColorChange={(event) => setToolEndColor(event.target.value)}
        onApplyHeadingColor={() =>
          applyToolColor(colorToolTarget === 'background' ? 'buttonColor' : 'buttonTextColor', toolStartColor)
        }
        onApplyAccentColor={() =>
          applyToolColor(colorToolTarget === 'background' ? 'buttonColor' : 'buttonTextColor', toolEndColor)
        }
        headingColor={activeRow.buttonColor || '#E32B24'}
        accentColor={activeRow.buttonTextColor || '#ffffff'}
        title="CTA Color Tool"
        description={`Pick colors for button ${colorToolRowIndex + 1}.`}
        startLabel="Background color"
        endLabel="Text color"
        applyStartLabel="Apply background"
        applyEndLabel="Apply text"
      />

      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => setIconToolOpen(false)}
        contextLabel={`button ${iconToolRowIndex + 1}`}
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={ctaRows[iconToolRowIndex]?.icon || ''}
        onSelectIcon={(iconName) => {
          updateRow(iconToolRowIndex, 'icon', iconName);
          setIconToolOpen(false);
        }}
      />
    </Card>
  );
}
