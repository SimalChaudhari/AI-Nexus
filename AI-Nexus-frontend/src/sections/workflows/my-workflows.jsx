import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getProviderPromptDetail, PROMPT_PROVIDERS } from 'src/sections/workflows/data/prompt-providers';
import { getProviderPromptTheme } from 'src/sections/workflows/provider-prompt-theme';
import { ProviderPromptIcon } from 'src/sections/workflows/provider-prompt-icon';
import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export function MyWorkflows() {
  const theme = useTheme();
  const router = useRouter();
  const [promptLevels] = useState(PROMPT_PROVIDERS);
  const [activeProvider, setActiveProvider] = useState('chatgpt');
  const [activeProviderDetail, setActiveProviderDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerDetailMap, setProviderDetailMap] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (providerDetailMap[activeProvider]) {
          if (mounted) {
            setActiveProviderDetail(providerDetailMap[activeProvider]);
          }
          return;
        }
        const detail = await getProviderPromptDetail(activeProvider);
        if (mounted) {
          setActiveProviderDetail(detail);
          setProviderDetailMap((prev) => ({
            ...prev,
            [activeProvider]: detail,
          }));
        }
      } catch (error) {
        toast.error(error?.message || 'Failed to load provider prompts');
        if (mounted) {
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
  }, [activeProvider, providerDetailMap]);

  useEffect(() => {
    setSearchQuery('');
  }, [activeProvider]);

  const resolveProviderColor = (colorValue) => {
    if (!colorValue || typeof colorValue !== 'string') return '';
    if (colorValue.startsWith('#')) return colorValue;
    if (!colorValue.includes('.')) return colorValue;

    const [paletteKey, shadeKey] = colorValue.split('.');
    const paletteValue = theme?.palette?.[paletteKey];
    if (!paletteValue) return colorValue;

    if (typeof paletteValue === 'string') return paletteValue;
    if (shadeKey && typeof paletteValue[shadeKey] === 'string') return paletteValue[shadeKey];
    if (typeof paletteValue.main === 'string') return paletteValue.main;
    return colorValue;
  };

  const selectedProvider =
    promptLevels.find((level) => level.id === activeProvider) || promptLevels[0] || null;

  const selectedProviderTheme = getProviderPromptTheme(selectedProvider?.id || 'chatgpt', {
    color: resolveProviderColor(selectedProvider?.color),
    bgColor: resolveProviderColor(selectedProvider?.bgColor),
  });

  const selectedSections = activeProviderDetail?.sections || [];
  const visibleItemsPerCard = 6;
  const totalCategoriesForProvider = selectedSections.length;
  const totalPromptsForProvider = selectedSections.reduce(
    (sum, section) => sum + ((section.items || []).length || 0),
    0
  );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredSections = normalizedSearch
    ? selectedSections.filter((section) => {
        const titleMatch = String(section.title || '').toLowerCase().includes(normalizedSearch);
        const itemMatch = (section.items || []).some((item) =>
          String(item.useCase || '').toLowerCase().includes(normalizedSearch)
        );
        return titleMatch || itemMatch;
      })
    : selectedSections;

  const handleOpenCategory = (categoryTitle) => {
    const search = new URLSearchParams();
    if (categoryTitle) {
      search.set('category', categoryTitle);
    }
    const query = search.toString();
    router.push(`${paths.workflowsPrompt.details(activeProvider)}${query ? `?${query}` : ''}`);
  };

  return (
    <Box>
      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: { xs: 3, md: 4 } }}
        >
          <Box sx={{ width: '100%' }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Prompts
            </Typography>
            <Tabs
              value={activeProvider}
              onChange={(_, value) => setActiveProvider(value)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{ mb: 2 }}
            >
              {promptLevels.map((level) => (
                (() => {
                  const tabTheme = getProviderPromptTheme(level.id, {
                    color: resolveProviderColor(level.color),
                    bgColor: resolveProviderColor(level.bgColor),
                  });
                  return (
                    <Tab
                      key={level.id}
                      value={level.id}
                      label={level.title}
                      icon={
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', mr: 1.2 }}>
                          <ProviderPromptIcon providerId={level.id} iconifyIcon={level.icon} width={18} />
                        </Box>
                      }
                      iconPosition="start"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        mr: 0.75,
                        minHeight: 42,
                        color: 'text.secondary',
                        '&.Mui-selected': {
                          color: tabTheme.accentStrong,
                        },
                      }}
                    />
                  );
                })()
              ))}
            </Tabs>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '1rem', md: '1.0625rem' }, lineHeight: 1.6 }}>
              Access curated AI prompt libraries for finance workflows, updated regularly for practical day-to-day use.
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <ProviderPromptIcon
              providerId={selectedProvider?.id || 'chatgpt'}
              iconifyIcon={selectedProvider?.icon}
              width={22}
              sx={{ color: selectedProviderTheme.accent }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {`${selectedProvider?.title || 'ChatGPT'} Categories (${totalCategoriesForProvider})`}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {`Prompts: ${totalPromptsForProvider}`}
            </Typography>
          </Stack>

          <TextField
            size="small"
            placeholder={`Search ${selectedProvider?.title || 'provider'} categories...`}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            sx={{ width: { xs: '100%', sm: 420 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="mingcute:search-line" width={18} sx={{ color: 'secondary.main' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Clear search"
                    edge="end"
                    size="small"
                    onClick={() => setSearchQuery('')}
                    sx={{ color: 'secondary.main' }}
                  >
                    <Iconify icon="mingcute:close-line" width={16} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Stack>

        {loading ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={30} />
          </Box>
        ) : null}

        {!loading ? (
          <Grid container spacing={{ xs: 2, md: 2.5 }}>
          {filteredSections.map((section) => {
            const sectionItems = section.items || [];
            const visibleItems = sectionItems.slice(0, visibleItemsPerCard);
            const hasMoreItems = sectionItems.length > visibleItemsPerCard;
            const totalPromptsInCategory = sectionItems.length;

            return (
              <Grid key={section.title} xs={12} md={6} lg={4}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    borderWidth: 1.5,
                    borderColor: selectedProviderTheme.accent,
                    bgcolor: selectedProviderTheme.accentMuted,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: (muiTheme) => `0 10px 26px -16px ${selectedProviderTheme.accent || muiTheme.palette.primary.main}`,
                  }}
                >
            
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      textAlign: 'center',
                      mb: 1.5,
                      minHeight: 46,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {`${section.title} (${totalPromptsInCategory})`}
                  </Typography>
                  <Box
                    sx={{
                      height: 4,
                      borderRadius: 1,
                      background: selectedProviderTheme.topBar,
                      mb: 1.25,
                    }}
                  />
                  <Stack spacing={0.25} sx={{ flexGrow: 1 }}>
                    {visibleItems.map((item, index) => (
                      <Box
                        key={`${section.title}-${item.useCase || index}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 0.75,
                          fontSize: 14,
                          color: selectedProviderTheme.chatTextMuted || 'text.secondary',
                        }}
                      >
                        <Box component="span" sx={{ mr: 1 }}>{"\u2192"} {item.useCase || `Prompt ${index + 1}`}</Box>
                      </Box>
                    ))}
                    {hasMoreItems ? (
                      <Typography variant="caption" sx={{ color: 'text.disabled', pt: 0.75 }}>
                        +{sectionItems.length - visibleItemsPerCard} more
                      </Typography>
                    ) : null}
                  </Stack>

                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => handleOpenCategory(section.title)}
                    sx={{
                      mt: 2,
                      borderWidth: 2,
                      borderColor: selectedProviderTheme.accentStrong || 'text.primary',
                      textTransform: 'none',
                      fontWeight: 700,
                      color: selectedProviderTheme.accentStrong || 'text.primary',
                      '&:hover': {
                        borderColor: selectedProviderTheme.accent,
                        bgcolor: selectedProviderTheme.rowBg,
                      },
                    }}
                  >
                    See all prompts {"\u2192"}
                  </Button>
                </Card>
              </Grid>
            );
          })}
          </Grid>
        ) : null}

        {!loading && !filteredSections.length ? (
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            {normalizedSearch ? 'No related categories found for your search.' : 'No categories found for this provider.'}
          </Typography>
        ) : null}
      </Card>
    </Box>
  );
}

