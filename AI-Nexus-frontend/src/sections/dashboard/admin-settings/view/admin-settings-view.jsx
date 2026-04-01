import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import { toast } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import { appSettingsService } from 'src/services/app-settings.service';

// ----------------------------------------------------------------------

export function AdminSettingsView() {
  const settings = useSettingsContext();
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoSubmitting, setLogoSubmitting] = useState(false);

  const handleToggle = (field) => {
    settings.onUpdateField(field, !settings[field]);
  };

  const loadSettings = useCallback(async () => {
    try {
      setLogoLoading(true);
      const appSettings = await appSettingsService.getPublic();
      setLogoUrl(appSettings.logoUrl || '');
    } catch (error) {
      toast.error(error?.message || 'Failed to load site logo');
    } finally {
      setLogoLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleDropLogo = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) {
      setLogoFile(file);
    }
  }, []);

  const handleClearSelection = () => {
    setLogoFile(null);
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      toast.error('Please select a logo first');
      return;
    }

    try {
      setLogoSubmitting(true);
      const updatedSettings = await appSettingsService.uploadLogo(logoFile);
      setLogoUrl(updatedSettings.logoUrl || '');
      setLogoFile(null);
      toast.success('Site logo updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload site logo');
    } finally {
      setLogoSubmitting(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (logoFile) {
      setLogoFile(null);
      return;
    }

    if (!logoUrl) return;

    try {
      setLogoSubmitting(true);
      const updatedSettings = await appSettingsService.removeLogo();
      setLogoUrl(updatedSettings.logoUrl || '');
      toast.success('Site logo removed successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove site logo');
    } finally {
      setLogoSubmitting(false);
    }
  };


  const headerVisibilityOptions = [
    {
      field: 'headerWorkspaces',
      title: 'Workspaces',
      description: 'Show/hide workspace selector (Team 1, etc.)',
    },
    {
      field: 'headerLocalization',
      title: 'Language Selector',
      description: 'Show/hide language selection icon',
    },
    {
      field: 'headerNotifications',
      title: 'Notifications',
      description: 'Show/hide notifications bell icon',
    },
    {
      field: 'headerContacts',
      title: 'Contacts',
      description: 'Show/hide contacts icon',
    },
    {
      field: 'headerSettings',
      title: 'Settings',
      description: 'Show/hide settings gear icon',
    },
    {
      field: 'headerAccount',
      title: 'Account',
      description: 'Show/hide account/avatar icon',
    },
  ];

  const renderHeaderVisibility = (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Header Visibility
      </Typography>

      <Grid container spacing={3}>
        {headerVisibilityOptions.map((option) => (
          <Grid key={option.field} item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                height: '100%',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={settings[option.field] ?? false}
                    onChange={() => handleToggle(option.field)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2">{option.title}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {option.description}
                    </Typography>
                  </Box>
                }
                sx={{ width: '100%', m: 0 }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );

  const renderLogoSettings = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Site Logo
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Upload a logo for the public header. The file is stored in the backend assets folder and
            used dynamically on the frontend.
          </Typography>
        </Box>

        <Upload
          value={logoFile || logoUrl || null}
          onDrop={handleDropLogo}
          onDelete={logoFile || logoUrl ? handleRemoveLogo : undefined}
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
          disabled={logoLoading || logoSubmitting}
          helperText="Accepted formats: JPG, PNG, GIF, WEBP, SVG. Max size: 5 MB."
        />

        <Stack direction="row" spacing={1.5}>
          <LoadingButton
            variant="contained"
            loading={logoSubmitting}
            onClick={handleUploadLogo}
            disabled={!logoFile}
          >
            Save Logo
          </LoadingButton>

          <Button
            color="inherit"
            variant="outlined"
            onClick={logoFile ? handleClearSelection : handleRemoveLogo}
            disabled={logoSubmitting || (!logoFile && !logoUrl)}
          >
            {logoFile ? 'Clear Selected' : 'Remove Current Logo'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Admin Settings"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Settings' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        {renderLogoSettings}
        {renderHeaderVisibility}
      </Stack>
    </DashboardContent>
  );
}

