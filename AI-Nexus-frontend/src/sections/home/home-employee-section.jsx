import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { CONFIG } from 'src/config-global';
import { appSettingsService } from 'src/services/app-settings.service';

import { resolveEmployeeContent, hasEmployeeContent } from './employee-defaults';

// ----------------------------------------------------------------------

const MOBILE_ONE_CARD_MAX_PX = 375;
const HOVER_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || '').trim());
}

function normalizeAppPath(href) {
  const h = String(href || '').trim();
  if (!h || isExternalHref(h)) return h;
  return h.startsWith('/') ? h : `/${h}`;
}

function resolveAssetUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function CtaButton({ label, href, variant = 'contained', icon, onDark = false }) {
  if (!label?.trim() || !href?.trim()) return null;
  const external = isExternalHref(href);
  const common = {
    size: 'large',
    startIcon: icon ? <Iconify icon={icon} width={20} /> : null,
    sx: {
      fontWeight: 700,
      px: 2.5,
      py: 1.35,
      borderRadius: 1.5,
      textTransform: 'none',
      whiteSpace: 'nowrap',
    },
  };

  if (variant === 'outlined') {
    const sx = onDark
      ? {
          ...common.sx,
          color: 'common.white',
          borderColor: alpha('#fff', 0.45),
          bgcolor: 'transparent',
          '&:hover': {
            borderColor: 'common.white',
            bgcolor: alpha('#fff', 0.08),
          },
        }
      : {
          ...common.sx,
          color: 'primary.main',
          borderColor: (t) => alpha(t.palette.primary.main, 0.4),
          bgcolor: 'common.white',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
          },
        };
    return external ? (
      <Button component="a" href={href} target="_blank" rel="noopener noreferrer" variant="outlined" {...common} sx={sx}>
        {label}
      </Button>
    ) : (
      <Button component={RouterLink} href={normalizeAppPath(href)} variant="outlined" {...common} sx={sx}>
        {label}
      </Button>
    );
  }

  const sx = {
    ...common.sx,
    color: 'primary.contrastText',
    bgcolor: 'primary.main',
    boxShadow: (t) => `0 8px 24px ${alpha(t.palette.primary.main, 0.28)}`,
    '&:hover': {
      bgcolor: 'primary.dark',
      boxShadow: (t) => `0 12px 28px ${alpha(t.palette.primary.main, 0.38)}`,
    },
  };

  return external ? (
    <Button component="a" href={href} target="_blank" rel="noopener noreferrer" variant="contained" {...common} sx={sx}>
      {label}
    </Button>
  ) : (
    <Button component={RouterLink} href={normalizeAppPath(href)} variant="contained" {...common} sx={sx}>
      {label}
    </Button>
  );
}

