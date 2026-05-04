import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { ColorPaletteField } from './color-palette-field';
import { HexColorToolDrawer } from './hex-color-tool-drawer';

const CTA_LABEL_MAX_LENGTH = 32;
const CTA_BG_PRESETS = ['#D4F938', '#56C7DA', '#E32B24', '#1C4270', '#22C55E', '#FFAB00', '#7C3AED', '#111827'];
const CTA_TEXT_PRESETS = ['#1C252E', '#FFFFFF', '#111827', '#F9FAFB', '#0E223A', '#7A1714', '#065F46', '#B91C1C'];

/**
 * CTA settings card for hero button config.
 * Contains label, link, colors, and alignment fields.
 */
export function CtaButtonCard({ heroContent, setHeroContent }) {
  const [colorToolOpen, setColorToolOpen] = useState(false);
  const [colorToolTarget, setColorToolTarget] = useState('background');
  const [toolStartColor, setToolStartColor] = useState('#d4f938');
  const [toolEndColor, setToolEndColor] = useState('#1c252e');

  const ctaBackground = String(heroContent?.cta?.buttonColor || '').trim();
  const ctaText = String(heroContent?.cta?.buttonTextColor || '').trim();

  const setCtaField = (field, value) => {
    setHeroContent((prev) => ({
      ...prev,
      cta: { ...(prev.cta || {}), [field]: value },
    }));
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            CTA button
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Button label, link, optional colors, and horizontal alignment. Link target can be an in-app path{' '}
            <Box component="span" sx={{ fontFamily: 'monospace' }}>
              /learning
            </Box>{' '}
            or a full https URL.
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Button name"
              value={heroContent?.cta?.label || ''}
              onChange={(event) =>
                setHeroContent((prev) => ({
                  ...prev,
                  cta: { ...(prev.cta || {}), label: event.target.value },
                }))
              }
              inputProps={{ maxLength: CTA_LABEL_MAX_LENGTH }}
              fullWidth
              helperText={`${String(heroContent?.cta?.label || '').length}/${CTA_LABEL_MAX_LENGTH} characters`}
              placeholder="e.g. Begin with Free AI Fluency Program"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Button link"
              value={heroContent?.cta?.href || ''}
              onChange={(event) =>
                setHeroContent((prev) => ({
                  ...prev,
                  cta: { ...(prev.cta || {}), href: event.target.value },
                }))
              }
              fullWidth
              placeholder="/learning"
              helperText="Opens when the button is clicked."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="hero-cta-align-label">Button row alignment</InputLabel>
              <Select
                labelId="hero-cta-align-label"
                label="Button row alignment"
                value={heroContent?.cta?.align ?? ''}
                onChange={(event) =>
                  setHeroContent((prev) => ({
                    ...prev,
                    cta: { ...(prev.cta || {}), align: event.target.value },
                  }))
                }
              >
                <MenuItem value="">Default (left)</MenuItem>
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="center">Center</MenuItem>
                <MenuItem value="right">Right</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <ColorPaletteField
              label="Button background"
              value={ctaBackground}
              onChange={(value) => setCtaField('buttonColor', value)}
              presets={CTA_BG_PRESETS}
              onOpenGenerator={() => {
                setColorToolTarget('background');
                setToolStartColor(ctaBackground || '#d4f938');
                setToolEndColor(ctaText || '#1c252e');
                setColorToolOpen(true);
              }}
              generatorLabel="Generate Color"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ColorPaletteField
              label="Button text"
              value={ctaText}
              onChange={(value) => setCtaField('buttonTextColor', value)}
              presets={CTA_TEXT_PRESETS}
              onOpenGenerator={() => {
                setColorToolTarget('text');
                setToolStartColor(ctaText || '#1c252e');
                setToolEndColor(ctaBackground || '#d4f938');
                setColorToolOpen(true);
              }}
              generatorLabel="Generate Color"
            />
          </Grid>
        </Grid>

      </Stack>

      <HexColorToolDrawer
        open={colorToolOpen}
        onClose={() => setColorToolOpen(false)}
        startColor={toolStartColor}
        endColor={toolEndColor}
        onStartColorChange={(event) => setToolStartColor(event.target.value)}
        onEndColorChange={(event) => setToolEndColor(event.target.value)}
        onApplyHeadingColor={() =>
          setCtaField(colorToolTarget === 'background' ? 'buttonColor' : 'buttonTextColor', toolStartColor)
        }
        onApplyAccentColor={() =>
          setCtaField(colorToolTarget === 'background' ? 'buttonColor' : 'buttonTextColor', toolEndColor)
        }
        headingColor={ctaBackground}
        accentColor={ctaText}
        title="CTA Color Tool"
        description="Pick or generate colors, then apply to CTA background and text."
        startLabel="Background color"
        endLabel="Text color"
        applyStartLabel="Apply background"
        applyEndLabel="Apply text"
      />
    </Card>
  );
}
