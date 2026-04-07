import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import {
  setSession,
  jwtDecode,
  exchangeOAuthCode,
} from 'src/auth/context/jwt';

// ----------------------------------------------------------------------

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const { checkUserSession } = useAuthContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const success = searchParams.get('success');
      const code = searchParams.get('code');
      const accessToken = searchParams.get('accessToken');
      const errorParam = searchParams.get('error');

      if (errorParam || success === 'false') {
        setError(searchParams.get('error') || 'SSO sign-in failed. Please try again.');
        setLoading(false);
        return;
      }

      try {
        if (code) {
          await exchangeOAuthCode({
            code,
            state: searchParams.get('state') || undefined,
          });
        } else if (accessToken) {
          setSession(accessToken);
          const userId = searchParams.get('userId');
          const email = searchParams.get('email');
          const firstName = searchParams.get('firstName');
          const lastName = searchParams.get('lastName');
          let role = 'User';
          try {
            const decoded = jwtDecode(accessToken);
            const { role: decodedRole } = decoded || {};
            if (decodedRole) role = decodedRole;
          } catch {
            // use default role if decode fails
          }
          const user = {
            id: userId,
            email,
            firstname: firstName,
            lastname: lastName,
            role,
          };
          sessionStorage.setItem('user', JSON.stringify(user));
        } else {
          setError('Missing access token or code.');
          setLoading(false);
          return;
        }

        await checkUserSession?.();
        const userStr = sessionStorage.getItem('user');
        let userRole = 'User';
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            userRole = (u?.role || 'User').toLowerCase();
          } catch {
            // use default role if parse fails
          }
        }
        if (userRole === 'admin') {
          router.replace(`${paths.admin.root}/dashboard`);
        } else {
          router.replace('/home');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'SSO sign-in failed.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [searchParams, router, checkUserSession]);

  if (loading && !error) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh', p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Completing sign-in...
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
