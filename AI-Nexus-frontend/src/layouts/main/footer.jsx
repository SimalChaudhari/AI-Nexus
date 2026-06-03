import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/iconify';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { FLUID_FONT_SIZES } from 'src/theme/fluid-typography';
import { DashboardContent } from '../dashboard';
import { appSettingsService } from 'src/services/app-settings.service';

// ----------------------------------------------------------------------

/** Compact display for footer enrollment total (matches prior “12K+” style). */
function formatEnrollmentDisplay(count) {
  if (count == null || !Number.isFinite(count) || count < 0) return null;
  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(count);
  return `${compact}+`;
}

/** First stat: live course enrollment count from API; remaining stats static until CMS wires them. */
const FOOTER_STATS_STATIC_TAIL = [
  { value: '180+', label: 'AI resources', icon: 'solar:library-bold-duotone' },
  { value: '40+', label: 'Expert mentors', icon: 'solar:users-group-rounded-bold-duotone' },
  { value: '24/7', label: 'Community access', icon: 'solar:chat-round-dots-bold-duotone' },
];

const ENROLLMENT_LABEL = 'Learners enrolled in courses';
const ENROLLMENT_FALLBACK_VALUE = '12K+';

/** Static domain line (replace with env later) */
const FOOTER_DOMAIN_LINE = 'ainexus.com · AI learning & community';

const FOOTER_STAT_VALUE_SX = {
  fontSize: FLUID_FONT_SIZES.h5,
  lineHeight: 1.25,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum"',
};

const FOOTER_STAT_LABEL_SX = {
  ...HERO_TYPOGRAPHY.footerMetaText,
  fontSize: FLUID_FONT_SIZES.caption,
  lineHeight: 1.4,
};

const FOOTER_LINKS = [
  { label: 'Home', path: paths.home, external: false, icon: 'solar:home-bold' },
  { label: 'Learning', path: paths.learning, external: false, icon: 'solar:book-2-bold' },
  { label: 'AI Resources', path: paths.workflows, external: false, icon: 'solar:widget-bold' },
  { label: 'AI Forum', path: paths.aiForum.root, external: false, icon: 'solar:chat-round-bold' },
  { label: 'Contact', path: paths.contact, external: false, icon: 'solar:map-point-bold' },
];

