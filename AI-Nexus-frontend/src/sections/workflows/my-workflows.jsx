import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { getProviderMetadataList } from 'src/sections/workflows/data/prompt-providers';
import { getProviderPromptTheme } from 'src/sections/workflows/provider-prompt-theme';
import { ProviderPromptIcon } from 'src/sections/workflows/provider-prompt-icon';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export function MyWorkflows() {
  const theme = useTheme();
  const router = useRouter();
  const [promptLevels, setPromptLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const totalProviders = promptLevels.length;
  const totalPrompts = promptLevels.reduce((sum, p) => sum + Number(p.promptCount || 0), 0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await getProviderMetadataList();
        if (mounted) {
          setPromptLevels(rows);
        }
      } catch (error) {
        toast.error(error?.message || 'Failed to load prompt providers');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenPromptPage = (provider) => {
    router.push(paths.workflowsPrompt.details(provider));
  };

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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Box>
      {/* Prompt levels for AI agent ingestion */}
      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: { xs: 3, md: 4 } }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Prompts
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
              {promptLevels.map((level) => {
                const t = getProviderPromptTheme(level.id, {
                  color: resolveProviderColor(level.color),
                  bgColor: resolveProviderColor(level.bgColor),
                });
                const gpt = t.chatAppUi;
                return (
                  <Stack
                    key={level.id}
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 10,
                      typography: 'caption',
                      fontWeight: 700,
                      letterSpacing: 0.02,
                      border: '1px solid',
                      ...(gpt
                        ? {
                            color: t.accent,
                            bgcolor: t.chatElevated,
                            borderColor: t.chatBorderAccent,
                          }
                        : {
                            color: t.accentStrong,
                            bgcolor: t.accentMuted,
                            borderColor: t.rowBorder,
                          }),
                    }}
                  >
                    <ProviderPromptIcon
                      providerId={level.id}
                      iconifyIcon={level.icon}
                      width={16}
                      sx={{ color: gpt ? t.accent : t.accentStrong }}
                    />
                    <Box component="span">{level.title}</Box>
                  </Stack>
                );
              })}
            </Stack>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: { xs: '1rem', md: '1.0625rem' }, lineHeight: 1.6 }}>
            Access curated AI prompt libraries for finance workflows, updated regularly for practical day-to-day use.
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={{ xs: 2, md: 3 }}>
          {promptLevels.map((level) => {
            const brand = getProviderPromptTheme(level.id, {
              color: resolveProviderColor(level.color),
              bgColor: resolveProviderColor(level.bgColor),
            });
            const gpt = brand.chatAppUi;
            return (
            <Grid key={level.id} xs={12} md={4}>
              <Card
                variant="outlined"
                onClick={() => handleOpenPromptPage(level.id)}
                sx={{
                  p: 0,
                  height: '100%',
                  overflow: 'hidden',
                  borderRadius: 2,
                  borderWidth: 1,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  ...(gpt
                    ? {
                        bgcolor: brand.chatCard,
                        borderColor: brand.chatBorderAccent,
                        '&:hover': {
                          borderColor: brand.accent,
                          boxShadow: '0 12px 40px -12px rgba(16, 163, 127, 0.35)',
                        },
                      }
                    : {
                        borderColor: brand.rowBorder,
                        '&:hover': {
                          borderColor: brand.accent,
                          boxShadow: (theme) => `0 12px 40px -12px ${brand.accent}40`,
                        },
                      }),
                }}
              >
                <Box sx={{ height: 4, background: brand.topBar }} />
                <Box
                  sx={{
                    p: 2.5,
                    ...(gpt && { bgcolor: brand.chatCard, color: brand.chatText }),
                  }}
                >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...(gpt
                        ? {
                            bgcolor: brand.chatIconTile,
                            border: '1px solid',
                            borderColor: brand.chatBorderAccent,
                          }
                        : { bgcolor: brand.accentMuted }),
                    }}
                  >
                    <ProviderPromptIcon
                      providerId={level.id}
                      iconifyIcon={level.icon}
                      width={28}
                      sx={{ color: gpt ? '#ffffff' : brand.accent }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="overline" sx={{ color: brand.accent, fontWeight: 700, letterSpacing: 0.08, lineHeight: 1.2, display: 'block' }}>
                      Prompt pack
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '1.125rem', md: '1.25rem' },
                        color: gpt ? brand.chatText : 'text.primary',
                      }}
                    >
                      {level.title}
                    </Typography>
                  </Box>
                  <Iconify icon="solar:arrow-right-up-line-duotone" width={22} sx={{ color: brand.accent }} />
                </Stack>

                <Typography
                  variant="body1"
                  sx={{
                    mb: 2,
                    fontSize: { xs: '0.9375rem', md: '1rem' },
                    lineHeight: 1.6,
                    color: gpt ? brand.chatTextMuted : 'text.secondary',
                  }}
                >
                  {level.description}
                </Typography>

                <Stack spacing={1}>
                  <Typography
                    variant="body2"
                    sx={{
                      display: 'block',
                      fontSize: { xs: '0.875rem', md: '0.9375rem' },
                      lineHeight: 1.55,
                      pl: 1.25,
                      borderLeft: '3px solid',
                      borderColor: brand.accent,
                      color: gpt ? brand.chatTextMuted : 'text.secondary',
                    }}
                  >
                    {`${level.promptCount || 0} curated prompts`}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      display: 'block',
                      fontSize: { xs: '0.875rem', md: '0.9375rem' },
                      lineHeight: 1.55,
                      pl: 1.25,
                      borderLeft: '3px solid',
                      borderColor: brand.accent,
                      color: gpt ? brand.chatTextMuted : 'text.secondary',
                    }}
                  >
                    {`${level.categoryCount || 0} categories`}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      display: 'block',
                      fontSize: { xs: '0.875rem', md: '0.9375rem' },
                      lineHeight: 1.55,
                      pl: 1.25,
                      borderLeft: '3px solid',
                      borderColor: brand.accent,
                      color: gpt ? brand.chatTextMuted : 'text.secondary',
                    }}
                  >
                    {`Try it opens ${level.title || 'tool'}`}
                  </Typography>
                </Stack>
                </Box>
              </Card>
            </Grid>
            );
          })}
        </Grid>

        <Box sx={{ mt: { xs: 3, md: 4 } }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Tools
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontSize: { xs: '0.9375rem', md: '1rem' }, lineHeight: 1.6 }}
          >
                Coming soon...
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}

