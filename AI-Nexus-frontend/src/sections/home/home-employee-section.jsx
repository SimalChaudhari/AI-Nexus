import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { alpha, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { RichTextContent } from 'src/components/html-content';
import { varFade, MotionViewport } from 'src/components/animate';
import { DashboardContent } from 'src/layouts/dashboard';
import { CONFIG } from 'src/config-global';
import { appSettingsService } from 'src/services/app-settings.service';

import {
  resolveEmployeeContent,
  hasEmployeeContent,
  formatEmployeeHeading,
} from './employee-defaults';

// ----------------------------------------------------------------------

const NAVY = '#1C4270';
const HERO_IMAGE_WIDTH = '58%';
const SECTION_GREY = '#eceef1';
const SECTION_GREY_LIGHT = '#f4f6f8';
const SECTION_BG = `linear-gradient(180deg, ${SECTION_GREY_LIGHT} 0%, ${SECTION_GREY} 48%, ${SECTION_GREY_LIGHT} 100%)`;

const sectionBackgroundSx = {
  bgcolor: 'grey.200',
  background: SECTION_BG,
};

function EmployeeHeroBackdrop({ imageSrc }) {
  if (!imageSrc) return null;

  return (
    <Box
      aria-hidden
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        width: '100%',
        overflow: 'hidden',
        bgcolor: 'transparent',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: { md: '56%' },
          background: `
            linear-gradient(
              90deg,
              ${SECTION_GREY_LIGHT} 0%,
              ${SECTION_GREY_LIGHT} 68%,
              rgba(244, 246, 248, 0.96) 78%,
              rgba(236, 238, 241, 0.55) 88%,
              rgba(236, 238, 241, 0.18) 96%,
              transparent 100%
            )
          `,
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          top: { md: 20 },
          right: 0,
          bottom: { md: 20 },
          width: HERO_IMAGE_WIDTH,
          overflow: 'hidden',
          borderRadius: { md: '0 0 0 12px' },
        }}
      >
        <Box
          component="img"
          src={imageSrc}
          alt=""
          loading="lazy"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: '68% center',
            display: 'block',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `
              linear-gradient(
                180deg,
                rgba(244, 246, 248, 0.22) 0%,
                rgba(244, 246, 248, 0.08) 3%,
                transparent 10%
              ),
              linear-gradient(
                90deg,
                ${SECTION_GREY_LIGHT} 0%,
                rgba(244, 246, 248, 0.98) 5%,
                rgba(236, 238, 241, 0.78) 12%,
                rgba(236, 238, 241, 0.38) 22%,
                rgba(236, 238, 241, 0.1) 32%,
                transparent 44%
              ),
              linear-gradient(
                0deg,
                rgba(244, 246, 248, 0.24) 0%,
                rgba(236, 238, 241, 0.08) 5%,
                transparent 10%
              )
            `,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            boxShadow: `
              inset 0 14px 20px -12px rgba(244, 246, 248, 0.5),
              inset 48px 0 56px -20px rgba(244, 246, 248, 0.82),
              inset 0 -12px 18px -10px rgba(244, 246, 248, 0.28)
            `,
          }}
        />
      </Box>
    </Box>
  );
}

