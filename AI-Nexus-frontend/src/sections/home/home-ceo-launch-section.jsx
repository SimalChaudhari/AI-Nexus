import { m } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

import { hasCeoLaunchContent, resolveCeoLaunchContent } from './ceo-launch-defaults';

// ----------------------------------------------------------------------

const HEADER_CONTENT_PX = { xs: 0, sm: 2, md: 4, lg: 6 };
const SECTION_MAX_WIDTH = 1200;

const SECTION_BG = '#0c1624';

function resolveAssetUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function getVideoEmbedUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  try {
    if (/youtube\.com\/watch/i.test(raw)) {
      const id = new URL(raw).searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : '';
    }
    if (/youtu\.be\//i.test(raw)) {
      const id = raw.split('youtu.be/')[1]?.split(/[?#]/)[0];
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : '';
    }
    if (/youtube\.com\/embed\//i.test(raw)) {
      return raw.includes('?') ? `${raw}&autoplay=1` : `${raw}?autoplay=1`;
    }
  } catch {
    return raw;
  }
  return raw;
}

function isDirectVideoUrl(url) {
  const raw = String(url || '').trim();
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(raw) || raw.startsWith('/uploads/');
}

export function HomeCeoLaunchSection() {
  const theme = useTheme();
  const [content, setContent] = useState(() => resolveCeoLaunchContent(null));
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(resolveCeoLaunchContent(settings?.homeCeoLaunchContent));
      })
      .catch(() => {
        if (active) setContent(resolveCeoLaunchContent(null));
      });
    return () => {
      active = false;
    };
  }, []);

  const posterUrl = useMemo(() => resolveAssetUrl(content.posterImageUrl), [content.posterImageUrl]);
  const uploadedVideoSrc = useMemo(
    () => resolveAssetUrl(content.videoFileUrl),
    [content.videoFileUrl]
  );
  const externalVideoUrl = String(content.videoUrl || '').trim();
  const hasUploadedVideo = Boolean(uploadedVideoSrc);
  const embedUrl = useMemo(
    () => (hasUploadedVideo ? '' : getVideoEmbedUrl(externalVideoUrl)),
    [hasUploadedVideo, externalVideoUrl]
  );
  const playbackSrc = hasUploadedVideo ? uploadedVideoSrc : externalVideoUrl;
  const directVideo = hasUploadedVideo || isDirectVideoUrl(externalVideoUrl);
  const playTarget = playbackSrc || content.ctaHref;

  const stats = (content.stats || []).filter(
    (s) => String(s?.value || '').trim() || String(s?.label || '').trim()
  );

  const openVideo = () => {
    if (!playTarget) return;
    if (embedUrl || directVideo) {
      setVideoOpen(true);
      return;
    }
    if (/^https?:\/\//i.test(playTarget)) {
      window.open(playTarget, '_blank', 'noopener,noreferrer');
    }
  };

  if (!hasCeoLaunchContent(content)) return null;

  const eyebrow = String(content.eyebrow || '').trim();
  const heading = String(content.heading || '').trim();
  const subtitleHtml = String(content.subtitle || '');
  const quote = String(content.quote || '').trim();
  const ctaLabel = String(content.ctaLabel || '').trim() || 'Play CEO Message';

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 6, md: 9 },
        bgcolor: SECTION_BG,
        color: 'common.white',
      }}
    >
      <DashboardContent
        component={MotionViewport}
        disablePadding
        sx={{
          width: 1,
          maxWidth: '100%',
          px: HEADER_CONTENT_PX,
        }}
      >
        <Stack
          spacing={{ xs: 4, md: 5 }}
          sx={{
            width: 1,
            maxWidth: SECTION_MAX_WIDTH,
            mx: 'auto',
          }}
        >
          <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
            {eyebrow ? (
              <Typography
                component="p"
                variants={varFade({ distance: 12 }).inUp}
                sx={{
                  m: 0,
                  fontWeight: 800,
                  letterSpacing: { xs: 1.4, md: 2 },
                  textTransform: 'uppercase',
                  fontSize: { xs: '0.65rem', md: '0.72rem' },
                  color: 'warning.main',
                }}
              >
                {eyebrow}
              </Typography>
            ) : null}
            {heading ? (
              <Typography
                component="h2"
                variants={varFade({ distance: 16 }).inUp}
                sx={{
                  m: 0,
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.35rem' },
                  lineHeight: 1.15,
                  color: 'common.white',
                  letterSpacing: -0.3,
                }}
              >
                {heading}
              </Typography>
            ) : null}
            {!isEffectivelyEmptyHtml(subtitleHtml) ? (
              <RichTextContent
                html={subtitleHtml}
                variants={varFade({ distance: 14 }).inUp}
                sx={{
                  typography: 'body1',
                  color: alpha(theme.palette.common.white, 0.72),
                  lineHeight: 1.7,
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  maxWidth: 640,
                  '& p': { m: 0, mb: 0.75, '&:last-child': { mb: 0 } },
                }}
              />
            ) : null}
          </Stack>

          <Grid container spacing={{ xs: 3, md: 4 }} alignItems="stretch">
            <Grid xs={12} md={7}>
              <Box
                component={m.div}
                variants={varFade({ distance: 22 }).inUp}
                sx={{
                  position: 'relative',
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  bgcolor: alpha(theme.palette.common.black, 0.45),
                  border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                  aspectRatio: { xs: '16 / 10', md: '16 / 9' },
                  cursor: playTarget ? 'pointer' : 'default',
                }}
                onClick={playTarget ? openVideo : undefined}
                role={playTarget ? 'button' : undefined}
                tabIndex={playTarget ? 0 : undefined}
                onKeyDown={(e) => {
                  if (playTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    openVideo();
                  }
                }}
              >
                {posterUrl ? (
                  <Box
                    component="img"
                    src={posterUrl}
                    alt={heading || 'CEO launch message'}
                    sx={{
                      width: 1,
                      height: 1,
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 1,
                      height: 1,
                      background: `linear-gradient(145deg, ${alpha(theme.palette.secondary.dark, 0.9)} 0%, ${alpha(theme.palette.grey[900], 0.95)} 100%)`,
                    }}
                  />
                )}

                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.common.black, posterUrl ? 0.35 : 0.2),
                    transition: 'background-color 0.25s ease',
                    '&:hover': playTarget
                      ? { bgcolor: alpha(theme.palette.common.black, posterUrl ? 0.5 : 0.35) }
                      : undefined,
                  }}
                >
                  {playTarget ? (
                    <Box
                      sx={{
                        width: { xs: 64, md: 72 },
                        height: { xs: 64, md: 72 },
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'common.white',
                        color: 'secondary.dark',
                        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`,
                      }}
                    >
                      <Iconify icon="solar:play-bold" width={32} />
                    </Box>
                  ) : null}
                </Box>
              </Box>
            </Grid>

            <Grid xs={12} md={5}>
              <Stack
                component={m.div}
                variants={varFade({ distance: 22 }).inUp}
                spacing={3}
                sx={{ height: 1 }}
              >
                {quote ? (
                  <Box
                    sx={{
                      p: { xs: 2.5, md: 3 },
                      borderRadius: 2.5,
                      border: `1px solid ${alpha(theme.palette.common.white, 0.14)}`,
                      bgcolor: alpha(theme.palette.common.white, 0.04),
                    }}
                  >
                    <Typography
                      component="blockquote"
                      sx={{
                        m: 0,
                        fontStyle: 'italic',
                        fontSize: { xs: '0.95rem', md: '1.05rem' },
                        lineHeight: 1.65,
                        color: alpha(theme.palette.common.white, 0.88),
                      }}
                    >
                      &ldquo;{quote}&rdquo;
                    </Typography>
                  </Box>
                ) : null}

                {stats.length > 0 ? (
                  <Stack
                    direction="row"
                    alignItems="flex-start"
                    sx={{
                      width: 1,
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      gap: { xs: 2, sm: 2.5, md: 3 },
                    }}
                  >
                    {stats.map((stat, index) => {
                      const value = String(stat.value || '').trim();
                      const label = String(stat.label || '').trim();
                      if (!value && !label) return null;

                      return (
                        <Box
                          key={`ceo-stat-${index}`}
                          sx={{
                            flex: '1 1 0',
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'stretch',
                            ...(index > 0
                              ? {
                                  pl: { xs: 0, sm: 2.5, md: 3 },
                                  borderLeft: {
                                    xs: 'none',
                                    sm: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                                  },
                                }
                              : {}),
                          }}
                        >
                          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                            {value ? (
                              <Typography
                                sx={{
                                  m: 0,
                                  fontWeight: 800,
                                  fontSize: { xs: '1.2rem', sm: '1.25rem', md: '1.35rem' },
                                  lineHeight: 1.1,
                                  color: 'primary.main',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {value}
                              </Typography>
                            ) : null}
                            {label ? (
                              <Typography
                                sx={{
                                  m: 0,
                                  fontSize: { xs: '0.68rem', sm: '0.72rem', md: '0.75rem' },
                                  lineHeight: 1.35,
                                  color: alpha(theme.palette.common.white, 0.62),
                                }}
                              >
                                {label}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                ) : null}

                {playTarget ? (
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={openVideo}
                    startIcon={<Iconify icon="solar:play-circle-bold" width={22} />}
                    sx={{
                      alignSelf: 'flex-start',
                      borderColor: alpha(theme.palette.common.white, 0.5),
                      color: 'common.white',
                      px: 2.5,
                      py: 1.25,
                      '&:hover': {
                        borderColor: 'common.white',
                        bgcolor: alpha(theme.palette.common.white, 0.08),
                      },
                    }}
                  >
                    {ctaLabel}
                  </Button>
                ) : null}
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </DashboardContent>

      <Dialog
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'grey.900',
            backgroundImage: 'none',
            overflow: 'hidden',
          },
        }}
      >
        <IconButton
          onClick={() => setVideoOpen(false)}
          aria-label="Close video"
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 2,
            color: 'common.white',
            bgcolor: alpha(theme.palette.common.black, 0.5),
            '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.7) },
          }}
        >
          <Iconify icon="mingcute:close-line" width={22} />
        </IconButton>
        <Box
          sx={{
            position: 'relative',
            width: 1,
            pt: '56.25%',
            bgcolor: 'common.black',
          }}
        >
          {embedUrl && !directVideo ? (
            <Box
              component="iframe"
              src={embedUrl}
              title={heading || 'CEO launch video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sx={{
                position: 'absolute',
                inset: 0,
                width: 1,
                height: 1,
                border: 0,
              }}
            />
          ) : directVideo ? (
            <Box
              component="video"
              src={resolveAssetUrl(playbackSrc)}
              controls
              autoPlay
              sx={{
                position: 'absolute',
                inset: 0,
                width: 1,
                height: 1,
              }}
            />
          ) : null}
        </Box>
      </Dialog>
    </Box>
  );
}
