import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import { toast } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import { appSettingsService } from 'src/services/app-settings.service';
import { courseService } from 'src/services/course.service';
import { PERSONA_OPTIONS } from 'src/constants/persona-options';

// ----------------------------------------------------------------------

export function AdminSettingsView() {
  const settings = useSettingsContext();
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoSubmitting, setLogoSubmitting] = useState(false);

  const [heroFile, setHeroFile] = useState(null);
  const [heroUrl, setHeroUrl] = useState('');
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroSubmitting, setHeroSubmitting] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [mappingSubmitting, setMappingSubmitting] = useState(false);
  const [courseOptions, setCourseOptions] = useState([]);
  const [personaMappings, setPersonaMappings] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(PERSONA_OPTIONS[0]?.value || '');

  const handleToggle = (field) => {
    settings.onUpdateField(field, !settings[field]);
  };

  const loadSettings = useCallback(async () => {
    try {
      setLogoLoading(true);
      setHeroLoading(true);
      const appSettings = await appSettingsService.getPublic();
      setLogoUrl(appSettings.logoUrl || '');
      setHeroUrl(appSettings.homeHeroImageUrl || '');
      const [mappingsResult, coursesResult] = await Promise.all([
        appSettingsService.getPersonaCourseMappings(),
        courseService.getAllCourses({ page: 1, limit: 500 }),
      ]);
      setPersonaMappings(mappingsResult || []);
      setCourseOptions(Array.isArray(coursesResult?.data) ? coursesResult.data : []);
    } catch (error) {
      toast.error(error?.message || 'Failed to load site settings');
    } finally {
      setLogoLoading(false);
      setHeroLoading(false);
      setCoursesLoading(false);
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
      const nextLogoUrl = updatedSettings.logoUrl || '';
      setLogoUrl(nextLogoUrl);
      if (typeof window !== 'undefined') {
        if (nextLogoUrl) {
          window.localStorage.setItem('site-logo-url', nextLogoUrl);
        } else {
          window.localStorage.removeItem('site-logo-url');
        }
        window.dispatchEvent(new CustomEvent('site-logo-updated', { detail: { logoUrl: nextLogoUrl } }));
      }
      setLogoFile(null);
      toast.success('Site logo updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload site logo');
    } finally {
      setLogoSubmitting(false);
    }
  };

  const handleDropHero = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) {
      setHeroFile(file);
    }
  }, []);

  const handleClearHeroSelection = () => {
    setHeroFile(null);
  };

  const handleUploadHero = async () => {
    if (!heroFile) {
      toast.error('Please select an image first');
      return;
    }

    try {
      setHeroSubmitting(true);
      const updatedSettings = await appSettingsService.uploadHomeHero(heroFile);
      setHeroUrl(updatedSettings.homeHeroImageUrl || '');
      setHeroFile(null);
      toast.success('Home hero background updated');
      if (typeof window !== 'undefined') {
        const next = updatedSettings.homeHeroImageUrl?.trim();
        if (next) {
          window.localStorage.setItem('public-home-hero-bg-url', next);
        } else {
          window.localStorage.removeItem('public-home-hero-bg-url');
        }
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to upload hero image');
    } finally {
      setHeroSubmitting(false);
    }
  };

  const handleRemoveHero = async () => {
    if (heroFile) {
      setHeroFile(null);
      return;
    }

    if (!heroUrl) return;

    try {
      setHeroSubmitting(true);
      const updatedSettings = await appSettingsService.removeHomeHero();
      setHeroUrl(updatedSettings.homeHeroImageUrl || '');
      toast.success('Home hero background removed (default image will show)');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('public-home-hero-bg-url');
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to remove hero image');
    } finally {
      setHeroSubmitting(false);
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
      const nextLogoUrl = updatedSettings.logoUrl || '';
      setLogoUrl(nextLogoUrl);
      if (typeof window !== 'undefined') {
        if (nextLogoUrl) {
          window.localStorage.setItem('site-logo-url', nextLogoUrl);
        } else {
          window.localStorage.removeItem('site-logo-url');
        }
        window.dispatchEvent(new CustomEvent('site-logo-updated', { detail: { logoUrl: nextLogoUrl } }));
      }
      toast.success('Site logo removed successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove site logo');
    } finally {
      setLogoSubmitting(false);
    }
  };

  const handleMappingCoursesChange = (persona, courses) => {
    const nextCourseIds = [...new Set((courses || []).map((row) => row.id).filter(Boolean))];
    setPersonaMappings((prev) => {
      const existingIndex = prev.findIndex((row) => row.persona === persona);
      if (existingIndex === -1) {
        return [...prev, { persona, courseIds: nextCourseIds }];
      }
      const cloned = [...prev];
      cloned[existingIndex] = { ...cloned[existingIndex], courseIds: nextCourseIds };
      return cloned;
    });
  };

  const handleSavePersonaMappings = async () => {
    try {
      setMappingSubmitting(true);
      const saved = await appSettingsService.updatePersonaCourseMappings(personaMappings);
      setPersonaMappings(saved || []);
      toast.success('Persona course mappings saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save persona course mappings');
    } finally {
      setMappingSubmitting(false);
    }
  };

  const selectedMapping = personaMappings.find((row) => row.persona === selectedPersona);
  const selectedCourses = (selectedMapping?.courseIds || [])
    .map((id) => courseOptions.find((course) => course.id === id))
    .filter(Boolean);
  const mappedPersonasCount = personaMappings.filter((row) => (row?.courseIds || []).length > 0).length;
  const selectedCoursesCount = selectedCourses.length;


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

  const renderHomeHeroSettings = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Home hero background
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Image behind the &quot;AI Nexus&quot; / &quot;Where AI Minds Connect&quot; section on the public home
            page. Wide landscape images (e.g. 1920×1080) work best. If none is set, the built-in default is used.
          </Typography>
        </Box>

        <Upload
          value={heroFile || heroUrl || null}
          onDrop={handleDropHero}
          onDelete={heroFile || heroUrl ? handleRemoveHero : undefined}
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
          helperText="Accepted formats: JPG, PNG, GIF, WEBP, SVG. Max size: 5 MB."
        />

        <Stack direction="row" spacing={1.5}>
          <LoadingButton
            variant="contained"
            loading={heroSubmitting}
            onClick={handleUploadHero}
            disabled={!heroFile}
          >
            Save hero image
          </LoadingButton>

          <Button
            color="inherit"
            variant="outlined"
            onClick={heroFile ? handleClearHeroSelection : handleRemoveHero}
            disabled={heroSubmitting || (!heroFile && !heroUrl)}
          >
            {heroFile ? 'Clear selected' : 'Remove current (use default)'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );

  const renderPersonaCourseMappings = (
    <Card
      sx={{
        p: 3,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        background: (theme) =>
          `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.neutral || theme.palette.grey[50]} 100%)`,
      }}
    >
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="h6" sx={{ mb: 0.75 }}>
            Persona Course Recommendations
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Configure which courses should be recommended for each persona on the Learning page.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap>
          <Chip
            color="primary"
            variant="soft"
            label={`Mapped personas: ${mappedPersonasCount}/${PERSONA_OPTIONS.length}`}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            color="warning"
            variant="soft"
            label={`Selected courses: ${selectedCoursesCount}`}
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        <Divider />

        <Autocomplete
          disablePortal
          options={PERSONA_OPTIONS}
          getOptionLabel={(option) => option?.label || ''}
          value={PERSONA_OPTIONS.find((opt) => opt.value === selectedPersona) || null}
          onChange={(_, option) => setSelectedPersona(option?.value || PERSONA_OPTIONS[0]?.value || '')}
          renderInput={(params) => <TextField {...params} label="Persona" helperText="Choose a persona profile" />}
        />

        <Autocomplete
          multiple
          disableCloseOnSelect
          options={courseOptions}
          loading={coursesLoading}
          getOptionLabel={(option) => option?.title || ''}
          value={selectedCourses}
          onChange={(_, next) => handleMappingCoursesChange(selectedPersona, next)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Recommended Courses"
              placeholder="Select one or more courses"
              helperText="These courses will be highlighted for selected persona in Learning groups."
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {coursesLoading ? <CircularProgress color="inherit" size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Changes are saved for all personas in one update.
          </Typography>
          <LoadingButton
            variant="contained"
            loading={mappingSubmitting}
            onClick={handleSavePersonaMappings}
            size="large"
          >
            Save Persona Mapping
          </LoadingButton>
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
        {renderHomeHeroSettings}
        {renderPersonaCourseMappings}
        {renderHeaderVisibility}
      </Stack>
    </DashboardContent>
  );
}