function FooterStatsBand() {
  const [enrollmentDisplay, setEnrollmentDisplay] = useState(ENROLLMENT_FALLBACK_VALUE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await appSettingsService.getPublic();
        const formatted = formatEnrollmentDisplay(settings?.totalCourseEnrollments);
        if (!cancelled && formatted) {
          setEnrollmentDisplay(formatted);
        }
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const footerStats = useMemo(
    () => [
      { value: enrollmentDisplay, label: ENROLLMENT_LABEL, icon: 'solar:book-bookmark-bold-duotone' },
      ...FOOTER_STATS_STATIC_TAIL,
    ],
    [enrollmentDisplay]
  );

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: (t) => alpha(t.palette.common.white, 0.08),
        background: (t) =>
          t.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${alpha(t.palette.secondary.dark, 0.38)} 0%, ${alpha(t.palette.secondary.main, 0.34)} 100%)`
            : `linear-gradient(180deg, ${alpha(t.palette.secondary.light, 0.22)} 0%, ${alpha(t.palette.secondary.main, 0.18)} 100%)`,
      }}
    >
      <DashboardContent sx={{ py: { xs: 2.5, md: 3.5 } }}>
        <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
          {footerStats.map((stat) => (
            <Grid item xs={6} md={3} key={stat.label}>
              <Stack
                spacing={0.5}
                sx={{
                  textAlign: { xs: 'center', md: 'left' },
                  p: { xs: 1, sm: 1.15, md: 1.35 },
                  borderRadius: '14px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  background: (t) =>
                    t.palette.mode === 'dark'
                      ? alpha(t.palette.common.white, 0.04)
                      : alpha(t.palette.common.white, 0.68),
                  border: (t) => `1px solid ${alpha(t.palette.common.white, t.palette.mode === 'dark' ? 0.08 : 0.75)}`,
                  boxShadow: (t) =>
                    t.palette.mode === 'dark'
                      ? `0 8px 24px ${alpha(t.palette.common.black, 0.26)}`
                      : `0 10px 30px ${alpha(t.palette.primary.main, 0.1)}`,
                  transition: (t) =>
                    t.transitions.create(['transform', 'box-shadow', 'border-color'], {
                      duration: t.transitions.duration.shorter,
                    }),
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                    boxShadow: (t) =>
                      t.palette.mode === 'dark'
                        ? `0 12px 28px ${alpha(t.palette.common.black, 0.35)}`
                        : `0 14px 34px ${alpha(t.palette.primary.main, 0.18)}`,
                  },
                }}
              >
                <Stack direction="row" spacing={1.2} alignItems="center" justifyContent={{ xs: 'center', md: 'flex-start' }}>
                  <Box
                    sx={{
                      width: { xs: 32, sm: 34, md: 36 },
                      height: { xs: 32, sm: 34, md: 36 },
                      borderRadius: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.14),
                      color: 'primary.main',
                    }}
                  >
                    <Iconify icon={stat.icon} width={18} />
                  </Box>
                </Stack>
                <Typography
                  sx={{
                    ...FOOTER_STAT_VALUE_SX,
                    color: (t) => (t.palette.mode === 'dark' ? 'common.white' : 'text.primary'),
                    letterSpacing: '-0.01em',
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: (t) => alpha(t.palette.text.secondary, 0.95),
                    ...FOOTER_STAT_LABEL_SX,
                  }}
                >
                  {stat.label}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Typography
          variant="body2"
          align="center"
          sx={{
            mt: { xs: 2.75, md: 3.5 },
            color: (t) => alpha(t.palette.text.secondary, 0.8),
            ...HERO_TYPOGRAPHY.footerMetaText,
            letterSpacing: '0.03em',
          }}
        >
          {FOOTER_DOMAIN_LINE}
        </Typography>
      </DashboardContent>
    </Box>
  );
}

function FooterLink({ label, path, external, icon }) {
  const sx = {
    color: (t) => alpha(t.palette.text.secondary, 0.95),
    ...HERO_TYPOGRAPHY.footerMetaText,
    textDecoration: 'none',
    px: 1.4,
    py: 0.85,
    borderRadius: 14,
    border: '1px solid transparent',
    transition: (t) =>
      t.transitions.create(['color', 'background-color', 'border-color', 'transform'], {
        duration: t.transitions.duration.shorter,
      }),
    '&:hover': {
      color: 'primary.main',
      bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
      borderColor: (t) => alpha(t.palette.primary.main, 0.25),
      transform: 'translateY(-1px)',
    },
  };
  if (external) {
    return (
      <Link href={path} target="_blank" rel="noopener noreferrer" sx={sx}>
        <Stack direction="row" spacing={1.1} alignItems="center">
          {icon ? (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                color: 'primary.main',
                flexShrink: 0,
              }}
            >
              <Iconify icon={icon} width={20} />
            </Box>
          ) : null}
          <Box component="span">{label}</Box>
        </Stack>
      </Link>
    );
  }
  return (
    <Link component={RouterLink} href={path} sx={sx}>
      <Stack direction="row" spacing={1.1} alignItems="center">
        {icon ? (
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            <Iconify icon={icon} width={20} />
          </Box>
        ) : null}
        <Box component="span">{label}</Box>
      </Stack>
    </Link>
  );
}

function FooterBottomLinksAndBrand({ currentYear, useContainer }) {
  const inner = (
    <>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'center', md: 'center' }}
        spacing={{ xs: 2.25, md: 2 }}
        sx={{
          p: { xs: 1.5, md: 1.75 },
          borderRadius: 2.5,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: (t) =>
            t.palette.mode === 'dark'
              ? alpha(t.palette.common.white, 0.03)
              : alpha(t.palette.common.white, 0.72),
          border: (t) => `1px solid ${alpha(t.palette.common.white, t.palette.mode === 'dark' ? 0.08 : 0.8)}`,
        }}
      >
        <Stack
          direction="row"
          spacing={3}
          flexWrap="wrap"
          sx={{ mb: { xs: 2, md: 0 }, gap: 1, justifyContent: { xs: 'center', md: 'flex-start' } }}
        >
          {FOOTER_LINKS.map((item) => (
            <FooterLink key={item.label} {...item} />
          ))}
        </Stack>

        <Typography
          variant="body2"
          sx={{
            color: (t) => alpha(t.palette.text.secondary, 0.92),
            textAlign: { xs: 'center', md: 'right' },
            ...HERO_TYPOGRAPHY.footerMetaText,
          }}
        >
          © {currentYear} AI Nexus. All rights reserved.
        </Typography>
      </Stack>
    </>
  );

  if (useContainer) {
    return (
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: 4 }}>
        {inner}
      </Container>
    );
  }
  return (
    <DashboardContent sx={{ py: 4 }}>
      {inner}
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

export function Footer({ layoutQuery, sx }) {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 8,
        bgcolor: (t) => (t.palette.mode === 'dark' ? alpha(t.palette.secondary.dark, 0.42) : alpha(t.palette.secondary.light, 0.2)),
        backgroundImage: (t) =>
          t.palette.mode === 'dark'
            ? `radial-gradient(1200px 450px at 20% -20%, ${alpha(t.palette.secondary.main, 0.28)}, transparent 60%), radial-gradient(900px 380px at 90% 0%, ${alpha(t.palette.secondary.light, 0.22)}, transparent 55%)`
            : `radial-gradient(1200px 450px at 10% -10%, ${alpha(t.palette.secondary.main, 0.2)}, transparent 60%), radial-gradient(900px 380px at 90% 0%, ${alpha(t.palette.secondary.dark, 0.14)}, transparent 55%)`,
        borderTop: '1px solid',
        borderColor: (t) => alpha(t.palette.common.white, t.palette.mode === 'dark' ? 0.08 : 0.85),
        ...sx,
      }}
    >
      <FooterStatsBand />
      <FooterBottomLinksAndBrand currentYear={currentYear} useContainer={false} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function HomeFooter({ sx }) {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 8,
        bgcolor: (t) => (t.palette.mode === 'dark' ? alpha(t.palette.secondary.dark, 0.42) : alpha(t.palette.secondary.light, 0.2)),
        backgroundImage: (t) =>
          t.palette.mode === 'dark'
            ? `radial-gradient(1200px 450px at 20% -20%, ${alpha(t.palette.secondary.main, 0.28)}, transparent 60%), radial-gradient(900px 380px at 90% 0%, ${alpha(t.palette.secondary.light, 0.22)}, transparent 55%)`
            : `radial-gradient(1200px 450px at 10% -10%, ${alpha(t.palette.secondary.main, 0.2)}, transparent 60%), radial-gradient(900px 380px at 90% 0%, ${alpha(t.palette.secondary.dark, 0.14)}, transparent 55%)`,
        borderTop: '1px solid',
        borderColor: (t) => alpha(t.palette.common.white, t.palette.mode === 'dark' ? 0.08 : 0.85),
        ...sx,
      }}
    >
      <FooterStatsBand />
      <FooterBottomLinksAndBrand currentYear={currentYear} useContainer={false} />
    </Box>
  );
}
