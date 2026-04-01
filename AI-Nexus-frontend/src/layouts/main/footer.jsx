import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';
import { DashboardContent } from '../dashboard';
import { Container } from '@mui/material';

// ----------------------------------------------------------------------

const FOOTER_LINKS = [
  { label: 'Community', path: '/community', external: false },
  { label: 'Affiliates', path: '/affiliate-program', external: false },
  { label: 'Support', path: 'https://help.skool.com/', external: true },
  { label: 'Careers', path: '/careers', external: false },
];

// ----------------------------------------------------------------------

export function Footer({ layoutQuery, sx }) {
  const theme = useTheme();
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
      <DashboardContent
        sx={{
          py: 4,
        }}
      >
        {/* First Section */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          {/* Navigation Links */}
          <Stack
            direction="row"
            spacing={3}
            sx={{
              flexWrap: 'wrap',
              mb: { xs: 2, md: 0 },
            }}
          >
            {FOOTER_LINKS.map(({ label, path, external }) => {
              if (external) {
                return (
                  <Link
                    key={label}
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                      '&:hover': {
                        color: 'text.primary',
                      },
                    }}
                  >
                    {label}
                  </Link>
                );
              }
              return (
                <Link
                  key={label}
                  component={RouterLink}
                  href={path}
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    '&:hover': {
                      color: 'text.primary',
                    },
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </Stack>

          {/* Copyright with Website Builder Link */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            © {currentYear} Skool. All rights reserved.
            <Link
              href="https://readdy.ai/?origin=logo"
              sx={{
                ml: 1,
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': {
                  color: 'text.primary',
                },
              }}
            >
              Website Builder
            </Link>
          </Typography>
        </Stack>

        <Divider sx={{ mb: 4 }} />

        {/* Second Section */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          {/* Logo */}
          <Box>
            <Link
              component={RouterLink}
              href="/"
              sx={{
                textDecoration: 'none',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'Pacifico, serif',
                  background: 'linear-gradient(45deg, rgb(86, 199, 218), rgb(252, 214, 11))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 'bold',
                }}
              >
                AI Nexus
              </Typography>
            </Link>
          </Box>

          {/* Copyright and Powered by Readdy */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            © {currentYear} AI Nexus. All rights reserved. |{' '}
            <Link
              href="https://readdy.ai/?origin=logo"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Powered by Readdy
            </Link>
          </Typography>
        </Stack>
      </DashboardContent>
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
      <Container
        sx={{
          py: 4,
        }}
      >
        {/* First Section */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          {/* Navigation Links */}
          <Stack
            direction="row"
            spacing={3}
            sx={{
              flexWrap: 'wrap',
              mb: { xs: 2, md: 0 },
            }}
          >
            {FOOTER_LINKS.map(({ label, path, external }) => {
              if (external) {
                return (
                  <Link
                    key={label}
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                      '&:hover': {
                        color: 'text.primary',
                      },
                    }}
                  >
                    {label}
                  </Link>
                );
              }
              return (
                <Link
                  key={label}
                  component={RouterLink}
                  href={path}
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    '&:hover': {
                      color: 'text.primary',
                    },
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </Stack>

          {/* Copyright with Website Builder Link */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            © {currentYear} Skool. All rights reserved.
            <Link
              href="https://readdy.ai/?origin=logo"
              sx={{
                ml: 1,
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': {
                  color: 'text.primary',
                },
              }}
            >
              Website Builder
            </Link>
          </Typography>
        </Stack>

        <Divider sx={{ mb: 4 }} />

        {/* Second Section */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          {/* Logo */}
          <Box>
            <Link
              component={RouterLink}
              href="/"
              sx={{
                textDecoration: 'none',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'Pacifico, serif',
                  background: 'linear-gradient(45deg, rgb(86, 199, 218), rgb(252, 214, 11))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 'bold',
                }}
              >
                AI Nexus
              </Typography>
            </Link>
          </Box>

          {/* Copyright and Powered by Readdy */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            © {currentYear} AI Nexus. All rights reserved. |{' '}
            <Link
              href="https://readdy.ai/?origin=logo"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Powered by Readdy
            </Link>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
