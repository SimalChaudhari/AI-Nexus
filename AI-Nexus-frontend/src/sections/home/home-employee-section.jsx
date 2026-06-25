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
import { FLUID_FONT_SIZES } from 'src/theme/home-typography';
import { HOME_DASHBOARD_CONTENT_SX, HOME_SECTION_CARD_SX } from './home-section-styles';

// ----------------------------------------------------------------------

const NAVY = '#1C4270';
const SECTION_GREY = '#eceef1';
const SECTION_GREY_LIGHT = '#f4f6f8';
const SECTION_BG = `linear-gradient(180deg, ${SECTION_GREY_LIGHT} 0%, ${SECTION_GREY} 48%, ${SECTION_GREY_LIGHT} 100%)`;
const FONT_STACK = '"Montserrat", "Google Sans", system-ui, sans-serif';

const sectionBackgroundSx = {
  bgcolor: '#F7F9FA',
  background: SECTION_BG,
};

/** Scales with viewport; smaller in 2-col mobile grid, larger on tablet/desktop */
const EMPLOYEE_BENEFIT_CARD_TITLE_SX = {
  fontFamily: FONT_STACK,
  color: NAVY,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  wordBreak: 'break-word',
  fontSize: {
    xs: 'clamp(0.5625rem, 2.2vw + 0.35rem, 0.6875rem)',
    sm: FLUID_FONT_SIZES.caption,
    md: FLUID_FONT_SIZES.body2,
    lg: FLUID_FONT_SIZES.body1,
  },
  lineHeight: { xs: 1.3, sm: 1.35, md: 1.4 },
};

const EMPLOYEE_BENEFIT_CARD_ICON_SX = {
  flexShrink: 0,
  borderRadius: 1.25,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: { xs: 28, sm: 34, md: 38 },
  height: { xs: 28, sm: 34, md: 38 },
};

