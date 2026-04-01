import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { AnimateLogo2 } from 'src/components/animate';
import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';
import { signInWithPassword, resendVerification } from 'src/auth/context/jwt';

// ----------------------------------------------------------------------

export const SignInSchema = zod.object({
  identifier: zod
    .string()
    .min(1, { message: 'Email or username is required!' }),
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
});

// ----------------------------------------------------------------------

export function SimpleSignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkUserSession } = useAuthContext();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showResendOption, setShowResendOption] = useState(false);
  const password = useBoolean();

  const defaultValues = {
    identifier: '',
    password: '',
  };

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const fillTestCredentials = (identifier, pwd) => {
    methods.setValue('identifier', identifier);
    methods.setValue('password', pwd);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      setShowResendOption(false);
      // Check if identifier is email or username
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.identifier);
      const { user } = await signInWithPassword({
        [isEmail ? 'email' : 'username']: data.identifier,
        password: data.password
      });
      await checkUserSession?.();

      // Redirect: use returnTo for non-admin if present, else role-based default
      const returnTo = searchParams.get('returnTo');
      const userRole = (user?.role || 'user').toLowerCase();
      if (userRole === 'admin') {
        router.push(`${paths.admin.root}/dashboard`);
      } else if (returnTo) {
        router.replace(returnTo);
      } else {
        router.push('/home');
      }
    } catch (error) {
      const errorMessage =
        (error instanceof Error ? error.message : null) ||
        (error?.response?.data?.message && typeof error.response.data.message === 'string' ? error.response.data.message : null) ||
        'Login failed. Please check your credentials.';
      setErrorMsg(errorMessage);

      // Check if error is about unverified account
      const msg = String(errorMessage || '').toLowerCase();
      if (msg.includes('not verified') || msg.includes('verify')) {
        setShowResendOption(true);
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.identifier);
        if (isEmail) {
          setUserEmail(data.identifier);
        }
      }
    }
  });

  const handleResendVerification = async () => {
    if (!userEmail) {
      setErrorMsg('Please enter your email address to resend verification email.');
      return;
    }

    try {
      setIsResending(true);
      setErrorMsg('');
      setSuccessMsg('');
      const result = await resendVerification({ email: userEmail });
      setSuccessMsg(result.message || 'Verification email has been sent. Please check your inbox.');
      setShowResendOption(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email.';
      setErrorMsg(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const renderLogo = <AnimateLogo2 sx={{ mb: 3, mx: 'auto' }} />;

  const renderHead = (
    <Stack alignItems="center" spacing={1.5} sx={{ mb: 5 }}>
      <Typography variant="h5">Sign in to your account</Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {`Don't have an account?`}
        </Typography>

        <Link component={RouterLink} href={paths.auth.simple.signUp} variant="subtitle2">
          Get started
        </Link>
      </Stack>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={3}>
      <Field.Text
        name="identifier"
        label="Email or username"
        placeholder="Enter your email or username"
        InputLabelProps={{ shrink: true }}
      />

      <Stack spacing={1.5}>
        <Link
          component={RouterLink}
          href={paths.auth.simple.forgotPassword}
          variant="body2"
          color="inherit"
          sx={{ alignSelf: 'flex-end' }}
        >
          Forgot password?
        </Link>

        <Field.Text
          name="password"
          label="Password"
          placeholder="6+ characters"
          type={password.value ? 'text' : 'password'}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={password.onToggle} edge="end">
                  <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Sign in..."
      >
        Sign in
      </LoadingButton>

      <Button
        fullWidth
        size="large"
        variant="outlined"
        color="inherit"
        // disabled
        component={RouterLink}
        href={paths.auth.oauth.start}
        startIcon={<Iconify icon="solar:login-3-bold-duotone" />}
        sx={{ borderStyle: 'dashed' }}
      >
        Sign in with SSO
      </Button>
    </Stack>
  );

  const renderTestCredentials = (
    <Card variant="outlined" sx={{ mt: 3, bgcolor: 'background.neutral' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Test Credentials (click to fill):
          </Typography>
          <Stack spacing={1}>
            <Typography
              variant="body2"
              component="button"
              type="button"
              onClick={() => fillTestCredentials('admin', 'Admin@123')}
              sx={{
                display: 'block',
                textAlign: 'left',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                width: '100%',
                p: 0,
                '&:hover': { color: 'primary.main' },
              }}
            >
              <strong>Admin:</strong> email: <strong>admin@ainexus.com</strong> or username: <strong>admin</strong> | password: <strong>Admin@123</strong>
            </Typography>
            <Typography
              variant="body2"
              component="button"
              type="button"
              onClick={() => fillTestCredentials('user', 'User@123')}
              sx={{
                display: 'block',
                textAlign: 'left',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                width: '100%',
                p: 0,
                '&:hover': { color: 'primary.main' },
              }}
            >
              <strong>User:</strong> email: <strong>user@ainexus.com</strong> or username: <strong>user</strong> | password: <strong>User@123</strong>
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <>
      {renderLogo}

      {renderHead}

      {!!errorMsg && !showResendOption && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {!!successMsg && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMsg}
        </Alert>
      )}

      {showResendOption && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2">
              Your account is not verified. A verification email has been sent to your email address.
            </Typography>
            {userEmail && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Didn&apos;t receive the email?
                </Typography>
                <Link
                  component="button"
                  variant="body2"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {isResending ? 'Sending...' : 'Resend verification email'}
                </Link>
              </Stack>
            )}
            <Button
              component={RouterLink}
              href={paths.auth.simple.verify}
              variant="outlined"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              Go to verification page
            </Button>
          </Stack>
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm}
      </Form>

      {renderTestCredentials}
    </>
  );
}