function BenefitCard({ row }) {
  const theme = useTheme();
  const primary = theme.palette.primary;
  const iconColor = row.iconColor || primary.main;

  return (
    <Box
      className="employee-benefit-card"
      sx={{
        height: 1,
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        bgcolor: 'common.white',
        border: `1px solid ${alpha(primary.main, 0.12)}`,
        boxShadow: `0 4px 20px ${alpha(theme.palette.grey[500], 0.08)}`,
        transition: (t) =>
          t.transitions.create(['transform', 'box-shadow', 'border-color', 'background-color'], {
            duration: t.transitions.duration.standard,
            easing: HOVER_EASE,
          }),
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            transform: 'translateY(-6px) scale(1.02)',
            bgcolor: alpha(primary.main, 0.03),
            borderColor: alpha(primary.main, 0.35),
            boxShadow: `0 16px 36px ${alpha(primary.main, 0.14)}, 0 8px 20px ${alpha(theme.palette.grey[500], 0.1)}`,
            '& .employee-benefit-icon': {
              transform: 'scale(1.08) rotate(-4deg)',
              bgcolor: alpha(primary.main, 0.14),
            },
          },
        },
      }}
    >
      {row.icon ? (
        <Box
          className="employee-benefit-icon"
          sx={{
            width: 44,
            height: 44,
            mb: 1.75,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(primary.main, 0.08),
            color: iconColor,
            border: `1px solid ${alpha(primary.main, 0.18)}`,
            transition: (t) => t.transitions.create('transform', { duration: 300, easing: HOVER_EASE }),
          }}
        >
          <Iconify icon={row.icon} width={22} />
        </Box>
      ) : null}
      {row.title ? (
        <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: '1rem', mb: 1, lineHeight: 1.3 }}>
          {String(row.title).trim()}
        </Typography>
      ) : null}
      {row.description ? (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.65 }}>
          {String(row.description).trim()}
        </Typography>
      ) : null}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function HomeEmployeeSection() {
  const theme = useTheme();
  const primary = theme.palette.primary;
  const heroBase = theme.palette.common.white;
  const heroTint = alpha(primary.lighter, 0.45);
  const isNarrowBenefitGrid = useMediaQuery(`(max-width:${MOBILE_ONE_CARD_MAX_PX}px)`, { noSsr: true });

  const [content, setContent] = useState(() => resolveEmployeeContent(null, null));
  const [companyLogos, setCompanyLogos] = useState([]);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(
          resolveEmployeeContent(settings?.homeEmployeeContent, settings?.homeEmployerContent)
        );
        const logos = Array.isArray(settings?.homeEmployerContent?.logos)
          ? settings.homeEmployerContent.logos
          : [];
        setCompanyLogos(
          logos
            .map((row) => ({
              name: String(row?.name || '').trim(),
              logoUrl: resolveAssetUrl(row?.logoUrl),
            }))
            .filter((row) => row.logoUrl)
        );
      })
      .catch(() => {
        if (active) {
          setContent(resolveEmployeeContent(null, null));
          setCompanyLogos([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!hasEmployeeContent(content)) return null;

  const benefits = (content.benefits || []).filter(
    (row) => String(row?.title || '').trim() || String(row?.description || '').trim()
  );
  const heroSrc = resolveAssetUrl(content.heroImageUrl);
  const heroPanelTitle = String(content.heroPanelTitle || '').trim();
  const heroPanelSubtitle = String(content.heroPanelSubtitle || '').trim();
  const showHeroPanelText = Boolean(heroPanelTitle || heroPanelSubtitle);

  const benefitsSectionBg = 'linear-gradient(180deg, #f8fafc 0%, #eef4fa 48%, #f8fafc 100%)';

  const heroFadeOverlay = {
    xs: `linear-gradient(180deg, ${heroBase} 0%, ${heroBase} 36%, ${alpha(heroBase, 0.94)} 50%, ${heroTint} 64%, transparent 88%)`,
    md: `linear-gradient(90deg, ${heroBase} 0%, ${heroBase} 21%, ${alpha(heroBase, 0.9)} 30%, ${alpha(heroBase, 0.55)} 39%, ${alpha(primary.lighter, 0.24)} 49%, ${alpha(primary.lighter, 0.08)} 58%, transparent 66%)`,
  };

  const heroSectionBg = `linear-gradient(135deg, ${heroBase} 0%, ${alpha(primary.lighter, 0.35)} 55%, ${alpha(primary.lighter, 0.18)} 100%)`;
  const displayLogos = companyLogos;

  return (
    <Box component="section" sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Seamless light hero — soft primary tint on white, image blends in */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: 'common.white',
          background: heroSectionBg,
          minHeight: { xs: heroSrc ? 520 : 400, sm: 460, md: 440 },
          overflow: 'hidden',
        }}
      >
        {heroSrc ? (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: { md: '68%' },
              height: '100%',
              display: { xs: 'none', md: 'block' },
              backgroundImage: `url(${heroSrc})`,
              backgroundSize: 'cover',
              backgroundPosition: { md: '70% center', lg: '74% center' },
              backgroundRepeat: 'no-repeat',
            }}
          />
        ) : (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse 80% 70% at 85% 50%, ${alpha(primary.lighter, 0.5)} 0%, transparent 60%)`,
            }}
          />
        )}

        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background: heroFadeOverlay,
            pointerEvents: 'none',
          }}
        />

        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 55% 80% at 0% 50%, ${alpha(primary.lighter, 0.35)} 0%, transparent 55%)`,
            pointerEvents: 'none',
          }}
        />

        <DashboardContent
          component={MotionViewport}
          sx={{
            position: 'relative',
            zIndex: 1,
            py: { xs: 6, md: 8 },
            minHeight: { xs: heroSrc ? 520 : 400, sm: 460, md: 440 },
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {heroSrc ? (
            <Box
              component={m.div}
              variants={varFade({ distance: 20 }).inUp}
              sx={{
                display: { xs: 'block', md: 'none' },
                width: 1,
                mb: 2.25,
                borderRadius: 2,
                overflow: 'hidden',
                border: `1px solid ${alpha(primary.main, 0.18)}`,
                boxShadow: `0 14px 34px ${alpha(primary.main, 0.16)}`,
              }}
            >
              <Box
                component="img"
                src={heroSrc}
                alt={heroPanelTitle || content.heading || 'Employee'}
                sx={{
                  width: 1,
                  height: 220,
                  objectFit: 'cover',
                  objectPosition: 'center 30%',
                  display: 'block',
                }}
              />
            </Box>
          ) : null}

          <Grid container alignItems="center" sx={{ width: 1 }}>
            <Grid xs={12} md={heroSrc ? 6.5 : 12}>
              <Stack spacing={2.5} sx={{ maxWidth: { xs: 1, md: 560 }, pr: { md: 2 } }}>
                {content.eyebrow ? (
                  <Typography
                    component={m.p}
                    variant="overline"
                    variants={varFade({ distance: 12 }).inUp}
                    sx={{
                      color: 'primary.main',
                      fontWeight: 800,
                      letterSpacing: 2,
                    }}
                  >
                    {content.eyebrow}
                  </Typography>
                ) : null}

                {(content.heading || content.headingAccent) && (
                  <Typography
                    component={m.h2}
                    variants={varFade({ distance: 20 }).inUp}
                    sx={{
                      m: 0,
                      color: 'text.primary',
                      fontWeight: 800,
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '2.85rem' },
                      lineHeight: 1.12,
                    }}
                  >
                    {content.heading ? (
                      <Box component="span" sx={{ display: 'block' }}>
                        {content.heading}
                      </Box>
                    ) : null}
                    {content.headingAccent ? (
                      <Box
                        component="span"
                        sx={{
                          display: 'block',
                          background: `linear-gradient(90deg, ${primary.light} 0%, ${primary.main} 55%, ${primary.dark} 100%)`,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          color: 'transparent',
                        }}
                      >
                        {content.headingAccent}
                      </Box>
                    ) : null}
                  </Typography>
                )}

                {content.subtitle ? (
                  <Box component={m.div} variants={varFade({ distance: 14 }).inUp} sx={{ maxWidth: 520 }}>
                    <RichTextContent
                      html={content.subtitle}
                      sx={{
                        color: 'text.secondary',
                        typography: 'body1',
                        lineHeight: 1.75,
                        '& p': { m: 0 },
                      }}
                    />
                  </Box>
                ) : null}

                <Stack
                  component={m.div}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  flexWrap="wrap"
                  variants={varFade({ distance: 12 }).inUp}
                >
                  <CtaButton
                    label={content.primaryCtaLabel}
                    href={content.primaryCtaHref}
                    icon="solar:hand-shake-bold"
                  />
                  <CtaButton
                    label={content.secondaryCtaLabel}
                    href={content.secondaryCtaHref}
                    variant="outlined"
                    icon="solar:download-minimalistic-bold"
                  />
                </Stack>
              </Stack>
            </Grid>

          </Grid>

          {showHeroPanelText && heroSrc ? (
            <Stack
              component={m.div}
              spacing={0.75}
              variants={varFade({ distance: 16 }).inUp}
              sx={{
                display: { xs: 'none', md: 'flex' },
                position: 'absolute',
                right: { md: 32, lg: 48 },
                bottom: { md: 32, lg: 40 },
                zIndex: 2,
                maxWidth: 300,
                textAlign: 'right',
              }}
            >
              {heroPanelTitle ? (
                <Typography
                  sx={{
                    color: alpha('#fff', 0.92),
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    textShadow: `0 2px 12px ${alpha('#000', 0.45)}`,
                  }}
                >
                  {heroPanelTitle}
                </Typography>
              ) : null}
              {heroPanelSubtitle ? (
                <Typography
                  sx={{
                    color: alpha('#fff', 0.72),
                    fontSize: '0.85rem',
                    textShadow: `0 1px 8px ${alpha('#000', 0.4)}`,
                  }}
                >
                  {heroPanelSubtitle}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </DashboardContent>
      </Box>

      {/* Benefits — light section below */}
      {benefits.length > 0 ? (
        <Box
          sx={{
            py: { xs: 6, md: 8 },
            bgcolor: 'common.white',
            background: benefitsSectionBg,
            position: 'relative',
          }}
        >
          <Box
            aria-hidden
            sx={{
              pointerEvents: 'none',
              position: 'absolute',
              top: -80,
              right: -60,
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(primary.main, 0.08)} 0%, transparent 68%)`,
            }}
          />

          <DashboardContent component={MotionViewport} sx={{ position: 'relative', zIndex: 1 }}>
            <Stack spacing={3} alignItems="center">
              {content.benefitsLabel ? (
                <Typography
                  component={m.p}
                  variant="overline"
                  variants={varFade({ distance: 10 }).inUp}
                  sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 2 }}
                >
                  {content.benefitsLabel}
                </Typography>
              ) : null}
              <Grid container spacing={2} sx={{ width: 1 }}>
                {benefits.map((row, index) => (
                  <Grid
                    key={`employee-benefit-${index}`}
                    component={m.div}
                    xs={isNarrowBenefitGrid ? 12 : 6}
                    sm={6}
                    md={3}
                    variants={varFade({ distance: 16 }).inUp}
                  >
                    <BenefitCard row={row} />
                  </Grid>
                ))}
              </Grid>

              {displayLogos.length > 0 ? (
                <Box
                  sx={{
                    width: 1,
                    mt: { xs: 1, md: 1.4 },
                  }}
                >
                  <Grid
                    container
                    spacing={{ xs: 1.2, md: 1.6 }}
                    sx={{ width: 1, maxWidth: 980, mx: 'auto' }}
                  >
                    {displayLogos.map((row, index) => (
                      <Grid key={`employee-company-logo-${index}`} xs={6} sm={3}>
                        <Box
                          sx={{
                            height: { xs: 76, md: 92 },
                            borderRadius: 1.5,
                            bgcolor: alpha('#fff', 0.82),
                            border: `1px solid ${alpha(primary.main, 0.12)}`,
                            backdropFilter: 'blur(8px)',
                            boxShadow: `0 12px 28px ${alpha(primary.main, 0.1)}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: { xs: 0.4, md: 0.6 },
                            transition: (t) =>
                              t.transitions.create(['transform', 'box-shadow', 'border-color'], {
                                duration: t.transitions.duration.shorter,
                              }),
                            '@media (hover: hover) and (pointer: fine)': {
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                borderColor: alpha(primary.main, 0.28),
                                boxShadow: `0 16px 34px ${alpha(primary.main, 0.16)}`,
                              },
                            },
                          }}
                        >
                          <Box
                            component="img"
                            src={row.logoUrl}
                            alt={row.name}
                            sx={{
                              width: '100%',
                              height: { xs: 56, md: 68 },
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : null}
            </Stack>
          </DashboardContent>
        </Box>
      ) : null}

    
    </Box>
  );
}
