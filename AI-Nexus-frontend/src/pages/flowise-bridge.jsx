import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { resolveFlowisePublicBaseUrl } from 'src/utils/flowise-public-url';
import { STORAGE_KEY } from 'src/auth/context/jwt/constant';
import { paths } from 'src/routes/paths';
import { getCookie } from 'src/utils/cookie';

import { CenteredCircularLoader } from 'src/components/loading/centered-circular-loader';

// ----------------------------------------------------------------------

export default function FlowiseBridgePage() {
  useEffect(() => {
    const flowiseBase = resolveFlowisePublicBaseUrl();
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    const fromLocal = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('jwt_access_token');
    const fromCookie =
      getCookie('access-token') || getCookie(STORAGE_KEY) || getCookie('jwt_access_token') || getCookie('token');
    const accessToken = fromSession || fromLocal || fromCookie;

    if (!flowiseBase) {
      window.location.replace('/home');
      return;
    }

    if (!accessToken) {
      // No AI Nexus token yet: go to sign-in then come back.
      window.location.replace(`${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(paths.flowiseBridge)}`);
      return;
    }

    // Keep canonical storage key in sessionStorage for all callers.
    if (!fromSession) {
      sessionStorage.setItem(STORAGE_KEY, accessToken);
    }

    const target = `${flowiseBase}/api/v1/auth/external-login?token=${encodeURIComponent(accessToken)}`;
    window.location.replace(target);
  }, []);

  return (
    <Box sx={{ py: 8 }}>
      <CenteredCircularLoader />
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
        Redirecting to Flowise with your AI Nexus session...
      </Typography>
    </Box>
  );
}

