import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';

export function LearningAdvertiseTabSettingsCard({
  content,
  setContent,
  submitting,
  onSave,
}) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
            Learning Advertise Tab
          </Typography>
          <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
            Configure the fixed vertical promo tab on the Learning page (name shown on the tab and
            the link it opens).
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Tab name"
              value={content?.name || ''}
              onChange={(event) =>
                setContent((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="ISCAcademy Practical AI series"
              fullWidth
              helperText="Leave blank to hide the tab on the Learning page."
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Tab link"
              value={content?.link || ''}
              onChange={(event) =>
                setContent((prev) => ({ ...prev, link: event.target.value }))
              }
              placeholder="https://iscacademy.sg"
              fullWidth
              helperText="Opens in a new browser tab when clicked."
            />
          </Grid>
        </Grid>

        <Box>
          <LoadingButton variant="contained" loading={submitting} onClick={onSave}>
            Save Advertise Tab
          </LoadingButton>
        </Box>
      </Stack>
    </Card>
  );
}
