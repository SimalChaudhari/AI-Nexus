import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
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
          <Typography variant="h6" sx={{ mb: 1 }}>
            Home Join Section
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Configure the final call-to-action section content on the home page.
          </Typography>
        </Box>

        <TextField
          label="Heading"
          value={joinContent.heading}
          onChange={(event) => setJoinContent((prev) => ({ ...prev, heading: event.target.value }))}
          fullWidth
        />

        <Stack spacing={0.75}>
          <Typography variant="subtitle2">Subtitle</Typography>
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
                },
              },
            }}
          />
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                p: 1,
                borderRadius: 1.5,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.neutral',
                width: '100%',
                minHeight: 56,
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
                <Iconify icon={joinContent.ctaIcon || defaultJoinIcon} width={22} />
              </Box>
              <Button
                variant="outlined"
                onClick={() => {
                  setIconSearchQuery('');
                  setIconToolOpen(true);
                }}
                sx={{ flex: 1 }}
              >
                Pick icon
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Button label"
              value={joinContent.ctaLabel}
              onChange={(event) => setJoinContent((prev) => ({ ...prev, ctaLabel: event.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
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
