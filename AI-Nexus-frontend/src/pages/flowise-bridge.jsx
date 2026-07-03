import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import axios from 'src/utils/axios';
import { resolveFlowisePublicBaseUrl, buildFlowiseExternalLoginUrl } from 'src/utils/flowise-public-url';
import { redirectFlowiseAuthFromBridge, redirectTopOrSameTab } from 'src/utils/flowise-embed-nav';
import { paths } from 'src/routes/paths';

import { CenteredCircularLoader } from 'src/components/loading/centered-circular-loader';

// ----------------------------------------------------------------------

export default function FlowiseBridgePage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      const flowiseBase = resolveFlowisePublicBaseUrl();
      if (!flowiseBase) {
        redirectTopOrSameTab('/home');
        return;
      }

      try {
        const res = await axios.get('/auth/flowise-token', {
          skipApiLoading: true,
          skipAuthRefresh: true,
        });
        const accessToken = res.data?.accessToken;
        if (!accessToken) {
          redirectTopOrSameTab(
            `${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(paths.flowiseBridge)}`
          );
          return;
        }

        const target = buildFlowiseExternalLoginUrl(accessToken);
        if (!target) {
          redirectTopOrSameTab(
            `${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(paths.flowiseBridge)}`
          );
          return;
        }
        redirectFlowiseAuthFromBridge(target);
      } catch {
        redirectTopOrSameTab(
          `${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(paths.flowiseBridge)}`
        );
      }
    };

    run();
  }, []);

  if (error) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 8 }}>
      <CenteredCircularLoader />
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
        Redirecting to Flowise with your AI Nexus session...
      </Typography>
    </Box>
  );
}
