import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getProviderPromptDetail, PROMPT_PROVIDERS, PROMPT_PROVIDER_IDS } from 'src/sections/workflows/data/prompt-providers';
import { ProviderPromptIcon } from 'src/sections/workflows/provider-prompt-icon';
import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

/** Fixed card geometry so every category tile aligns in the grid (Gmail-library style). */
const PROMPT_CARD = {
  minHeight: 300,
  previewCount: 5,
  listMinHeight: 140,
};

export function MyWorkflows() {
  const theme = useTheme();
  const router = useRouter();
  const [searchParams, setSearchParams] = useSearchParams();
  const [promptLevels] = useState(PROMPT_PROVIDERS);
  const [activeProvider, setActiveProvider] = useState('chatgpt');
  const [activeProviderDetail, setActiveProviderDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const providerCacheRef = useRef({});

  useEffect(() => {
    let mounted = true;
    const cached = providerCacheRef.current[activeProvider];

    if (cached) {
      setActiveProviderDetail(cached);
      setLoading(false);
      return undefined;
    }

    setActiveProviderDetail(null);
    setLoading(true);

    (async () => {
      try {
        const detail = await getProviderPromptDetail(activeProvider);
        if (!mounted) return;
        providerCacheRef.current[activeProvider] = detail;
        setActiveProviderDetail(detail);
      } catch (error) {
        if (mounted) {
          toast.error(error?.message || 'Failed to load provider prompts');
          setActiveProviderDetail(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeProvider]);

  const providerFromUrl = searchParams.get('provider');
  useEffect(() => {
    if (!providerFromUrl || !PROMPT_PROVIDER_IDS.has(providerFromUrl)) {
      return;
    }
    setActiveProvider((prev) => (prev === providerFromUrl ? prev : providerFromUrl));
  }, [providerFromUrl]);

  useEffect(() => {
    setSearchQuery('');
  }, [activeProvider]);

  const selectedProvider =
    promptLevels.find((level) => level.id === activeProvider) || promptLevels[0] || null;

  const selectedSections = activeProviderDetail?.sections || [];
  const visibleItemsPerCard = PROMPT_CARD.previewCount;

  const { totalCategoriesForProvider, totalPromptsForProvider, filteredSections } = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const sections = activeProviderDetail?.sections || [];
    const filtered = normalizedSearch
      ? sections.filter((section) => {
          const titleMatch = String(section.title || '').toLowerCase().includes(normalizedSearch);
          const itemMatch = (section.items || []).some((item) =>
            String(item.useCase || '').toLowerCase().includes(normalizedSearch)
          );
          return titleMatch || itemMatch;
        })
      : sections;

    return {
      totalCategoriesForProvider: sections.length,
      totalPromptsForProvider: sections.reduce(
        (sum, section) => sum + ((section.items || []).length || 0),
        0
      ),
      filteredSections: filtered,
    };
  }, [activeProviderDetail, searchQuery]);

  const handleOpenCategory = (categoryTitle) => {
    const search = new URLSearchParams();
    if (categoryTitle) {
      search.set('category', categoryTitle);
    }
    const query = search.toString();
    router.push(`${paths.workflowsPrompt.details(activeProvider)}${query ? `?${query}` : ''}`);
  };

  const activeBrandColor = selectedProvider?.color || theme.palette.primary.main;
  const activeBrandGradient =
    selectedProvider?.bgColor ||
    `linear-gradient(90deg, ${activeBrandColor} 0%, ${activeBrandColor} 100%)`;

  const getProviderButtonGradient = (level, hover = false) => {
    const raw = hover
      ? level?.bgColorHover || level?.bgColor
      : level?.bgColor || `linear-gradient(90deg, ${level?.color || theme.palette.primary.main} 0%, ${level?.color || theme.palette.primary.main} 100%)`;
    return String(raw || '').replace(/\s*!important\s*/gi, '').trim();
  };

  const viewAllPromptsButtonSx = {
    background: getProviderButtonGradient(selectedProvider),
    backgroundColor: activeBrandColor,
    color: '#fff',
    boxShadow: theme.customShadows?.z8 || theme.shadows[8],
    '&.MuiButton-contained': {
      background: getProviderButtonGradient(selectedProvider),
      backgroundColor: activeBrandColor,
      color: '#fff',
    },
    '&:hover': {
      background: getProviderButtonGradient(selectedProvider, true),
      backgroundColor: activeBrandColor,
      color: '#fff',
      boxShadow: theme.customShadows?.z12 || theme.shadows[12],
    },
    '& .MuiButton-endIcon': {
      color: '#fff',
    },
  };

  const handleProviderChange = useCallback(
    (providerId) => {
      if (providerId === activeProvider) {
        return;
      }
      const cached = providerCacheRef.current[providerId];
      if (cached) {
        setActiveProviderDetail(cached);
        setLoading(false);
      }
      setActiveProvider(providerId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'resources');
          next.set('provider', providerId);
          next.delete('category');
          return next;
        },
        { replace: true }
      );
    },
    [activeProvider, setSearchParams]
  );

  const providerSidebarLabelSx = {
    flex: 1,
    textAlign: 'left',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    display: 'block',
    color: 'common.black',
    opacity: 0,
    maxWidth: 0,
    ml: 0,
    transition: 'opacity 0.22s ease, max-width 0.22s ease, margin 0.22s ease',
    '.provider-sidebar-rail:hover &': {
      opacity: 1,
      maxWidth: 120,
      ml: 1,
    },
  };

  /** Shared surface tokens — provider rail, library panel, and inactive tabs use the same palette. */
  const getProviderSurfaceBg = (level) => {
    if (!level) return alpha(theme.palette.background.paper, 0.96);
    if (theme.palette.mode === 'dark') {
      return alpha(level.color, 0.2);
    }
    return level.lightColor || alpha(level.color, 0.12);
  };

  const getProviderSurfaceBorder = (level) => {
    if (level?.buttonBorder && theme.palette.mode !== 'dark') {
      return level.buttonBorder;
    }
    return alpha(level?.color || theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.28 : 0.2);
  };

  const getProviderInactiveBg = (level) => getProviderSurfaceBg(level);

  const getProviderActiveBg = (level) => level?.bgColor || level?.color || theme.palette.primary.main;

  const providerRailContainerSx = {
    border: `1px solid ${getProviderSurfaceBorder(selectedProvider)}`,
    bgcolor: getProviderSurfaceBg(selectedProvider),
    backdropFilter: 'blur(8px)',
    boxShadow: theme.customShadows?.z4 || theme.shadows[1],
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  };

  const getProviderMobileTabSx = (level, isActive) => ({
    flex: 1,
    minHeight: { xs: 44, sm: 46 },
    px: { xs: 1, sm: 2 },
    py: 1,
    borderRadius: { xs: 1.5, sm: '50px' },
    fontWeight: 600,
    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
    textTransform: 'none',
    whiteSpace: 'nowrap',
    gap: 0.75,
    '& .MuiButton-startIcon': {
      ml: 0,
      mr: { xs: 0, sm: 0.5 },
    },
    '& .provider-tab-label': { display: 'inline' },
    '@media (max-width: 374px)': {
      px: 0.75,
      '& .provider-tab-label': { display: 'none' },
      '& .MuiButton-startIcon': { margin: 0 },
    },
    color: 'common.black',
    ...(isActive
      ? {
          background: getProviderActiveBg(level),
          border: 'none',
          boxShadow: theme.customShadows.z8,
          '&:hover': { filter: 'brightness(0.94)' },
        }
      : {
          border: 'none',
          background: getProviderInactiveBg(level),
        }),
  });

  const getProviderSidebarSx = (level, isActive) => {
    return {
      width: '100%',
      justifyContent: 'center',
      textAlign: 'left',
      px: 0.5,
      py: 0.65,
      gap: 0,
      borderRadius: 1.5,
      border: 'none',
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.8125rem',
      color: 'common.black',
      boxShadow: isActive ? theme.customShadows.z8 : 'none',
      transition: 'padding 0.22s ease, gap 0.22s ease, background 0.15s ease',
      '.provider-sidebar-rail:hover &': {
        justifyContent: 'flex-start',
        px: 1,
        gap: 1,
      },
      ...(isActive
        ? {
            background: getProviderActiveBg(level),
            '&:hover': { filter: 'brightness(0.94)' },
            '& .provider-sidebar-label': { color: 'common.black' },
          }
        : {
            background: getProviderInactiveBg(level),
          }),
    };
  };

  return (
    <Box sx={{ width: '100%', overflow: 'visible' }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', lg: 'flex-end' }}
        spacing={2}
        sx={{ mb: { xs: 2.5, md: 3 } }}
      >
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: 720 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: 'text.primary',
              letterSpacing: '-0.02em',
              fontSize: { xs: 'clamp(1.125rem, 5vw + 0.25rem, 1.5rem)', sm: '1.5rem' },
              lineHeight: 1.25,
            }}
          >
            AI resource prompts
          </Typography>
          <Box
            sx={{
              mt: 1,
              mb: 0.25,
              width: 48,
              height: 3,
              borderRadius: 1,
              background: (t) =>
                `linear-gradient(90deg, ${t.palette.primary.main}, ${alpha(t.palette.secondary.main, 0.85)})`,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              mt: 0.75,
              fontSize: { xs: 'clamp(0.6875rem, 2.4vw + 0.42rem, 0.8125rem)', sm: '0.75rem' },
              lineHeight: 1.55,
            }}
          >
            Curated prompt libraries for finance workflows — pick a provider, browse categories, and open full prompt
            packs in one click.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', flexShrink: 0, alignSelf: { lg: 'flex-end' } }}>
          <Chip
            size="small"
            label={`${totalCategoriesForProvider} categories`}
            sx={{
              fontWeight: 600,
              bgcolor: getProviderSurfaceBg(selectedProvider),
              color: activeBrandColor,
              border: `1px solid ${getProviderSurfaceBorder(selectedProvider)}`,
            }}
          />
          <Chip
            size="small"
            label={`${totalPromptsForProvider} prompts`}
            sx={{
              fontWeight: 600,
              bgcolor: getProviderSurfaceBg(selectedProvider),
              color: activeBrandColor,
              border: `1px solid ${getProviderSurfaceBorder(selectedProvider)}`,
            }}
          />
        </Stack>
      </Stack>

      {/* Mobile + tablet: pill tabs — stick on scroll */}
      <Box
        sx={{
          display: { xs: 'flex', lg: 'none' },
          justifyContent: 'flex-start',
          mb: { xs: 2.5, md: 3 },
          position: 'sticky',
          top: { xs: 72, sm: 80 },
          zIndex: 11,
          py: 0.5,
          bgcolor: 'background.default',
        }}
      >
        <Box
          sx={{
            ...providerRailContainerSx,
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { sm: 560 },
            borderRadius: { xs: 2, sm: '50px' },
            p: 1,
            boxShadow: theme.customShadows.z24,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 1,
          }}
        >
          {promptLevels.map((level) => {
            const isActive = activeProvider === level.id;
            return (
              <Button
                key={level.id}
                aria-label={level.title}
                onClick={() => handleProviderChange(level.id)}
                variant={isActive ? 'contained' : 'outlined'}
                startIcon={
                  <ProviderPromptIcon
                    providerId={level.id}
                    imageSrc={level.imageSrc}
                    iconifyIcon={level.icon}
                    width={{ xs: 20, sm: 22 }}
                  />
                }
                sx={getProviderMobileTabSx(level, isActive)}
              >
                <Box component="span" className="provider-tab-label">
                  {level.title}
                </Box>
              </Button>
            );
          })}
        </Box>
      </Box>

      <Grid
        container
        spacing={{ xs: 2, lg: 0 }}
        alignItems="flex-start"
        sx={{
          width: { xs: '100%', lg: 'calc(100% + var(--layout-dashboard-content-px, 40px))' },
          ml: { xs: 0, lg: 'calc(-1 * var(--layout-dashboard-content-px, 40px))' },
        }}
      >
        {/* Desktop: provider icons stay visible while page scrolls */}
        <Grid
          xs={12}
          lg="auto"
          sx={{
            display: { xs: 'none', lg: 'block' },
            width: { lg: 56 },
            flexShrink: 0,
            alignSelf: 'flex-start',
            position: { lg: 'sticky' },
            top: { lg: 120 },
            height: { lg: 'fit-content' },
            zIndex: { lg: 30 },
            pl: 0,
            transition: 'width 0.25s ease',
            '&:hover': { width: { lg: 200 } },
          }}
        >
          <Box
            className="provider-sidebar-rail"
            sx={{
              ...providerRailContainerSx,
              p: { lg: 0.75 },
              width: '100%',
              overflow: 'visible',
              borderRadius: 2,
            }}
          >
            <Stack direction="column" spacing={1}>
              {promptLevels.map((level) => {
                const isActive = activeProvider === level.id;
                return (
                  <Tooltip key={level.id} title={level.title} placement="right" arrow>
                    <Button
                      aria-label={level.title}
                      onClick={() => handleProviderChange(level.id)}
                      variant="text"
                      disableRipple
                      sx={{
                        ...getProviderSidebarSx(level, isActive),
                        flexShrink: 0,
                        minWidth: 44,
                      }}
                    >
                      <ProviderPromptIcon
                        providerId={level.id}
                        imageSrc={level.imageSrc}
                        iconifyIcon={level.icon}
                        width={32}
                        sx={{
                          flexShrink: 0,
                          opacity: 1,
                          transition: 'opacity 0.15s ease, transform 0.15s ease',
                          transform: isActive ? 'scale(1.06)' : 'scale(1)',
                        }}
                      />
                      <Box component="span" className="provider-sidebar-label" sx={providerSidebarLabelSx}>
                        {level.title}
                      </Box>
                    </Button>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        </Grid>

        <Grid xs={12} lg sx={{ minWidth: 0, flex: 1, pl: { xs: 0, lg: 2 } }}>
          <Box
            sx={{
              width: '100%',
              borderRadius: 2,
              border: `1px solid ${getProviderSurfaceBorder(selectedProvider)}`,
              bgcolor: getProviderSurfaceBg(selectedProvider),
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{
                px: { xs: 2, md: 2.5 },
                py: { xs: 2, md: 2.25 },
                bgcolor: getProviderSurfaceBg(selectedProvider),
                borderBottom: `1px solid ${getProviderSurfaceBorder(selectedProvider)}`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
                <ProviderPromptIcon
                  providerId={selectedProvider?.id || 'chatgpt'}
                  imageSrc={selectedProvider?.imageSrc}
                  iconifyIcon={selectedProvider?.icon}
                  brandColor={activeBrandColor}
                  inCircle
                  width={{ xs: 32, sm: 36 }}
                  sx={{
                    bgcolor: getProviderSurfaceBg(selectedProvider),
                    border: `1px solid ${getProviderSurfaceBorder(selectedProvider)}`,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: '0.95rem', sm: '1.0625rem' },
                      color: 'text.primary',
                      lineHeight: 1.3,
                    }}
                  >
                    {selectedProvider?.title || 'ChatGPT'} library
                  </Typography>
                  <Typography variant="caption" sx={{ color: activeBrandColor, fontWeight: 600 }}>
                    {totalPromptsForProvider} prompts · {totalCategoriesForProvider} categories
                  </Typography>
                </Box>
              </Stack>

              <TextField
                size="small"
                placeholder={`Search ${selectedProvider?.title || 'provider'} categories…`}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                sx={{
                  width: { xs: '100%', sm: 1 },
                  flex: { sm: 1 },
                  maxWidth: { sm: 420, md: 480 },
                  ml: { sm: 'auto' },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'background.neutral' : 'grey.100'),
                    '& fieldset': { borderColor: 'transparent' },
                    '&:hover fieldset': { borderColor: alpha(activeBrandColor, 0.35) },
                    '&.Mui-focused fieldset': { borderColor: activeBrandColor },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="mingcute:search-line" width={18} sx={{ color: activeBrandColor }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Clear search"
                        edge="end"
                        size="small"
                        onClick={() => setSearchQuery('')}
                        sx={{ color: 'text.secondary' }}
                      >
                        <Iconify icon="mingcute:close-line" width={16} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Stack>

            <Box
              sx={{
                p: { xs: 2, md: 2.5 },
                width: '100%',
                opacity: loading ? 0.72 : 1,
                pointerEvents: loading ? 'none' : 'auto',
              }}
            >
              {loading ? (
                <Box
                  sx={{
                    py: { xs: 8, md: 10 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <CircularProgress size={36} thickness={4} sx={{ color: activeBrandColor }} />
                  <Typography variant="body2" color="text.secondary">
                    Loading prompts…
                  </Typography>
                </Box>
              ) : (
                <Grid
                  container
                  spacing={{ xs: 1.5, sm: 1.5, md: 1.5, lg: 1.5 }}
                  sx={{ width: '100%', m: 0 }}
                >
                  {filteredSections.map((section) => {
                    const sectionItems = section.items || [];
                    const visibleItems = sectionItems.slice(0, visibleItemsPerCard);
                    const paddedItems = [
                      ...visibleItems,
                      ...Array.from({ length: Math.max(0, visibleItemsPerCard - visibleItems.length) }),
                    ];
                    const hasMoreItems = sectionItems.length > visibleItemsPerCard;
                    const totalPromptsInCategory = sectionItems.length;

                    return (
                      <Grid
                        key={section.title}
                        xs={12}
                        sm={6}
                        md={4}
                        lg={3}
                        xl={3}
                        data-prompt-category={section.title}
                        sx={{ display: 'flex' }}
                      >
                        <Card
                          sx={{
                            width: '100%',
                            height: '100%',
                            minHeight: PROMPT_CARD.minHeight,
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 2,
                            overflow: 'hidden',
                            p: 2,
                            border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.16)}`,
                            bgcolor: 'background.paper',
                            boxShadow: (t) => t.customShadows?.z4 || t.shadows[1],
                            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                            '&:hover': {
                              boxShadow: (t) => t.customShadows.z12,
                              borderColor: alpha(activeBrandColor, 0.45),
                            },
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="flex-start"
                            justifyContent="space-between"
                            spacing={1}
                            sx={{ mb: 0.75, minHeight: 40 }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                lineHeight: 1.3,
                                color: 'text.primary',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                flex: 1,
                              }}
                            >
                              {section.title}
                            </Typography>
                            <Chip
                              size="small"
                              label={totalPromptsInCategory}
                              sx={{
                                fontWeight: 700,
                                height: 22,
                                minWidth: 28,
                                flexShrink: 0,
                                bgcolor: alpha(activeBrandColor, theme.palette.mode === 'dark' ? 0.2 : 0.1),
                                color: activeBrandColor,
                                border: `1px solid ${alpha(activeBrandColor, 0.22)}`,
                              }}
                            />
                          </Stack>

                          <Box
                            sx={{
                              height: 2,
                              borderRadius: 1,
                              mb: 0.75,
                              background: activeBrandGradient,
                              flexShrink: 0,
                            }}
                          />

                          <Stack
                            spacing={0.5}
                            sx={{
                              flex: 1,
                              minHeight: PROMPT_CARD.listMinHeight,
                              mb: 1,
                            }}
                          >
                            {paddedItems.map((item, index) =>
                              item ? (
                                <Stack
                                  key={`${section.title}-${item.useCase || index}`}
                                  direction="row"
                                  spacing={0.75}
                                  alignItems="flex-start"
                                  sx={{ minHeight: 24 }}
                                >
                                  <Iconify
                                    icon="solar:arrow-right-bold"
                                    width={14}
                                    sx={{ color: activeBrandColor, mt: 0.25, flexShrink: 0, opacity: 0.85 }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: 'text.secondary',
                                      lineHeight: 1.35,
                                      fontSize: '0.8125rem',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {item.useCase || `Prompt ${index + 1}`}
                                  </Typography>
                                </Stack>
                              ) : (
                                <Box key={`pad-${index}`} sx={{ minHeight: 28 }} aria-hidden />
                              )
                            )}
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.disabled',
                                pl: 2.25,
                                pt: 0.25,
                                minHeight: 18,
                                visibility: hasMoreItems ? 'visible' : 'hidden',
                              }}
                            >
                              +{Math.max(0, sectionItems.length - visibleItemsPerCard)} more prompts
                            </Typography>
                          </Stack>

                          <Button
                            fullWidth
                            variant="contained"
                            disableElevation
                            onClick={() => handleOpenCategory(section.title)}
                            endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
                            sx={{
                              mt: 'auto',
                              flexShrink: 0,
                              borderRadius: 1.5,
                              py: 0.75,
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              ...viewAllPromptsButtonSx,
                            }}
                          >
                            View all prompts
                          </Button>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {!loading && !filteredSections.length ? (
                <Box
                  sx={{
                    py: 6,
                    px: 2,
                    textAlign: 'center',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: `1px dashed ${alpha(activeBrandColor, 0.35)}`,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery.trim()
                      ? 'No categories match your search.'
                      : 'No categories found for this provider.'}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

