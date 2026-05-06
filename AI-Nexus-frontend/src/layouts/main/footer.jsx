import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
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
  { value: '180+', label: 'AI resources' },
  { value: '40+', label: 'Expert mentors' },
  { value: '24/7', label: 'Community access' },
];

const ENROLLMENT_LABEL = 'Learners enrolled in courses';
const ENROLLMENT_FALLBACK_VALUE = '12K+';

/** Static domain line (replace with env later) */
const FOOTER_DOMAIN_LINE = 'ainexus.com · AI learning & community';

const FOOTER_LINKS = [
  { label: 'Community', path: '/community', external: false },
  { label: 'Affiliates', path: '/affiliate-program', external: false },
  { label: 'Support', path: 'https://help.skool.com/', external: true },
  { label: 'Careers', path: '/careers', external: false },
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
      { value: enrollmentDisplay, label: ENROLLMENT_LABEL },
      ...FOOTER_STATS_STATIC_TAIL,
    ],
    [enrollmentDisplay]
  );

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) =>
          t.palette.mode === 'dark' ? alpha(t.palette.common.black, 0.35) : alpha(t.palette.grey[500], 0.06),
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3, md: 4 } }}>
        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          {footerStats.map((stat) => (
            <Grid item xs={6} md={3} key={stat.label}>
              <Stack spacing={0.5} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Typography
                  sx={{
                    ...HERO_TYPOGRAPHY.footerStatValue,
                    color: 'text.primary',
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    ...HERO_TYPOGRAPHY.footerMetaText,
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
            mt: { xs: 2.5, md: 3 },
            color: 'text.disabled',
            ...HERO_TYPOGRAPHY.footerMetaText,
            letterSpacing: '0.02em',
          }}
        >
          {FOOTER_DOMAIN_LINE}
        </Typography>
      </Container>
    </Box>
  );
}

function FooterLink({ label, path, external }) {
  const sx = {
    color: 'text.secondary',
    ...HERO_TYPOGRAPHY.footerMetaText,
    textDecoration: 'none',
    '&:hover': { color: 'text.primary' },
  };
  if (external) {
    return (
      <Link href={path} target="_blank" rel="noopener noreferrer" sx={sx}>
        {label}
      </Link>
    );
  }
  return (
    <Link component={RouterLink} href={path} sx={sx}>
      {label}
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
        spacing={2}
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
          sx={{ color: 'text.secondary', textAlign: { xs: 'center', md: 'right' }, ...HERO_TYPOGRAPHY.footerMetaText }}
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
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
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
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
    >
      <FooterStatsBand />
      <FooterBottomLinksAndBrand currentYear={currentYear} useContainer />
    </Box>
  );
}
