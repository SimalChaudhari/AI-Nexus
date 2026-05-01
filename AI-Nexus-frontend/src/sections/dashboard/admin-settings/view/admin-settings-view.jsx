import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import { toast } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import { appSettingsService } from 'src/services/app-settings.service';
import { HeroTextCard } from './components/hero-text-card';
import { HeroImageCard } from './components/hero-image-card';
import { CtaButtonCard } from './components/cta-button-card';
import { EventAndStatsCard } from './components/event-and-stats-card';

export function AdminSettingsView() {
  const navigate = useNavigate();
  const { section } = useParams();
  const settings = useSettingsContext();
  const [activeSection, setActiveSection] = useState('logo');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoSubmitting, setLogoSubmitting] = useState(false);

  const [heroFile, setHeroFile] = useState(null);
  const [heroUrl, setHeroUrl] = useState('');
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroSubmitting, setHeroSubmitting] = useState(false);
  const [heroContentSubmitting, setHeroContentSubmitting] = useState(false);
  const emptyHeroStatsRow = () => ({ value: '', label: '', icon: '' });
  const emptyHeroEventSlot = () => ({ startDateLabel: '', startDate: '', startTimeLabel: '', startTime: '' });
  const [emojiPickerStatIndex, setEmojiPickerStatIndex] = useState(null);
  const [visibleStatsCount, setVisibleStatsCount] = useState(0);

  const [heroContent, setHeroContent] = useState({
    headline: '',
    description: '',
    cta: {
      label: '',
      href: '',
      buttonColor: '',
      buttonTextColor: '',
      align: '',
    },
    event: emptyHeroEventSlot(),
    stats: [emptyHeroStatsRow(), emptyHeroStatsRow(), emptyHeroStatsRow()],
  });

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
      const remoteHero = appSettings.homeHeroContent || {};
      const rawStats = Array.isArray(remoteHero.stats) ? remoteHero.stats : [];
      const statsThree = [0, 1, 2].map((i) => ({
        value: rawStats[i]?.value != null ? String(rawStats[i].value) : '',
        label: rawStats[i]?.label != null ? String(rawStats[i].label) : '',
        icon: rawStats[i]?.icon != null ? String(rawStats[i].icon) : '',
      }));
      const statsUsedCount = Math.max(1, statsThree.filter((s) => s.label || s.value || s.icon).length);
      setHeroContent({
        headline: remoteHero?.headline || '',
        description: remoteHero?.description || '',
        cta: {
          label: remoteHero?.cta?.label || '',
          href: remoteHero?.cta?.href || '',
          buttonColor: remoteHero?.cta?.buttonColor || '',
          buttonTextColor: remoteHero?.cta?.buttonTextColor || '',
          align: remoteHero?.cta?.align || '',
        },
        event: {
          startDateLabel: remoteHero?.event?.startDateLabel || '',
          startDate: remoteHero?.event?.startDate || '',
          startTimeLabel: remoteHero?.event?.startTimeLabel || '',
          startTime: remoteHero?.event?.startTime || '',
        },
        stats: statsThree,
      });
      setVisibleStatsCount(statsUsedCount);
    } catch (error) {
      toast.error(error?.message || 'Failed to load site settings');
    } finally {
      setLogoLoading(false);
      setHeroLoading(false);
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

  const updateHeroField = (field, value) => {
    setHeroContent((prev) => ({ ...prev, [field]: value }));
  };

  const updateHeroEventField = (field, value) => {
    setHeroContent((prev) => ({ ...prev, event: { ...(prev.event || {}), [field]: value } }));
  };

  const updateHeroStat = (index, key, value) => {
    setHeroContent((prev) => {
      const stats = [...(prev.stats || [])];
      while (stats.length < 3) stats.push(emptyHeroStatsRow());
      stats[index] = { ...stats[index], [key]: value };
      return { ...prev, stats };
    });
  };
  const addVisibleStatRow = () => setVisibleStatsCount((prev) => Math.min(3, prev + 1));
  const removeVisibleStatRow = (index) => {
    setHeroContent((prev) => {
      const stats = [...(prev.stats || [])];
      stats[index] = emptyHeroStatsRow();
      return { ...prev, stats };
    });
    setVisibleStatsCount((prev) => Math.max(1, prev - 1));
  };

  const openEmojiPicker = (index) => setEmojiPickerStatIndex(index);
  const closeEmojiPicker = () => setEmojiPickerStatIndex(null);
  const chooseStatEmoji = (emoji) => {
    if (emojiPickerStatIndex == null) return;
    updateHeroStat(emojiPickerStatIndex, 'icon', emoji);
    setEmojiPickerStatIndex(null);
  };

  const handleSaveHeroContent = async () => {
    try {
      setHeroContentSubmitting(true);
      const payload = {
        headline: heroContent.headline,
        description: heroContent.description,
        cta: {
          label: heroContent?.cta?.label || '',
          href: heroContent?.cta?.href || '',
          buttonColor: heroContent?.cta?.buttonColor || '',
          buttonTextColor: heroContent?.cta?.buttonTextColor || '',
          align: heroContent?.cta?.align || '',
        },
        event: {
          startDateLabel: heroContent?.event?.startDateLabel || '',
          startDate: heroContent?.event?.startDate || '',
          startTimeLabel: heroContent?.event?.startTimeLabel || '',
          startTime: heroContent?.event?.startTime || '',
        },
        stats: (heroContent.stats || []).map((row) => ({
          value: row?.value || '',
          label: row?.label || '',
          icon: row?.icon || '',
        })),
      };
      const updated = await appSettingsService.updateHomeHeroContent(payload);
      const next = updated?.homeHeroContent;
      if (next && typeof next === 'object') {
        const nextStatsRaw = Array.isArray(next.stats) ? next.stats : [];
        const nextStatsThree = [0, 1, 2].map((i) => ({
          value: nextStatsRaw[i]?.value != null ? String(nextStatsRaw[i].value) : '',
          label: nextStatsRaw[i]?.label != null ? String(nextStatsRaw[i].label) : '',
          icon: nextStatsRaw[i]?.icon != null ? String(nextStatsRaw[i].icon) : '',
        }));
        setHeroContent({
          headline: next.headline || '',
          description: next.description || '',
          cta: {
            label: next?.cta?.label || '',
            href: next?.cta?.href || '',
            buttonColor: next?.cta?.buttonColor || '',
            buttonTextColor: next?.cta?.buttonTextColor || '',
            align: next?.cta?.align || '',
          },
          event: {
            startDateLabel: next?.event?.startDateLabel || '',
            startDate: next?.event?.startDate || '',
            startTimeLabel: next?.event?.startTimeLabel || '',
            startTime: next?.event?.startTime || '',
          },
          stats: nextStatsThree,
        });
        setVisibleStatsCount(Math.max(1, nextStatsThree.filter((s) => s.label || s.value || s.icon).length));
      }
      toast.success('Home hero content updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update hero content');
    } finally {
      setHeroContentSubmitting(false);
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

  const sectionCards = [
    {
      key: 'logo',
      badge: 'L',
      title: 'Site Logo',
      description: 'Manage public header logo image.',
    },
    {
      key: 'hero',
      badge: 'H',
      title: 'Hero',
      description: 'Manage hero background and content together.',
    },
    {
      key: 'header-visibility',
      badge: 'V',
      title: 'Header Visibility',
      description: 'Toggle top bar icons visibility.',
    },
  ];

  const validSectionKeys = ['logo', 'hero', 'header-visibility'];

  useEffect(() => {
    if (!section) {
      setActiveSection('logo');
      return;
    }
    if (section === 'hero-background' || section === 'hero-content') {
      navigate(paths.admin.settingsSection('hero'), { replace: true });
      return;
    }
    if (!validSectionKeys.includes(section)) {
      navigate(paths.admin.settingsSection('logo'), { replace: true });
      return;
    }
    setActiveSection(section);
  }, [section, navigate]);

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
    <HeroImageCard
      heroFile={heroFile}
      heroUrl={heroUrl}
      heroLoading={heroLoading}
      heroSubmitting={heroSubmitting}
      onDrop={handleDropHero}
      onDelete={handleRemoveHero}
      onSave={handleUploadHero}
      onClearOrRemove={heroFile ? handleClearHeroSelection : handleRemoveHero}
    />
  );

  const renderHomeHeroContentSettings = (
    <Stack spacing={3}>
      <HeroTextCard heroContent={heroContent} onFieldChange={updateHeroField} />
      <EventAndStatsCard
        heroContent={heroContent}
        updateHeroEventField={updateHeroEventField}
        updateHeroStat={updateHeroStat}
        visibleStatsCount={visibleStatsCount}
        addVisibleStatRow={addVisibleStatRow}
        removeVisibleStatRow={removeVisibleStatRow}
        emojiPickerStatIndex={emojiPickerStatIndex}
        openEmojiPicker={openEmojiPicker}
        closeEmojiPicker={closeEmojiPicker}
        chooseStatEmoji={chooseStatEmoji}
      />
      <CtaButtonCard heroContent={heroContent} setHeroContent={setHeroContent} />

      <Box>
        <LoadingButton variant="contained" loading={heroContentSubmitting} onClick={handleSaveHeroContent}>
          Save hero content
        </LoadingButton>
      </Box>
    </Stack>
  );

  const renderSectionSwitcher = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Grid container spacing={2}>
          {sectionCards.map((section) => {
            const isActive = activeSection === section.key;
            return (
              <Grid item xs={12} sm={6} md={3} key={section.key}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(paths.admin.settingsSection(section.key))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(paths.admin.settingsSection(section.key));
                    }
                  }}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: (theme) =>
                      `1px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
                    bgcolor: (theme) =>
                      isActive ? theme.palette.action.selected : theme.palette.background.paper,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.75 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: isActive ? 'primary.main' : 'text.secondary',
                        bgcolor: isActive ? 'primary.lighter' : 'action.hover',
                      }}
                    >
                      {section.badge}
                    </Box>
                    <Typography variant="subtitle2">{section.title}</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {section.description}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
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
        {renderSectionSwitcher}
        {activeSection === 'logo' && renderLogoSettings}
        {activeSection === 'hero' && (
          <Stack spacing={3}>
            {renderHomeHeroSettings}
            {renderHomeHeroContentSettings}
          </Stack>
        )}
        {activeSection === 'header-visibility' && renderHeaderVisibility}
      </Stack>
    </DashboardContent>
  );
}

