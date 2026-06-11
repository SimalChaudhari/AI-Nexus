import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { FLUID_FONT_SIZES } from 'src/theme/fluid-typography';
import { DashboardContent } from '../dashboard';
import { appSettingsService } from 'src/services/app-settings.service';
import { resolveFooterContent } from './footer-defaults';

// ----------------------------------------------------------------------

/** Compact display for footer enrollment total (matches prior “12K+” style). */
function formatEnrollmentDisplay(count) {
  if (count == null || !Number.isFinite(count) || count < 0) return null;
  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(count);
  return `${compact}+`;
}

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

function useFooterContent() {
  const [content, setContent] = useState(() => resolveFooterContent(null));
  const [enrollmentDisplay, setEnrollmentDisplay] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const settings = await appSettingsService.getPublic();
        if (cancelled) return;
        setContent(resolveFooterContent(settings?.footerContent));
        const formatted = formatEnrollmentDisplay(settings?.totalCourseEnrollments);
        if (formatted) {
          setEnrollmentDisplay(formatted);
        }
      } catch {
        /* keep defaults */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const footerStats = useMemo(
    () =>
      (content.stats || [])
        .map((stat) => ({
          ...stat,
          value:
            stat.useLiveEnrollment && enrollmentDisplay
              ? enrollmentDisplay
              : stat.value || '',
        }))
        .filter((stat) => String(stat.label || '').trim() || String(stat.value || '').trim()),
    [content.stats, enrollmentDisplay]
  );

  const footerLinks = useMemo(
    () => (content.links || []).filter((item) => String(item.label || '').trim() && String(item.path || '').trim()),
    [content.links]
  );

  const copyrightText = useMemo(() => {
    const template = String(content.copyrightText || '').trim();
    if (!template) return '';
    return template.replace('{year}', String(new Date().getFullYear()));
  }, [content.copyrightText]);

  return {
    content,
    footerStats,
    footerLinks,
    copyrightText,
  };
}

function FooterStatsBand({ stats, domainLine }) {
  if (!stats.length) return null;

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
          {stats.map((stat) => (
            <Grid item xs={6} md={3} key={`${stat.label}-${stat.icon}`}>
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
                    <Iconify icon={stat.icon || 'solar:star-bold-duotone'} width={18} />
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

        {domainLine ? (
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
            {domainLine}
          </Typography>
        ) : null}
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

  const content = (
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
  );

  if (external) {
    return (
      <Link href={path} target="_blank" rel="noopener noreferrer" sx={sx}>
        {content}
      </Link>
    );
  }

  return (
    <Link component={RouterLink} href={path} sx={sx}>
      {content}
    </Link>
  );
}

function FooterBottomLinksAndBrand({ links, copyrightText }) {
  return (
    <DashboardContent sx={{ py: 4 }}>
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
          {links.map((item) => (
            <FooterLink key={`${item.label}-${item.path}`} {...item} />
          ))}
        </Stack>

        {copyrightText ? (
          <Typography
            variant="body2"
            sx={{
              color: (t) => alpha(t.palette.text.secondary, 0.92),
              textAlign: { xs: 'center', md: 'right' },
              ...HERO_TYPOGRAPHY.footerMetaText,
            }}
          >
            {copyrightText}
          </Typography>
        ) : null}
      </Stack>
    </DashboardContent>
  );
}

function SiteFooterBody({ sx }) {
  const { content, footerStats, footerLinks, copyrightText } = useFooterContent();

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
      <FooterStatsBand stats={footerStats} domainLine={content.domainLine} />
      <FooterBottomLinksAndBrand links={footerLinks} copyrightText={copyrightText} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function Footer({ layoutQuery, sx }) {
  return <SiteFooterBody sx={sx} />;
}

export function HomeFooter({ sx }) {
  return <SiteFooterBody sx={sx} />;
}
