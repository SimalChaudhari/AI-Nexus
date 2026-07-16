import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { Editor } from 'src/components/editor';
import { Upload } from 'src/components/upload';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';

const HERO_HEADLINE_MAX_LENGTH = 60;

/**
 * Hero text card for headline and rich description.
 * Separated to keep view page short and easier to read.
 */
export function HeroTextCard({
  heroContent,
  onFieldChange,
  badgeLogoFile,
  badgeLogoSubmitting = false,
  onDropBadgeLogo,
  onSaveBadgeLogo,
  onRemoveBadgeLogo,
  onClearBadgeLogoSelection,
}) {
  const badgeLogoUrl = heroContent?.badgeLogoUrl || '';

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
            Hero text
          </Typography>
          <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
            Main title and body copy on the home hero (the call-to-action button is configured in the next card).
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Hero badge logo
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
            Replaces the eyebrow text above the headline. Upload your brand logo (e.g. ISCA AI Nexus Learning).
          </Typography>

          <Upload
            value={badgeLogoFile || badgeLogoUrl || null}
            onDrop={onDropBadgeLogo}
            onDelete={badgeLogoFile || badgeLogoUrl ? onRemoveBadgeLogo : undefined}
            sx={{
              '& > .MuiBox-root:first-of-type': {
                minHeight: 120,
                p: 2,
              },
            }}
            accept={{
              'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
            }}
            maxSize={5 * 1024 * 1024}
            disabled={badgeLogoSubmitting}
            helperText="Accepted formats: JPG, PNG, GIF, WEBP, SVG. Max size: 5 MB."
          />

          <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
            <LoadingButton
              variant="contained"
              loading={badgeLogoSubmitting}
              onClick={onSaveBadgeLogo}
              disabled={!badgeLogoFile}
            >
              Save badge logo
            </LoadingButton>

            <Button
              color="inherit"
              variant="outlined"
              onClick={badgeLogoFile ? onClearBadgeLogoSelection : onRemoveBadgeLogo}
              disabled={badgeLogoSubmitting || (!badgeLogoFile && !badgeLogoUrl)}
            >
              {badgeLogoFile ? 'Clear selected' : 'Remove current logo'}
            </Button>
          </Stack>
        </Box>

        <TextField
          label="Hero headline (line 1)"
          value={heroContent.headline}
          onChange={(event) => onFieldChange('headline', event.target.value)}
          inputProps={{ maxLength: HERO_HEADLINE_MAX_LENGTH }}
          fullWidth
          helperText={`${String(heroContent.headline || '').length}/${HERO_HEADLINE_MAX_LENGTH} characters`}
          placeholder="e.g. AI Fluency for"
        />

        <TextField
          label="Hero headline accent (line 2)"
          value={heroContent.headlineAccent || ''}
          onChange={(event) => onFieldChange('headlineAccent', event.target.value)}
          inputProps={{ maxLength: HERO_HEADLINE_MAX_LENGTH }}
          fullWidth
          placeholder="e.g. the Future of Business"
        />
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Hero description (rich text)
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            Format with the toolbar below.
          </Typography>
          <Editor
            value={heroContent.description}
            onChange={(value) => onFieldChange('description', value)}
            placeholder="Write hero description..."
            editable
            slotProps={{ wrap: { sx: { minHeight: 220 } } }}
          />
        </Box>
      </Stack>
    </Card>
  );
}
