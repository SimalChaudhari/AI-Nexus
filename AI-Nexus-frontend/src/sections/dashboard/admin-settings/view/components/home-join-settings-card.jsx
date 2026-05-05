import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { IconPickerDrawer } from './icon-picker-drawer';

export function HomeJoinSettingsCard({ joinContent, setJoinContent, joinContentSubmitting, onSave, defaultJoinIcon }) {
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () => availableCategoryIcons.filter((iconName) => iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())),
    [availableCategoryIcons, iconSearchQuery]
  );

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
            Home Join Section
          </Typography>
          <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
            Configure the final call-to-action section content on the home page.
          </Typography>
        </Box>

        <Box
          sx={(theme) => ({
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.neutral,
          })}
        >
          <TextField
            label="Heading"
            value={joinContent.heading}
            onChange={(event) => setJoinContent((prev) => ({ ...prev, heading: event.target.value }))}
            fullWidth
          />
        </Box>

        <Stack
          spacing={0.75}
          sx={(theme) => ({
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.neutral,
          })}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Subtitle
          </Typography>
          <Editor
            value={joinContent.subtitle}
            onChange={(value) => setJoinContent((prev) => ({ ...prev, subtitle: value }))}
            placeholder="Write join section subtitle..."
            editable
            slotProps={{
              wrap: {
                sx: {
                  minHeight: 170,
                  borderRadius: 1.5,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper',
                },
              },
            }}
          />
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Button label"
              value={joinContent.ctaLabel}
              onChange={(event) => setJoinContent((prev) => ({ ...prev, ctaLabel: event.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setIconSearchQuery('');
                        setIconToolOpen(true);
                      }}
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: 'primary.main',
                        color: 'common.white',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      <Iconify icon={joinContent.ctaIcon || defaultJoinIcon} width={18} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Button URL"
              value={joinContent.ctaHref}
              onChange={(event) => setJoinContent((prev) => ({ ...prev, ctaHref: event.target.value }))}
              fullWidth
              placeholder="https://example.com"
            />
          </Grid>
        </Grid>

        <Box>
          <LoadingButton variant="contained" loading={joinContentSubmitting} onClick={onSave}>
            Save join section
          </LoadingButton>
        </Box>

        <IconPickerDrawer
          open={iconToolOpen}
          onClose={() => setIconToolOpen(false)}
          contextLabel="join section button"
          searchQuery={iconSearchQuery}
          onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
          filteredIcons={filteredCategoryIcons}
          selectedIcon={joinContent.ctaIcon || defaultJoinIcon}
          onSelectIcon={(iconName) => {
            setJoinContent((prev) => ({ ...prev, ctaIcon: iconName }));
            setIconToolOpen(false);
          }}
        />
      </Stack>
    </Card>
  );
}
