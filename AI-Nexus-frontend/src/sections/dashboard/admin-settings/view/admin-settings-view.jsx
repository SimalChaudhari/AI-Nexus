import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Editor } from 'src/components/editor';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import { appSettingsService } from 'src/services/app-settings.service';
import { categoryIcons } from 'src/_mock/_category-icons';
import { HeroTextCard } from './components/hero-text-card';
import { HeroImageCard } from './components/hero-image-card';
import { CtaButtonCard } from './components/cta-button-card';
import { EventAndStatsCard } from './components/event-and-stats-card';
import { ColorPaletteField } from './components/color-palette-field';
import { HomeCardItem } from './components/home-card-item';
import { HexColorToolDrawer } from './components/hex-color-tool-drawer';
import { IconPickerDrawer } from './components/icon-picker-drawer';
import { HomeJoinSettingsCard } from './components/home-join-settings-card';

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
  const [cardsContentSubmitting, setCardsContentSubmitting] = useState(false);
  const [joinContentSubmitting, setJoinContentSubmitting] = useState(false);
  const [pendingScrollCardIndex, setPendingScrollCardIndex] = useState(null);
  const HOME_CARDS_MAX = 12;
  const DEFAULT_JOIN_CONTENT = {
    heading: 'Ready to Join the AI Revolution?',
    subtitle:
      'Connect with the brightest AI minds, learn cutting-edge techniques, and build the future together.',
    ctaLabel: 'Get Started Now',
    ctaHref: '',
    ctaIcon: 'mingcute:arrow-right-line',
  };
  const homeCardRefs = useRef({});
  const [colorToolOpen, setColorToolOpen] = useState(false);
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconToolCardIndex, setIconToolCardIndex] = useState(0);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [generatorStartColor, setGeneratorStartColor] = useState('#9b2a77');
  const [generatorEndColor, setGeneratorEndColor] = useState('#57c785');
  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () => availableCategoryIcons.filter((iconName) => iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())),
    [availableCategoryIcons, iconSearchQuery]
  );

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
  const defaultCardIcons = ['mingcute:user-group-line', 'mingcute:flash-line', 'mingcute:git-branch-line'];
  const getDefaultCardIcon = (index) => defaultCardIcons[index] || 'mingcute:apps-line';
  const emptyHomeCard = (icon = '') => ({ icon, title: '', description: '' });
  const [cardsContent, setCardsContent] = useState({
    heading: 'Powered by',
    headingAccent: 'Artificial Intelligence',
    headingColor: '',
    headingAccentColor: '',
    subtitle: 'Experience the future of community learning with AI-driven features that adapt to your needs',
    cards: [
      emptyHomeCard(defaultCardIcons[0]),
      emptyHomeCard(defaultCardIcons[1]),
      emptyHomeCard(defaultCardIcons[2]),
    ],
  });
  const [joinContent, setJoinContent] = useState(DEFAULT_JOIN_CONTENT);

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
      const remoteCards = appSettings.homeCardsContent || {};
      const remoteCardsRows = Array.isArray(remoteCards?.cards) ? remoteCards.cards : [];
      const normalizedCards = (
        remoteCardsRows.length
          ? remoteCardsRows
          : [emptyHomeCard(getDefaultCardIcon(0)), emptyHomeCard(getDefaultCardIcon(1)), emptyHomeCard(getDefaultCardIcon(2))]
      )
        .slice(0, HOME_CARDS_MAX)
        .map((card, i) => ({
          icon: String(card?.icon || getDefaultCardIcon(i) || '').trim(),
          title: String(card?.title || '').trim(),
          description: String(card?.description || '').trim(),
        }));
      setCardsContent({
        heading: String(remoteCards?.heading || 'Powered by').trim(),
        headingAccent: String(remoteCards?.headingAccent || 'Artificial Intelligence').trim(),
        headingColor: String(remoteCards?.headingColor || '').trim(),
        headingAccentColor: String(remoteCards?.headingAccentColor || '').trim(),
        subtitle: String(
          remoteCards?.subtitle ||
            'Experience the future of community learning with AI-driven features that adapt to your needs'
        ).trim(),
        cards: normalizedCards,
      });
      const remoteJoin = appSettings.homeJoinContent || {};
      setJoinContent({
        heading: String(remoteJoin?.heading || DEFAULT_JOIN_CONTENT.heading).trim(),
        subtitle: String(remoteJoin?.subtitle || DEFAULT_JOIN_CONTENT.subtitle).trim(),
        ctaLabel: String(remoteJoin?.ctaLabel || DEFAULT_JOIN_CONTENT.ctaLabel).trim(),
        ctaHref: String(remoteJoin?.ctaHref || DEFAULT_JOIN_CONTENT.ctaHref).trim(),
        ctaIcon: String(remoteJoin?.ctaIcon || DEFAULT_JOIN_CONTENT.ctaIcon).trim(),
      });
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

  const updateHomeCardField = (index, field, value) => {
    setCardsContent((prev) => {
      const nextCards = [...(prev.cards || [])];
      while (nextCards.length <= index && nextCards.length < HOME_CARDS_MAX) {
        nextCards.push(emptyHomeCard(getDefaultCardIcon(nextCards.length)));
      }
      if (!nextCards[index]) return prev;
      nextCards[index] = { ...nextCards[index], [field]: value };
      return { ...prev, cards: nextCards };
    });
  };

  const addHomeCardRow = () => {
    setCardsContent((prev) => {
      const nextCards = [...(prev.cards || [])];
      if (nextCards.length >= HOME_CARDS_MAX) return prev;
      const newCardIndex = nextCards.length;
      nextCards.push(emptyHomeCard(getDefaultCardIcon(nextCards.length)));
      setPendingScrollCardIndex(newCardIndex);
      return { ...prev, cards: nextCards };
    });
  };

  useEffect(() => {
    if (pendingScrollCardIndex == null) return;
    const target = homeCardRefs.current[pendingScrollCardIndex];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPendingScrollCardIndex(null);
  }, [cardsContent.cards, pendingScrollCardIndex]);

  const removeHomeCardRow = (index) => {
    setCardsContent((prev) => {
      const nextCards = [...(prev.cards || [])];
      if (nextCards.length <= 1) return prev;
      nextCards.splice(index, 1);
      return { ...prev, cards: nextCards };
    });
  };

  const openIconPickerForCard = (index) => {
    setIconToolCardIndex(index);
    setIconSearchQuery('');
    setIconToolOpen(true);
  };

  const handleSaveHomeCardsContent = async () => {
    try {
      setCardsContentSubmitting(true);
      const payload = {
        heading: cardsContent.heading || '',
        headingAccent: cardsContent.headingAccent || '',
        headingColor: cardsContent.headingColor || '',
        headingAccentColor: cardsContent.headingAccentColor || '',
        subtitle: cardsContent.subtitle || '',
        cards: (cardsContent.cards || []).slice(0, HOME_CARDS_MAX).map((card) => ({
          icon: card?.icon || '',
          title: card?.title || '',
          description: card?.description || '',
        })),
      };
      const updated = await appSettingsService.updateHomeCardsContent(payload);
      const next = updated?.homeCardsContent || {};
      const nextCardsRows = Array.isArray(next?.cards) ? next.cards : [];
      setCardsContent({
        heading: String(next?.heading || 'Powered by').trim(),
        headingAccent: String(next?.headingAccent || 'Artificial Intelligence').trim(),
        headingColor: String(next?.headingColor || '').trim(),
        headingAccentColor: String(next?.headingAccentColor || '').trim(),
        subtitle: String(
          next?.subtitle || 'Experience the future of community learning with AI-driven features that adapt to your needs'
        ).trim(),
        cards: (nextCardsRows.length
          ? nextCardsRows
          : [emptyHomeCard(getDefaultCardIcon(0)), emptyHomeCard(getDefaultCardIcon(1)), emptyHomeCard(getDefaultCardIcon(2))]
        )
          .slice(0, HOME_CARDS_MAX)
          .map((card, i) => ({
            icon: String(card?.icon || getDefaultCardIcon(i) || '').trim(),
            title: String(card?.title || '').trim(),
            description: String(card?.description || '').trim(),
          })),
      });
      toast.success('Home cards content updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update home cards content');
    } finally {
      setCardsContentSubmitting(false);
    }
  };

  const handleSaveHomeJoinContent = async () => {
    try {
      setJoinContentSubmitting(true);
      const payload = {
        heading: joinContent.heading || '',
        subtitle: joinContent.subtitle || '',
        ctaLabel: joinContent.ctaLabel || '',
        ctaHref: joinContent.ctaHref || '',
        ctaIcon: joinContent.ctaIcon || '',
      };
      const updated = await appSettingsService.updateHomeJoinContent(payload);
      const next = updated?.homeJoinContent || {};
      setJoinContent({
        heading: String(next?.heading || DEFAULT_JOIN_CONTENT.heading).trim(),
        subtitle: String(next?.subtitle || DEFAULT_JOIN_CONTENT.subtitle).trim(),
        ctaLabel: String(next?.ctaLabel || DEFAULT_JOIN_CONTENT.ctaLabel).trim(),
        ctaHref: String(next?.ctaHref || DEFAULT_JOIN_CONTENT.ctaHref).trim(),
        ctaIcon: String(next?.ctaIcon || DEFAULT_JOIN_CONTENT.ctaIcon).trim(),
      });
      toast.success('Home join section updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update home join section');
    } finally {
      setJoinContentSubmitting(false);
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
      key: 'cards',
      badge: 'C',
      title: 'Home Cards',
      description: 'Manage second home section heading and cards.',
    },
    {
      key: 'join',
      badge: 'J',
      title: 'Join Section',
      description: 'Manage call-to-action join section content.',
    },
    {
      key: 'header-visibility',
      badge: 'V',
      title: 'Header Visibility',
      description: 'Toggle top bar icons visibility.',
    },
  ];

  const validSectionKeys = ['logo', 'hero', 'cards', 'join', 'header-visibility'];

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

  const renderHomeCardsSettings = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Home Cards Section
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Configure the second home section heading, subtitle, and multiple cards (up to {HOME_CARDS_MAX}).
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Heading (left)"
              value={cardsContent.heading}
              onChange={(event) => setCardsContent((prev) => ({ ...prev, heading: event.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Heading accent (highlighted)"
              value={cardsContent.headingAccent}
              onChange={(event) => setCardsContent((prev) => ({ ...prev, headingAccent: event.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ColorPaletteField
              label="Heading color"
              value={cardsContent.headingColor}
              onChange={(value) => setCardsContent((prev) => ({ ...prev, headingColor: value }))}
              onOpenGenerator={() => setColorToolOpen(true)}
              presets={[
                '#1e293b',
                '#0f172a',
                '#334155',
                '#0ea5e9',
                '#2563eb',
                '#0f766e',
                '#7c3aed',
                '#be123c',
              ]}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ColorPaletteField
              label="Heading accent color"
              value={cardsContent.headingAccentColor}
              onChange={(value) => setCardsContent((prev) => ({ ...prev, headingAccentColor: value }))}
              onOpenGenerator={() => setColorToolOpen(true)}
              presets={[
                '#ef4444',
                '#f97316',
                '#f59e0b',
                '#84cc16',
                '#22c55e',
                '#06b6d4',
                '#3b82f6',
                '#a855f7',
              ]}
            />
          </Grid>
          <Grid item xs={12}>
            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Subtitle</Typography>
              <Editor
                value={cardsContent.subtitle}
                onChange={(value) => setCardsContent((prev) => ({ ...prev, subtitle: value }))}
                placeholder="Write section subtitle..."
                editable
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 150,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                  },
                }}
              />
            </Stack>
          </Grid>
        </Grid>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Cards
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Limit: up to {HOME_CARDS_MAX} cards
            </Typography>
          </Stack>

          <Button
            variant="outlined"
            onClick={addHomeCardRow}
            disabled={(cardsContent.cards || []).length >= HOME_CARDS_MAX}
          >
            Add card
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {(cardsContent.cards || []).map((cardRow, i) => (
            <Grid
              item
              xs={12}
              md={6}
              key={`home-card-config-${i}`}
              ref={(node) => {
                if (node) {
                  homeCardRefs.current[i] = node;
                } else {
                  delete homeCardRefs.current[i];
                }
              }}
            >
              <HomeCardItem
                index={i}
                cardRow={cardRow}
                canRemove={(cardsContent.cards || []).length > 1}
                onRemove={() => removeHomeCardRow(i)}
                onPickIcon={() => openIconPickerForCard(i)}
                onTitleChange={(event) => updateHomeCardField(i, 'title', event.target.value)}
                onDescriptionChange={(value) => updateHomeCardField(i, 'description', value)}
                getDefaultCardIcon={getDefaultCardIcon}
              />
            </Grid>
          ))}
        </Grid>

        <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
          <LoadingButton variant="contained" loading={cardsContentSubmitting} onClick={handleSaveHomeCardsContent}>
            Save home cards content
          </LoadingButton>
        </Stack>

        <HexColorToolDrawer
          open={colorToolOpen}
          onClose={() => setColorToolOpen(false)}
          startColor={generatorStartColor}
          endColor={generatorEndColor}
          onStartColorChange={(event) => setGeneratorStartColor(event.target.value)}
          onEndColorChange={(event) => setGeneratorEndColor(event.target.value)}
          onApplyHeadingColor={() => setCardsContent((prev) => ({ ...prev, headingColor: generatorStartColor }))}
          onApplyAccentColor={() => setCardsContent((prev) => ({ ...prev, headingAccentColor: generatorEndColor }))}
          headingColor={cardsContent.headingColor}
          accentColor={cardsContent.headingAccentColor}
        />

        <IconPickerDrawer
          open={iconToolOpen}
          onClose={() => setIconToolOpen(false)}
          contextLabel={iconToolCardIndex >= 0 ? `card ${iconToolCardIndex + 1}` : 'join section button'}
          searchQuery={iconSearchQuery}
          onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
          filteredIcons={filteredCategoryIcons}
          selectedIcon={
            iconToolCardIndex >= 0
              ? cardsContent.cards?.[iconToolCardIndex]?.icon || ''
              : joinContent.ctaIcon || DEFAULT_JOIN_CONTENT.ctaIcon
          }
          onSelectIcon={(iconName) => {
            if (iconToolCardIndex >= 0) {
              updateHomeCardField(iconToolCardIndex, 'icon', iconName);
            } else {
              setJoinContent((prev) => ({ ...prev, ctaIcon: iconName }));
            }
            setIconToolOpen(false);
          }}
        />
      </Stack>
    </Card>
  );

  const renderHomeJoinSettings = (
    <HomeJoinSettingsCard
      joinContent={joinContent}
      setJoinContent={setJoinContent}
      joinContentSubmitting={joinContentSubmitting}
      onSave={handleSaveHomeJoinContent}
      defaultJoinIcon={DEFAULT_JOIN_CONTENT.ctaIcon}
    />
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
        {activeSection === 'cards' && renderHomeCardsSettings}
        {activeSection === 'join' && renderHomeJoinSettings}
        {activeSection === 'header-visibility' && renderHeaderVisibility}
      </Stack>
    </DashboardContent>
  );
}

