import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  getProviderPromptDetail,
  PROMPT_PROVIDER_IDS,
  PROMPT_PROVIDERS,
} from 'src/sections/workflows/data/prompt-providers';
import { getProviderPromptTheme } from 'src/sections/workflows/provider-prompt-theme';
import { ProviderPromptIcon } from 'src/sections/workflows/provider-prompt-icon';
import { toast } from 'src/components/snackbar';

// ChatGPT: OpenAI supports ?prompt= — the site reads it and fills the composer (documented pattern).
// Claude: https://www.claude.ai/new?q= is community-tested but not officially guaranteed; login can clear it.
// Gemini: Google does not document main-app prefill; we try ?q= (works in some builds) and always copy as fallback.
const MAX_TRY_IT_URL_ENCODED_LENGTH = 7500;

function promptHtmlToPlainText(html, options = {}) {
  const { includeImageUrls = false } = options;
  const value = String(html || '');
  if (!value) return '';

  // Extract image URLs first so they are not lost in text-only prompt handoff.
  const imageUrls = Array.from(value.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi))
    .map((match) => match?.[1])
    .filter(Boolean);

  const withLineBreaks = value
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ');

  const stripped = withLineBreaks
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!includeImageUrls || !imageUrls.length) return stripped;

  const imageBlock = imageUrls.map((url) => `Image: ${url}`).join('\n');
  return `${stripped}\n\n${imageBlock}`.trim();
}

function getTryItUrl(provider, prompt, redirectUrl) {
  const encoded = encodeURIComponent(prompt);
  if (encoded.length > MAX_TRY_IT_URL_ENCODED_LENGTH) {
    return null;
  }

  if (redirectUrl && typeof redirectUrl === 'string') {
    const raw = redirectUrl.trim();
    if (raw) {
      if (raw.includes('{prompt}')) {
        return raw.replaceAll('{prompt}', encoded);
      }
      return raw;
    }
  }

  const providerKey = String(provider || '').toLowerCase();
  if (providerKey === 'chatgpt') {
    return `https://chatgpt.com/?prompt=${encoded}`;
  }
  if (providerKey === 'claude') {
    return `https://claude.ai/new?q=${encoded}`;
  }
  if (providerKey === 'gemini') {
    return `https://gemini.google.com/app?q=${encoded}`;
  }
  return null;
}

