import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { NavUl } from 'src/components/nav-section';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuthContext } from 'src/auth/hooks';

import { NavList } from './nav-mobile-list';
import { SignInButton } from '../../../components/sign-in-button';

// ----------------------------------------------------------------------

export function NavMobile({ data, open, onClose, slots, sx }) {
  const pathname = usePathname();
  const { authenticated } = useAuthContext();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          display: 'flex',
          flexDirection: 'column',
          width: { xs: 'min(320px, 88vw)', sm: 'var(--layout-nav-mobile-width)' },
          bgcolor: 'background.paper',
          backgroundImage: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${theme.palette.background.paper} 120px)`,
          ...sx,
        },
      }}
    >
      {slots?.topArea ?? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2,
            py: 1.5,
            flexShrink: 0,
            borderBottom: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
          }}
        >
          <Logo
            href={paths.home}
            sx={{
              width: 80,
              height: 36,
              maxWidth: 80,
              maxHeight: 36,
            }}
          />
          <IconButton
            onClick={onClose}
            edge="end"
            aria-label="Close menu"
            sx={{
              color: 'text.secondary',
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.16),
              },
            }}
          >
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </Stack>
      )}

      <Box sx={{ px: 2.5, pt: 2.5, pb: 1, flexShrink: 0 }}>
        <Typography
          variant="overline"
          sx={{
            color: 'text.disabled',
            fontWeight: 700,
            letterSpacing: 1.4,
            fontSize: '0.68rem',
          }}
        >
          Explore
        </Typography>
      </Box>

      <Scrollbar fillContent>
        <Box component="nav" display="flex" flexDirection="column" flex="1 1 auto" sx={{ px: 1.5, pb: 2 }}>
          <NavUl sx={{ gap: 0.75 }}>
            {data.map((list) => (
              <NavList key={list.title} data={list} />
            ))}
          </NavUl>
        </Box>
      </Scrollbar>

      {slots?.bottomArea ?? (
        <Box
          sx={{
            px: 2,
            py: 2.5,
            flexShrink: 0,
            borderTop: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
          }}
        >
          <Stack spacing={1.25}>
            {authenticated ? (
              <Button
                component={RouterLink}
                href={paths.profile.root}
                fullWidth
                size="large"
                variant="contained"
                startIcon={<Iconify icon="solar:user-circle-bold" width={20} />}
                sx={{ fontWeight: 600 }}
              >
                My Profile
              </Button>
            ) : (
              <SignInButton fullWidth size="large" sx={{ fontWeight: 600 }} />
            )}

            <Button
              component={RouterLink}
              href={paths.contact}
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="solar:map-point-bold" width={18} />}
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                borderColor: (theme) => alpha(theme.palette.grey[500], 0.2),
                '&:hover': {
                  borderColor: (theme) => alpha(theme.palette.grey[500], 0.32),
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.06),
                },
              }}
            >
              Contact us
            </Button>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}
