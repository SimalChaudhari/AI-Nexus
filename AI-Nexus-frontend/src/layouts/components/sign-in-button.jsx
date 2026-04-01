import Button from '@mui/material/Button';

import { RouterLink } from 'src/routes/components';
import { usePathname } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { useAuthContext } from 'src/auth/hooks';
import { AccountDrawer } from './account-drawer';

// ----------------------------------------------------------------------

export function SignInButton({ sx, data, ...other }) {
  const { authenticated } = useAuthContext();
  const pathname = usePathname();
  const isPublicRoute = !pathname?.startsWith('/admin') && !pathname?.startsWith('/dashboard');

  // If authenticated, show account drawer instead of sign in button
  if (authenticated) {
    return <AccountDrawer data={data} sx={sx} {...other} />;
  }

  // If not authenticated, show sign in button
  return (
    <Button
      component={RouterLink}
      href={CONFIG.auth.redirectPath}
      variant={isPublicRoute ? 'contained' : 'outlined'}
      color={isPublicRoute ? 'primary' : 'secondary'}
      sx={{
        ...(isPublicRoute
          ? {
              color: 'primary.contrastText',
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }
          : {
              color: 'common.white',
              borderColor: 'rgba(255,255,255,0.42)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.72)',
                backgroundColor: 'rgba(255,255,255,0.08)',
              },
            }),
        ...sx,
      }}
      {...other}
    >
      Sign in
    </Button>
  );
}
