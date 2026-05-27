import { m } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
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

import { hasCeoLaunchContent, resolveCeoLaunchContent } from './ceo-launch-defaults';

// ----------------------------------------------------------------------

const HEADER_CONTENT_PX = { xs: 0, sm: 2, md: 4, lg: 6 };
const SECTION_MAX_WIDTH = '100%';

const SECTION_BG = '#f3f6fb';
const CARD_BORDER = '#deE8f5';
const FEATURE_ICONS = [
  'solar:chart-square-bold-duotone',
  'solar:users-group-two-rounded-bold-duotone',
  'solar:target-bold-duotone',
  'solar:rocket-bold-duotone',
];

function isImageIcon(icon) {
  const raw = String(icon || '').trim();
  return /^https?:\/\//i.test(raw) || raw.startsWith('/uploads/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(raw);
}

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

  const heading = String(content.heading || '').trim() || 'Why AI Fluency Matters';
  const eyebrow = String(content.eyebrow || '').trim();
  const subtitle = String(content.subtitle || '').trim();
  const quote = String(content.quote || '').trim();
  const iconSize = Math.max(16, Math.min(56, Number(content?.statIconSize) || 30));
  const normalizedStats = stats.slice(0, 4).map((row, index) => ({
    icon: String(row?.icon || '').trim() || FEATURE_ICONS[index % FEATURE_ICONS.length],
    label: String(row?.label || row?.value || '').trim(),
  })).filter((row) => row.label);
  const rightTitle = eyebrow || 'CEO Launch Message';
  const rightSubtitle = subtitle || quote;

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 2, md: 2.5 },
        bgcolor: SECTION_BG,
      }}
    >
      <DashboardContent
        component={MotionViewport}
        sx={{
          width: 1,
          maxWidth: SECTION_MAX_WIDTH,
          mx: 'auto',
          px: { xs: 1.25, sm: 2, md: 3, lg: 4 },
        }}
      >
        <Box
          component={m.div}
          variants={varFade({ distance: 20 }).inUp}
          sx={{
            width: 1,
          }}
        >
          <Grid container spacing={{ xs: 1.2, md: 1.6 }} alignItems="stretch">
            <Grid xs={12} md={8}>
              <Stack
                spacing={1.4}
                sx={{
                  height: 1,
                  borderRadius: 2,
                  bgcolor: 'common.white',
                  border: `1px solid ${CARD_BORDER}`,
                  px: { xs: 1.25, sm: 2, md: 2.25 },
                  py: { xs: 1.25, sm: 1.5 },
                }}
              >
                <Box>
                  <Typography
                    component="h2"
                    sx={{
                      m: 0,
                      fontWeight: 700,
                      fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.55rem' },
                      lineHeight: 1.15,
                      color: '#1d3260',
                    }}
                  >
                    {heading}
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.45,
                      width: 30,
                      height: 3,
                      borderRadius: 999,
                      bgcolor: '#ef404e',
                    }}
                  />
                </Box>

                <Grid container spacing={{ xs: 0.8, md: 1 }}>
                  {normalizedStats.map((stat, index) => (
                    <Grid key={`ceo-feature-${index}`} xs={6} sm={3}>
                      <Stack
                        spacing={0.7}
                        sx={{
                          height: 1,
                          minHeight: { xs: 122, sm: 132 },
                          borderRadius: 1.4,
                          border: `1px solid ${CARD_BORDER}`,
                          bgcolor: '#ffffff',
                          px: { xs: 1, sm: 1.1 },
                          py: { xs: 1.1, sm: 1.2 },
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                        }}
                      >
                        {isImageIcon(stat.icon) ? (
                          <Box
                            component="img"
                            src={resolveAssetUrl(stat.icon)}
                            alt=""
                            sx={{ width: iconSize, height: iconSize, objectFit: 'contain' }}
                          />
                        ) : (
                          <Iconify
                            icon={stat.icon}
                            width={iconSize}
                            sx={{ color: index % 2 === 0 ? '#ef404e' : '#1f4bb8' }}
                          />
                        )}
                        <Typography
                          sx={{
                            m: 0,
                            fontSize: { xs: '0.72rem', sm: '0.76rem' },
                            fontWeight: 600,
                            lineHeight: 1.35,
                            color: '#22314f',
                            maxWidth: 150,
                          }}
                        >
                          {stat.label}
                        </Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Grid>

            <Grid xs={12} md={4}>
              <Box
                component={m.div}
                variants={varFade({ distance: 22 }).inUp}
                sx={{
                  position: 'relative',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  height: 1,
                  minHeight: { xs: 200, sm: 220, md: 192 },
                  width: 1,
                  border: `1px solid ${CARD_BORDER}`,
                  bgcolor: '#0c3f90',
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
                    alt={rightTitle}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: 1,
                      height: 1,
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                    }}
                  />
                ) : null}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(90deg, rgba(10,37,86,0.92) 0%, rgba(15,70,165,0.78) 52%, rgba(16,87,196,0.45) 100%)',
                  }}
                />
                <Stack
                  sx={{
                    position: 'relative',
                    zIndex: 2,
                    p: { xs: 1.2, sm: 1.4 },
                    height: 1,
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        m: 0,
                        color: 'common.white',
                        fontWeight: 700,
                        fontSize: { xs: '1rem', sm: '1.12rem' },
                        lineHeight: 1.2,
                      }}
                    >
                      {rightTitle}
                    </Typography>
                    {rightSubtitle ? (
                      <RichTextContent
                        html={rightSubtitle}
                        sx={{
                          mt: 0.55,
                          color: alpha('#fff', 0.9),
                          fontSize: { xs: '0.76rem', sm: '0.8rem' },
                          lineHeight: 1.35,
                          maxWidth: 200,
                          '& p': { m: 0 },
                        }}
                      />
                    ) : (
                      <Typography
                        sx={{
                          m: 0,
                          mt: 0.55,
                          color: alpha('#fff', 0.9),
                          fontSize: { xs: '0.76rem', sm: '0.8rem' },
                          lineHeight: 1.35,
                          maxWidth: 200,
                        }}
                      >
                        Watch how ISCA is leading this national movement.
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    {playTarget ? (
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'common.white',
                          color: '#0f4cb7',
                          boxShadow: `0 8px 24px ${alpha('#000', 0.35)}`,
                        }}
                      >
                        <Iconify icon="solar:play-bold" width={28} />
                      </Box>
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Box>
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