export default function PromptDetailsPage() {
  const theme = useTheme();
  const { provider = 'chatgpt' } = useParams();
  const [searchParams] = useSearchParams();
  const selectedCategoryFromQuery = searchParams.get('category') || '';
  const longPressTimerRef = useRef(null);
  const [copyToastOpen, setCopyToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('Text copied');
  const [config, setConfig] = useState(null);
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState('');
  const [loading, setLoading] = useState(true);

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

  const staticProvider = useMemo(
    () => PROMPT_PROVIDERS.find((entry) => entry.id === provider) || PROMPT_PROVIDERS[0],
    [provider]
  );

  const brand = useMemo(
    () =>
      getProviderPromptTheme(provider, {
        color: staticProvider.color || resolveProviderColor(config?.color),
        bgColor: staticProvider.bgColor || resolveProviderColor(config?.bgColor),
      }),
    [provider, staticProvider, config?.color, config?.bgColor]
  );
  const metadata = { title: `${config?.title || 'Prompts'} | ${CONFIG.site.name}` };

  const backToPromptsHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('tab', 'resources');
    const p = String(provider || '').toLowerCase();
    if (PROMPT_PROVIDER_IDS.has(p)) {
      params.set('provider', p);
    }
    return `${paths.workflows}?${params.toString()}`;
  }, [provider]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const providerConfig = await getProviderPromptDetail(provider);
        if (mounted) {
          setConfig(providerConfig || null);
        }
      } catch (error) {
        toast.error(error?.message || 'Failed to load prompt pack');
        if (mounted) setConfig(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [provider]);

  useEffect(() => {
    const sections = config?.sections || [];
    if (!sections.length) {
      setSelectedCategoryTitle('');
      return;
    }

    if (selectedCategoryFromQuery) {
      const matched = sections.find((section) => section.title === selectedCategoryFromQuery);
      setSelectedCategoryTitle(matched?.title || sections[0].title);
      return;
    }

    setSelectedCategoryTitle(sections[0].title);
  }, [config, selectedCategoryFromQuery]);

  const showToast = (message) => {
    setToastMessage(message);
    setCopyToastOpen(true);
  };

  const copyPrompt = async (promptText) => {
    const plainText = promptHtmlToPlainText(promptText, { includeImageUrls: false });
    try {
      await navigator.clipboard.writeText(plainText);
      showToast('Text copied');
    } catch (error) {
      // Clipboard can fail in restricted contexts; keep UX silent here.
    }
  };

  const copyImageFromUrl = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      if (!navigator.clipboard?.write || typeof window.ClipboardItem === 'undefined') {
        showToast('Image copy is not supported in this browser');
        return;
      }
      const response = await fetch(imageUrl);
      if (!response.ok) {
        showToast('Unable to fetch image for copying');
        return;
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        showToast('Selected file is not an image');
        return;
      }
      await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })]);
      showToast('Image copied');
    } catch {
      showToast('Image copy blocked by browser');
    }
  };

  const handleTryIt = async (event, promptText) => {
    event.stopPropagation();
    event.preventDefault();

    const plainText = promptHtmlToPlainText(promptText, { includeImageUrls: false });
    const url = getTryItUrl(provider, plainText, config?.redirectUrl);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await navigator.clipboard.writeText(plainText);
      showToast('Prompt copied — direct URL auto-fill not available for this prompt length');
    } catch {
      // no-op
    }
  };

  const startLongPressCopy = (promptText) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      copyPrompt(promptText);
      longPressTimerRef.current = null;
    }, 550);
  };

  const clearLongPressCopy = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>{metadata.title}</title>
        </Helmet>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      </>
    );
  }

  const sections = config?.sections || [];
  const selectedSection =
    sections.find((section) => section.title === selectedCategoryTitle) || sections[0] || null;

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <DashboardContent>
        <Stack spacing={3}>
          <Box>
            <Button
              component={RouterLink}
              href={backToPromptsHref}
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
              Back to Prompts
            </Button>
          </Box>
          {!config && !loading ? (
            <Alert severity="warning">No prompt data found for this provider.</Alert>
          ) : null}
          <Card
            elevation={0}
            sx={{
              overflow: 'hidden',
              border: '1px solid',
              borderColor: brand.rowBorder,
              borderRadius: 2,
            }}
          >
            <Box sx={{ height: 5, background: brand.topBar }} />
            <Box
              sx={{
                p: { xs: 2.5, md: 3 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                gap: 2,
                bgcolor: brand.accentMuted,
              }}
            >
              <Box
                sx={{
                  width: { xs: 64, sm: 72 },
                  height: { xs: 64, sm: 72 },
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.paper',
                  boxShadow: (theme) => theme.customShadows.z8,
                  p: 1,
                }}
              >
                <ProviderPromptIcon
                  providerId={provider}
                  imageSrc={PROMPT_PROVIDERS.find((p) => p.id === provider)?.imageSrc}
                  iconifyIcon={config?.toolIcon}
                  width={{ xs: 48, sm: 56 }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" sx={{ color: brand.accentStrong, fontWeight: 700, letterSpacing: 0.12 }}>
                  {config?.toolTitle || provider}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {config?.title || provider}
                </Typography>
                {config?.subtitle ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {config?.subtitle}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          </Card>

          <Grid container spacing={3}>
            {selectedSection ? (
              <Grid xs={12} key={selectedSection.title}>
                <Card
                  variant="outlined"
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    borderLeftWidth: 4,
                    borderLeftColor: brand.accent,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                    {selectedSection.title}
                  </Typography>

                  <Stack spacing={1.5}>
                    {(selectedSection.items || []).map((item, promptIndex) => {
                      const promptText = item.prompt;
                      const useCaseLabel = item.useCase || `Use case ${promptIndex + 1}`;
                      return (
                        <Box
                          key={`${selectedSection.title}-${promptIndex}`}
                          onMouseDown={() => startLongPressCopy(promptText)}
                          onMouseUp={clearLongPressCopy}
                          onMouseLeave={clearLongPressCopy}
                          onTouchStart={() => startLongPressCopy(promptText)}
                          onTouchEnd={clearLongPressCopy}
                          sx={{
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: brand.rowBg,
                            border: '1px solid',
                            borderColor: brand.rowBorder,
                            display: 'grid',
                            gap: 1.25,
                            gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
                          }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
                            <Typography variant="caption" sx={{ color: brand.accentStrong, display: 'block', mb: 0.4, fontWeight: 700 }}>
                              Use case
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {useCaseLabel}
                            </Typography>
                          </Box>

                          <Box>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.4 }}>
                              <Typography variant="caption" sx={{ color: brand.accentStrong, display: 'block', fontWeight: 700 }}>
                                Prompt
                              </Typography>
                              <IconButton
                                size="small"
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyPrompt(promptText);
                                }}
                                aria-label="Copy prompt"
                                sx={{
                                  color: brand.accent,
                                  '&:hover': { bgcolor: brand.accentMuted },
                                }}
                              >
                                <Iconify icon="solar:copy-bold" width={18} />
                              </IconButton>
                            </Stack>
                            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                              <Box
                                sx={{
                                  '& img': {
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: 1,
                                    mt: 1,
                                    cursor: 'copy',
                                  },
                                  '& p': { my: 0.75 },
                                }}
                                onClick={(event) => {
                                  const target = event.target;
                                  if (target instanceof HTMLImageElement) {
                                    copyImageFromUrl(target.src);
                                  }
                                }}
                                dangerouslySetInnerHTML={{ __html: promptText }}
                              />
                            </Typography>
                            <Box sx={{ clear: 'both', height: 0 }} />
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 'auto', pt: 1.25 }}>
                              <Button
                                size="small"
                                variant="contained"
                                disableElevation
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                                onClick={(e) => handleTryIt(e, promptText)}
                                sx={{
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  bgcolor: brand.accentStrong,
                                  color: '#fff',
                                  '&:hover': { bgcolor: brand.accent },
                                }}
                              >
                                Try in {config?.toolTitle || provider}
                              </Button>
                            </Stack>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Card>
              </Grid>
            ) : null}
          </Grid>
        </Stack>
      </DashboardContent>

      <Snackbar
        open={copyToastOpen}
        autoHideDuration={1800}
        onClose={() => setCopyToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setCopyToastOpen(false)}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

