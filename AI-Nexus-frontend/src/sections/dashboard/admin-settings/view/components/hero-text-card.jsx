import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Editor } from 'src/components/editor';

const HERO_HEADLINE_MAX_LENGTH = 60;

/**
 * Hero text card for headline and rich description.
 * Separated to keep view page short and easier to read.
 */
export function HeroTextCard({ heroContent, onFieldChange }) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Hero text
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Main title and body copy on the home hero (the call-to-action button is configured in the next card).
          </Typography>
        </Box>

        <TextField
          label="Hero headline (main title)"
          value={heroContent.headline}
          onChange={(event) => onFieldChange('headline', event.target.value)}
          inputProps={{ maxLength: HERO_HEADLINE_MAX_LENGTH }}
          fullWidth
          helperText={`${String(heroContent.headline || '').length}/${HERO_HEADLINE_MAX_LENGTH} characters`}
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
