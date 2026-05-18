import { useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getOAuthAuthUrl } from 'src/auth/context/jwt';
import { POST_OAUTH_RETURN_TO_KEY, setScaqSsoVerificationPending } from 'src/utils/membership-eligibility-sso';

// ----------------------------------------------------------------------

export default function OAuthStartPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('membershipOutcome') === 'scaq-sso-verify') {
          setScaqSsoVerificationPending();
        }
        const returnTo = params.get('returnTo');
        if (returnTo) {
          try {
            sessionStorage.setItem(POST_OAUTH_RETURN_TO_KEY, decodeURIComponent(returnTo));
          } catch {
            sessionStorage.setItem(POST_OAUTH_RETURN_TO_KEY, returnTo);
          }
        }

        const scaqVerify = params.get('membershipOutcome') === 'scaq-sso-verify';
        const { authUrl } = await getOAuthAuthUrl({ scaqVerify });
        if (cancelled) return;
        if (authUrl && (authUrl.startsWith('http://') || authUrl.startsWith('https://'))) {
          window.location.href = authUrl;
          return;
        }
        setError('SSO is not configured or invalid. Please try sign in with email.');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start SSO sign-in.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  if (loading && !error) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh', p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Redirecting to SSO...
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 480, mx: 'auto', mt: 8, p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button component={RouterLink} href={paths.auth.simple.signIn} variant="contained" size="medium">
          Back to sign in
        </Button>
      </Stack>
    );
  }

  return null;
}
