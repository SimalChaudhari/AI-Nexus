import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

const CTA_LABEL_MAX_LENGTH = 32;

/**
 * CTA settings card for hero button config.
 * Contains label, link, colors, and alignment fields.
 */
export function CtaButtonCard({ heroContent, setHeroContent }) {
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
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12} md={6}>
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
            <TextField
              label="Button background (hex)"
              value={heroContent?.cta?.buttonColor || ''}
              onChange={(event) =>
                setHeroContent((prev) => ({
                  ...prev,
                  cta: { ...(prev.cta || {}), buttonColor: event.target.value },
                }))
              }
              fullWidth
              placeholder="#d4f938"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Button text (hex)"
              value={heroContent?.cta?.buttonTextColor || ''}
              onChange={(event) =>
                setHeroContent((prev) => ({
                  ...prev,
                  cta: { ...(prev.cta || {}), buttonTextColor: event.target.value },
                }))
              }
              fullWidth
              placeholder="#1a1a1a"
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
        </Grid>
      </Stack>
    </Card>
  );
}