const EMPLOYEE_BENEFIT_CARD_ICON_SIZE = { xs: 14, sm: 17, md: 19 };

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
    size: 'small',
    endIcon:
      variant === 'contained' && !icon ? (
        <Iconify icon="solar:arrow-right-linear" width={14} />
      ) : null,
    startIcon: icon ? <Iconify icon={icon} width={16} /> : null,
    sx: {
      fontFamily: FONT_STACK,
      fontWeight: 700,
      fontSize: FLUID_FONT_SIZES.caption,
      lineHeight: 1.35,
      px: { xs: 1.5, sm: 1.75, md: 2 },
      py: { xs: 0.55, sm: 0.65 },
      minHeight: { xs: 34, sm: 36 },
      borderRadius: 1,
      textTransform: 'none',
      whiteSpace: { xs: 'normal', sm: 'nowrap' },
      minWidth: { sm: 120 },
      '& .MuiButton-startIcon, & .MuiButton-endIcon': {
        marginLeft: 0.5,
        marginRight: 0.5,
      },
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
        boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.22)}`,
        '&:hover': {
          bgcolor: 'primary.dark',
          boxShadow: (t) => `0 6px 18px ${alpha(t.palette.primary.main, 0.3)}`,
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
        boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.22)}`,
        '&:hover': {
          bgcolor: 'primary.dark',
          boxShadow: (t) => `0 6px 18px ${alpha(t.palette.primary.main, 0.3)}`,
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
    <Stack spacing={{ xs: 0.85, md: 1 }}>
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
            fontSize: FLUID_FONT_SIZES.overline,
            letterSpacing: '0.12em',
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
            fontWeight: 700,
            fontSize: FLUID_FONT_SIZES.h4,
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
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
          width: { xs: 56, md: 64 },
          height: 3,
          borderRadius: 999,
          background: (theme) =>
            `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${secondaryColor || theme.palette.secondary.main} 100%)`,
          boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`,
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
        gap: { xs: 0.5, sm: 0.85, md: 1 },
        p: { xs: 0.75, sm: 1, md: 1.25 },
        borderRadius: { xs: 1, sm: 1.25 },
        bgcolor: 'common.white',
        border: `1px solid ${alpha(NAVY, 0.08)}`,
        boxShadow: `0 4px 14px ${alpha(NAVY, 0.05)}`,
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
            ...EMPLOYEE_BENEFIT_CARD_ICON_SX,
            color: iconColor,
            background: `linear-gradient(145deg, ${alpha(iconColor, 0.14)} 0%, ${alpha(iconColor, 0.06)} 100%)`,
            border: `1px solid ${alpha(iconColor, 0.2)}`,
          }}
        >
          <Iconify icon={row.icon} sx={{ width: EMPLOYEE_BENEFIT_CARD_ICON_SIZE, height: 'auto' }} />
        </Box>
      ) : (
        <Box
          sx={{
            ...EMPLOYEE_BENEFIT_CARD_ICON_SX,
            fontFamily: FONT_STACK,
            fontWeight: 800,
            fontSize: {
              xs: 'clamp(0.6875rem, 1.8vw + 0.42rem, 0.8125rem)',
              md: FLUID_FONT_SIZES.caption,
            },
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
            ...EMPLOYEE_BENEFIT_CARD_TITLE_SX,
            pt: { xs: 0, sm: 0.35 },
            flex: 1,
            minWidth: 0,
            width: { xs: 1, sm: 'auto' },
            display: '-webkit-box',
            WebkitLineClamp: { xs: 3, sm: 5, md: 6 },
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
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

  useEffect(() => {
    let active = true;
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        setContent(
          resolveEmployeeContent(settings?.homeEmployeeContent, settings?.homeEmployerContent)
        );
      })
      .catch(() => {
        if (active) {
          setContent(resolveEmployeeContent(null, null));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!hasEmployeeContent(content)) return null;

  const benefits = (content.benefits || []).filter((row) => String(row?.title || '').trim());
  const heroSrc = resolveAssetUrl(content.heroImageUrl);

  return (
    <Box
      component="section"
      sx={{
        ...sectionBackgroundSx,
      }}
    >
      <DashboardContent
        component={MotionViewport}
        sx={{
          ...HOME_DASHBOARD_CONTENT_SX,
          py: { xs: 3.5, md: 5 },
        }}
      >
        <Grid
          container
          spacing={{ xs: 2.5, md: 3.5 }}
          alignItems="center"
          component={m.div}
          variants={varFade({ distance: 20 }).inUp}
        >
          <Grid xs={12} md={heroSrc ? 6 : 12} sx={{ display: 'flex', minWidth: 0, order: { xs: 2, md: 1 } }}>
            <Box
              sx={{
                position: 'relative',
                width: 1,
                py: { md: 0.5 },
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
                spacing={{ xs: 2.25, md: 2.75 }}
                sx={{
                  pl: { md: 2 },
                }}
              >
                <EmployeeSectionHeading
                  eyebrow={content.eyebrow}
                  heading={content.heading}
                  headingAccent={content.headingAccent}
                  secondaryColor={secondary.main}
                />

                {content.subtitle ? (
                  <Box sx={{ width: 1 }}>
                    <RichTextContent
                      html={content.subtitle}
                      sx={{
                        fontFamily: FONT_STACK,
                        color: alpha(NAVY, 0.78),
                        fontSize: FLUID_FONT_SIZES.body1,
                        lineHeight: 1.6,
                        '& p': { m: 0, fontSize: 'inherit' },
                        '& p + p': { mt: 1 },
                        '& strong': { color: NAVY, fontWeight: 700 },
                      }}
                    />
                  </Box>
                ) : null}

                {benefits.length > 0 ? (
                  <Stack spacing={1.75} sx={{ width: 1, pt: { xs: 0.25, md: 0.5 } }}>
                    {content.benefitsLabel ? (
                      <Typography
                        sx={{
                          fontFamily: FONT_STACK,
                          fontWeight: 700,
                          fontSize: FLUID_FONT_SIZES.caption,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: alpha(NAVY, 0.55),
                        }}
                      >
                        {content.benefitsLabel}
                      </Typography>
                    ) : null}
                    <Grid container spacing={{ xs: 0.75, sm: 1.25, md: 1.5 }}>
                      {benefits.slice(0, 4).map((row, index) => (
                        <Grid key={`employee-hero-benefit-${index}`} xs={6} sm={6}>
                          <EmployeeBenefitCard row={row} index={index} />
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>
                ) : null}

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 0.85, sm: 1 }}
                  flexWrap="wrap"
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  sx={{
                    width: 1,
                    pt: { xs: 0.25, md: 0.5 },
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

          {heroSrc ? (
            <Grid xs={12} md={6} sx={{ display: 'flex', minWidth: 0, alignItems: 'center', order: { xs: 1, md: 2 } }}>
              <Box
                sx={{
                  width: 1,
                  borderRadius: '20px',
                  overflow: 'hidden',
                  aspectRatio: { xs: '16 / 10', md: '4 / 3' },
                  maxHeight: { xs: 240, md: 360 },
                  ...HOME_SECTION_CARD_SX,
                  p: 0,
                  bgcolor: 'common.white',
                }}
              >
                <Box
                  component="img"
                  src={heroSrc}
                  alt={content.heading || 'Employee'}
                  loading="lazy"
                  sx={{
                    width: 1,
                    height: 1,
                    objectFit: 'cover',
                    objectPosition: '68% center',
                    display: 'block',
                  }}
                />
              </Box>
            </Grid>
          ) : null}
        </Grid>
      </DashboardContent>
    </Box>
  );
}