function PartnersLogoSection({ heading, logos, secondaryColor }) {
  const shouldScroll = logos.length > 5;

  return (
    <Box
      component={m.section}
      variants={varFade({ distance: 16 }).inUp}
      sx={{
        position: 'relative',
        zIndex: 1,
        bgcolor: '#ffffff',
        py: { xs: 4, md: 5.5 },
        overflow: 'hidden',
        borderTop: `1px solid ${alpha(SECTION_GREY, 0.9)}`,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 80% 60% at 12% 18%, rgba(196, 181, 253, 0.14), transparent 58%),
            radial-gradient(ellipse 72% 55% at 88% 78%, rgba(147, 197, 253, 0.16), transparent 60%),
            radial-gradient(ellipse 58% 48% at 52% 42%, rgba(251, 207, 232, 0.12), transparent 62%)
          `,
        },
      }}
    >
      <DashboardContent component={MotionViewport} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={{ xs: 2.5, md: 3 }} alignItems="center" sx={{ width: 1 }}>
          {heading ? (
            <Stack spacing={0} alignItems="center" sx={{ width: 1 }}>
              <Typography
                component="h3"
                sx={{
                  m: 0,
                  textAlign: 'center',
                  color: 'secondary.main',
                  fontWeight: 800,
                  fontSize: { xs: '1.35rem', sm: '1.55rem', md: '1.75rem' },
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                {heading}
              </Typography>

              <Box
                sx={{
                  mt: 1.5,
                  width: { xs: 72, sm: 80, md: 96 },
                  height: 4,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: (theme) =>
                    `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${secondaryColor || theme.palette.secondary.main} 100%)`,
                  boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                }}
              />
            </Stack>
          ) : null}

          <Box
            sx={{
              width: 1,
              overflow: 'hidden',
              '@keyframes employeePartnersScroll': {
                from: { transform: 'translateX(0)' },
                to: { transform: 'translateX(-50%)' },
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              sx={{
                width: shouldScroll ? 'max-content' : 1,
                minWidth: shouldScroll ? '100%' : 'auto',
                animation: shouldScroll ? 'employeePartnersScroll 34s linear infinite' : 'none',
                justifyContent: shouldScroll ? 'flex-start' : 'center',
                flexWrap: shouldScroll ? 'nowrap' : 'wrap',
                gap: { xs: 3, sm: 4, md: 5 },
                py: { xs: 0.5, md: 1 },
              }}
            >
              {(shouldScroll ? [...logos, ...logos] : logos).map((row, index) => (
                <Box
                  key={`employee-partner-logo-${index}`}
                  sx={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: { xs: 88, sm: 104, md: 120 },
                    height: { xs: 56, md: 68 },
                    px: { xs: 0.5, md: 1 },
                    opacity: 0.92,
                    transition: (theme) => theme.transitions.create(['opacity', 'transform'], { duration: 200 }),
                    '@media (hover: hover) and (pointer: fine)': {
                      '&:hover': {
                        opacity: 1,
                        transform: 'translateY(-2px)',
                      },
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={row.logoUrl}
                    alt={row.name}
                    sx={{
                      height: { xs: 44, md: 56 },
                      maxWidth: { xs: 120, md: 140 },
                      width: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DashboardContent>
    </Box>
  );
}

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

function CtaButton({ label, href, variant = 'contained', icon }) {
  if (!label?.trim() || !href?.trim()) return null;
  const external = isExternalHref(href);

  const common = {
    size: 'large',
    endIcon: variant === 'contained' && !icon ? <Iconify icon="solar:arrow-right-linear" width={18} /> : null,
    startIcon: icon ? <Iconify icon={icon} width={20} /> : null,
    sx: {
      fontWeight: 700,
      px: { xs: 2.25, md: 3 },
      py: 1.35,
      borderRadius: 1.5,
      textTransform: 'none',
      whiteSpace: { xs: 'normal', sm: 'nowrap' },
      minWidth: { sm: 180 },
    },
  };

  if (variant === 'outlined') {
    return external ? (
      <Button
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        variant="outlined"
        {...common}
        sx={{
          ...common.sx,
          color: 'secondary.main',
          borderColor: (t) => alpha(t.palette.secondary.main, 0.45),
          bgcolor: 'common.white',
          '&:hover': {
            borderColor: 'secondary.main',
            bgcolor: SECTION_GREY_LIGHT,
          },
        }}
      >
        {label}
      </Button>
    ) : (
      <Button
        component={RouterLink}
        href={normalizeAppPath(href)}
        variant="outlined"
        {...common}
        sx={{
          ...common.sx,
          color: 'secondary.main',
          borderColor: (t) => alpha(t.palette.secondary.main, 0.45),
          bgcolor: 'common.white',
          '&:hover': {
            borderColor: 'secondary.main',
            bgcolor: SECTION_GREY_LIGHT,
          },
        }}
      >
        {label}
      </Button>
    );
  }

  return external ? (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant="contained"
      {...common}
      sx={{
        ...common.sx,
        color: 'primary.contrastText',
        bgcolor: 'primary.main',
        boxShadow: (t) => `0 8px 24px ${alpha(t.palette.primary.main, 0.28)}`,
        '&:hover': {
          bgcolor: 'primary.dark',
          boxShadow: (t) => `0 12px 28px ${alpha(t.palette.primary.main, 0.38)}`,
        },
      }}
    >
      {label}
    </Button>
  ) : (
    <Button
      component={RouterLink}
      href={normalizeAppPath(href)}
      variant="contained"
      {...common}
      sx={{
        ...common.sx,
        color: 'primary.contrastText',
        bgcolor: 'primary.main',
        boxShadow: (t) => `0 8px 24px ${alpha(t.palette.primary.main, 0.28)}`,
        '&:hover': {
          bgcolor: 'primary.dark',
          boxShadow: (t) => `0 12px 28px ${alpha(t.palette.primary.main, 0.38)}`,
        },
      }}
    >
      {label}
    </Button>
  );
}

function HeroBenefitItem({ row }) {
  const theme = useTheme();
  const secondary = theme.palette.secondary;
  const iconColor = row.iconColor || secondary.main;

  return (
    <Stack
      spacing={1}
      alignItems="center"
      sx={{
        width: 1,
        textAlign: 'center',
        px: { xs: 0.5, md: 0.25, lg: 1 },
      }}
    >
      {row.icon ? (
        <Box
          sx={{
            width: { xs: 52, md: 50, lg: 58 },
            height: { xs: 52, md: 50, lg: 58 },
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            border: `2px solid ${alpha(secondary.main, 0.22)}`,
            bgcolor: 'transparent',
          }}
        >
          <Iconify icon={row.icon} width={26} />
        </Box>
      ) : null}
      {row.title ? (
        <Typography
          sx={{
            color: 'secondary.main',
            fontWeight: 700,
            fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.82rem' },
            lineHeight: 1.35,
          }}
        >
          {String(row.title).trim()}
        </Typography>
      ) : null}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function HomeEmployeeSection() {
  const theme = useTheme();
  const secondary = theme.palette.secondary;

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
    (row) => String(row?.title || '').trim()
  );
  const heroSrc = resolveAssetUrl(content.heroImageUrl);
  const displayLogos = companyLogos;
  const partnersHeading = String(content.partnersHeading || '').trim();
  const showPartners = displayLogos.length > 0;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        ...sectionBackgroundSx,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          bgcolor: 'transparent',
          minHeight: { xs: heroSrc ? 560 : 420, md: 520 },
          overflow: 'hidden',
        }}
      >
        <EmployeeHeroBackdrop imageSrc={heroSrc} />

        {!heroSrc ? (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse 75% 70% at 88% 50%, ${alpha(secondary.lighter, 0.2)} 0%, transparent 62%)`,
            }}
          />
        ) : null}

        <DashboardContent
          component={MotionViewport}
          sx={{
            position: 'relative',
            zIndex: 1,
            py: { xs: 5, md: 7 },
            minHeight: { xs: heroSrc ? 560 : 420, md: 520 },
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
                mb: 2.5,
                borderRadius: '20px',
                overflow: 'hidden',
                aspectRatio: '16 / 10',
                maxHeight: 260,
                boxShadow: `0 20px 40px ${alpha(NAVY, 0.14)}, 0 4px 12px ${alpha(NAVY, 0.06)}`,
                border: `1px solid ${alpha(NAVY, 0.08)}`,
              }}
            >
              <Box
                component="img"
                src={heroSrc}
                alt={content.heading || 'Employee'}
                sx={{
                  width: 1,
                  height: 1,
                  objectFit: 'cover',
                  objectPosition: '68% center',
                  display: 'block',
                }}
              />
            </Box>
          ) : null}

          <Grid container alignItems="center" sx={{ width: 1 }}>
            <Grid xs={12} md={heroSrc ? 6.5 : 12}>
              <Stack
                spacing={{ xs: 2.25, md: 2.75 }}
                sx={{
                  maxWidth: heroSrc ? { xs: 1, md: 420, lg: 620 } : { xs: 1, md: 620 },
                }}
              >
                {(content.heading || content.headingAccent) && (
                  <Typography
                    component={m.h2}
                    variants={varFade({ distance: 20 }).inUp}
                    sx={{
                      m: 0,
                      color: 'secondary.main',
                      fontWeight: 800,
                      fontSize: { xs: '1.85rem', sm: '2.25rem', md: '2.65rem' },
                      lineHeight: 1.15,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {formatEmployeeHeading(content.heading, content.headingAccent)}
                  </Typography>
                )}

                {content.subtitle ? (
                  <Box
                    component={m.div}
                    variants={varFade({ distance: 14 }).inUp}
                    sx={{
                      width: 1,
                      maxWidth: heroSrc ? { xs: 1, md: 400, lg: 540 } : { xs: 1, md: 540 },
                    }}
                  >
                    <RichTextContent
                      html={content.subtitle}
                      sx={{
                        color: NAVY,
                        opacity: 0.72,
                        typography: 'body1',
                        fontSize: { xs: '0.9375rem', md: '0.9375rem', lg: '1rem' },
                        lineHeight: { xs: 1.65, lg: 1.7 },
                        '& p': { m: 0 },
                      }}
                    />
                  </Box>
                ) : null}

                {benefits.length > 0 ? (
                  <Grid
                    component={m.div}
                    container
                    spacing={{ xs: 1.5, md: 2, lg: 2.5 }}
                    variants={varFade({ distance: 14 }).inUp}
                    sx={{
                      pt: { xs: 0.5, md: 1 },
                      width: 1,
                      maxWidth: { xs: 1, md: 400, lg: 560 },
                    }}
                  >
                    {benefits.slice(0, 4).map((row, index) => (
                      <Grid key={`employee-hero-benefit-${index}`} xs={6} md={6} lg={3}>
                        <HeroBenefitItem row={row} />
                      </Grid>
                    ))}
                  </Grid>
                ) : null}

                <Stack
                  component={m.div}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  flexWrap="wrap"
                  variants={varFade({ distance: 12 }).inUp}
                  sx={{
                    pt: { xs: 0.5, md: 1 },
                    width: 1,
                    maxWidth: heroSrc ? { xs: 1, md: 400, lg: 1 } : 1,
                  }}
                >
                  <CtaButton
                    label={content.primaryCtaLabel}
                    href={content.primaryCtaHref}
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
        </DashboardContent>
      </Box>

      {showPartners ? (
        <PartnersLogoSection
          heading={partnersHeading}
          logos={displayLogos}
          secondaryColor={secondary.main}
        />
      ) : null}
    </Box>
  );
}
