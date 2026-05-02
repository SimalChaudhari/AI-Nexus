import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { DashboardContent } from '../dashboard';

// ----------------------------------------------------------------------
/** Static until wired to analytics / CMS */
const FOOTER_STATS = [
  { value: '12K+', label: 'Active learners' },
  { value: '180+', label: 'AI resources' },
  { value: '40+', label: 'Expert mentors' },
  { value: '24/7', label: 'Community access' },
];

/** Static domain line (replace with env later) */
const FOOTER_DOMAIN_LINE = 'ainexus.com · AI learning & community';

const FOOTER_LINKS = [
  { label: 'Community', path: '/community', external: false },
  { label: 'Affiliates', path: '/affiliate-program', external: false },
  { label: 'Support', path: 'https://help.skool.com/', external: true },
  { label: 'Careers', path: '/careers', external: false },
];

function FooterStatsBand() {
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
          {FOOTER_STATS.map((stat) => (
            <Grid item xs={6} md={3} key={stat.label}>
              <Stack spacing={0.5}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                    lineHeight: 1.1,
                    letterSpacing: '-0.04em',
                    color: 'text.primary',
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                    fontWeight: 500,
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
            fontSize: '0.8125rem',
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
    fontSize: '0.875rem',
    textDecoration: 'none',
    fontWeight: 500,
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
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
      >
        <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ mb: { xs: 2, md: 0 }, gap: 1 }}>
          {FOOTER_LINKS.map((item) => (
            <FooterLink key={item.label} {...item} />
          ))}
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
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
