import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { Upload } from 'src/components/upload';

/**
 * Hero image upload card for admin settings.
 * Keeps all hero background upload UI in one reusable component.
 */
export function HeroImageCard({
  title = 'Home hero background',
  description = 'Upload a custom background image for the public home hero.',
  saveLabel = 'Save hero image',
  heroFile,
  heroUrl,
  heroLoading,
  heroSubmitting,
  onDrop,
  onDelete,
  onSave,
  onClearOrRemove,
}) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        </Box>

        <Upload
          value={heroFile || heroUrl || null}
          onDrop={onDrop}
          onDelete={heroFile || heroUrl ? onDelete : undefined}
          sx={{
            '& > .MuiBox-root:first-of-type': {
              minHeight: 180,
              p: 2.5,
            },
          }}
          accept={{
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
          }}
          maxSize={5 * 1024 * 1024}
          disabled={heroLoading || heroSubmitting}
          helperText="Accepted formats: JPG, PNG, GIF, WEBP, SVG. Max 5 MB (auto-compressed on save if larger)."
        />

        <Stack direction="row" spacing={1.5}>
          <LoadingButton variant="contained" loading={heroSubmitting} onClick={onSave} disabled={!heroFile}>
            {saveLabel}
          </LoadingButton>

          <Button
            color="inherit"
            variant="outlined"
            onClick={onClearOrRemove}
            disabled={heroSubmitting || (!heroFile && !heroUrl)}
          >
            {heroFile ? 'Clear selected' : 'Remove current (use default)'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
