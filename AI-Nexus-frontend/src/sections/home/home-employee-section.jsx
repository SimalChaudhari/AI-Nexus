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

import { resolveEmployeeContent, hasEmployeeContent } from './employee-defaults';

// ----------------------------------------------------------------------

const NAVY = '#1C4270';
const HERO_IMAGE_WIDTH = '58%';
const SECTION_GREY = '#eceef1';
const SECTION_GREY_LIGHT = '#f4f6f8';
const SECTION_BG = `linear-gradient(180deg, ${SECTION_GREY_LIGHT} 0%, ${SECTION_GREY} 48%, ${SECTION_GREY_LIGHT} 100%)`;
const FONT_STACK = '"Montserrat", "Google Sans", system-ui, sans-serif';

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
        py: { xs: 3.5, md: 4 },
        display: 'flex',
        alignItems: 'center',
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
      {/* <DashboardContent
        disablePadding
        component={MotionViewport}
        sx={{ position: 'relative', zIndex: 1, width: 1 }}
      > */}

      <DashboardContent
        component={MotionViewport}
        sx={{
          width: 1,
          maxWidth: '100%',
          position: 'relative', zIndex: 1,
          mx: 'auto',
          px: { xs: 1.25, sm: 2, md: 3, lg: 4 },
          pt: 0,
          pb: 0,
        }}
      >
        <Stack
          spacing={{ xs: 2, md: 2.5 }}
          alignItems="center"
          justifyContent="center"
          sx={{ width: 1 }}
        >
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
                    transition: (theme) =>
                      theme.transitions.create(['opacity', 'transform'], { duration: 200 }),
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
    endIcon:
      variant === 'contained' && !icon ? (
        <Iconify icon="solar:arrow-right-linear" width={18} />
      ) : null,
    startIcon: icon ? <Iconify icon={icon} width={20} /> : null,
    sx: {
      fontFamily: FONT_STACK,
      fontWeight: 700,
      fontSize: '0.9375rem',
      px: { xs: 2.5, md: 3.25 },
      py: 1.4,
      borderRadius: 2,
      textTransform: 'none',
      whiteSpace: { xs: 'normal', sm: 'nowrap' },
      minWidth: { sm: 188 },
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

function EmployeeSectionHeading({ eyebrow, heading, headingAccent, secondaryColor }) {
  const hasHeading = Boolean(String(heading || '').trim());
  const hasAccent = Boolean(String(headingAccent || '').trim());
  const eyebrowText = String(eyebrow || '').trim();

  if (!eyebrowText && !hasHeading && !hasAccent) return null;

  return (
    <Stack spacing={{ xs: 1.25, md: 1.5 }}>
      {eyebrowText ? (
        <Typography
          component="span"
          sx={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            fontFamily: FONT_STACK,
            fontWeight: 700,
            fontSize: '0.6875rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
          }}
        >
          {eyebrowText}
        </Typography>
      ) : null}

      {(hasHeading || hasAccent) && (
        <Typography
          component="h2"
          sx={{
            m: 0,
            fontFamily: FONT_STACK,
            fontWeight: 800,
            fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.35rem', lg: '2.5rem' },
            lineHeight: { xs: 1.2, md: 1.15 },
            letterSpacing: '-0.03em',
            color: 'secondary.main',
          }}
        >
          {hasHeading ? (
            <Box component="span" sx={{ display: 'block' }}>
              {String(heading).trim()}
            </Box>
          ) : null}
          {hasAccent ? (
            <Box component="span" sx={{ display: 'block', color: 'primary.main' }}>
              {String(headingAccent).trim()}
            </Box>
          ) : null}
        </Typography>
      )}

      <Box
        sx={{
          width: { xs: 56, md: 72 },
          height: 4,
          borderRadius: 999,
          background: (theme) =>
            `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${secondaryColor || theme.palette.secondary.main} 100%)`,
          boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.main, 0.22)}`,
        }}
      />
    </Stack>
  );
}

function EmployeeBenefitCard({ row, index }) {
  const theme = useTheme();
  const iconColor = row.iconColor || theme.palette.primary.main;

  return (
    <Box
      sx={{
        height: 1,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'center', sm: 'flex-start' },
        textAlign: { xs: 'center', sm: 'left' },
        gap: { xs: 1, sm: 1.5 },
        p: { xs: 1.25, sm: 1.5, md: 1.75 },
        borderRadius: 2,
        bgcolor: 'common.white',
        border: `1px solid ${alpha(NAVY, 0.08)}`,
        boxShadow: `0 8px 24px ${alpha(NAVY, 0.06)}`,
        transition: (t) =>
          t.transitions.create(['box-shadow', 'border-color', 'transform'], { duration: 220 }),
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: alpha(theme.palette.primary.main, 0.22),
            boxShadow: `0 14px 32px ${alpha(NAVY, 0.1)}`,
          },
        },
      }}
    >
      {row.icon ? (
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: 40, sm: 44 },
            height: { xs: 40, sm: 44 },
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            background: `linear-gradient(145deg, ${alpha(iconColor, 0.14)} 0%, ${alpha(iconColor, 0.06)} 100%)`,
            border: `1px solid ${alpha(iconColor, 0.2)}`,
          }}
        >
          <Iconify icon={row.icon} width={20} />
        </Box>
      ) : (
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: 40, sm: 44 },
            height: { xs: 40, sm: 44 },
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_STACK,
            fontWeight: 800,
            fontSize: '0.875rem',
            color: 'primary.main',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
          }}
        >
          {index + 1}
        </Box>
      )}
      {row.title ? (
        <Typography
          sx={{
            pt: { xs: 0, sm: 0.35 },
            flex: 1,
            minWidth: 0,
            width: { xs: 1, sm: 'auto' },
            fontFamily: FONT_STACK,
            color: NAVY,
            fontWeight: 600,
            fontSize: { xs: '0.6875rem', sm: '0.8125rem', md: '0.875rem' },
            lineHeight: { xs: 1.35, sm: 1.45 },
            letterSpacing: '-0.01em',
          }}
        >
          {String(row.title).trim()}
        </Typography>
      ) : null}
    </Box>
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

  const benefits = (content.benefits || []).filter((row) => String(row?.title || '').trim());
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
              <Box
                component={m.div}
                variants={varFade({ distance: 20 }).inUp}
                sx={{
                  position: 'relative',
                  maxWidth: heroSrc ? { xs: 1, md: 480, lg: 640 } : { xs: 1, md: 640 },
                  py: { md: 1 },
                  pr: { md: heroSrc ? 2 : 0, lg: heroSrc ? 3 : 0 },
                  '&::before': {
                    content: '""',
                    display: { xs: 'none', md: 'block' },
                    position: 'absolute',
                    left: 0,
                    top: 12,
                    bottom: 12,
                    width: 4,
                    borderRadius: 999,
                    background: (t) =>
                      `linear-gradient(180deg, ${t.palette.primary.main} 0%, ${secondary.main} 100%)`,
                  },
                }}
              >
                <Stack
                  spacing={{ xs: 2.5, md: 3 }}
                  sx={{
                    pl: { md: 2.5 },
                  }}
                >
                  <EmployeeSectionHeading
                    eyebrow={content.eyebrow}
                    heading={content.heading}
                    headingAccent={content.headingAccent}
                    secondaryColor={secondary.main}
                  />

                  {content.subtitle ? (
                    <Box
                      component={m.div}
                      variants={varFade({ distance: 14 }).inUp}
                      sx={{ width: 1 }}
                    >
                      <RichTextContent
                        html={content.subtitle}
                        sx={{
                          fontFamily: FONT_STACK,
                          color: alpha(NAVY, 0.78),
                          typography: 'body1',
                          fontSize: { xs: '0.9375rem', md: '1rem' },
                          lineHeight: { xs: 1.65, md: 1.75 },
                          maxWidth: { md: 520, lg: 560 },
                          '& p': { m: 0 },
                          '& p + p': { mt: 1.25 },
                          '& strong': { color: NAVY, fontWeight: 700 },
                        }}
                      />
                    </Box>
                  ) : null}

                  {benefits.length > 0 ? (
                    <Stack
                      component={m.div}
                      spacing={1.5}
                      variants={varFade({ distance: 14 }).inUp}
                      sx={{ width: 1, pt: { xs: 0.25, md: 0.5 } }}
                    >
                      {content.benefitsLabel ? (
                        <Typography
                          sx={{
                            fontFamily: FONT_STACK,
                            fontWeight: 700,
                            fontSize: '0.6875rem',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: alpha(NAVY, 0.55),
                          }}
                        >
                          {content.benefitsLabel}
                        </Typography>
                      ) : null}
                      <Grid container spacing={{ xs: 1, sm: 1.25, md: 1.5 }}>
                        {benefits.slice(0, 4).map((row, index) => (
                          <Grid key={`employee-hero-benefit-${index}`} xs={6} sm={6}>
                            <EmployeeBenefitCard row={row} index={index} />
                          </Grid>
                        ))}
                      </Grid>
                    </Stack>
                  ) : null}

                  <Stack
                    component={m.div}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    flexWrap="wrap"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    variants={varFade({ distance: 12 }).inUp}
                    sx={{
                      width: 1,
                      pt: { xs: 0.5, md: 1 },
                    }}
                  >
                    <CtaButton label={content.primaryCtaLabel} href={content.primaryCtaHref} />
                    <CtaButton
                      label={content.secondaryCtaLabel}
                      href={content.secondaryCtaHref}
                      variant="outlined"
                      icon="solar:download-minimalistic-bold"
                    />
                  </Stack>
                </Stack>
              </Box>
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
