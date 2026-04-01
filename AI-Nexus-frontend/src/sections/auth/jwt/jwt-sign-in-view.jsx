import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

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

export function JwtSignInView() {
  const router = useRouter();

  const { checkUserSession } = useAuthContext();

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showResendOption, setShowResendOption] = useState(false);

  const password = useBoolean();

  const defaultValues = {
    identifier: 'admin@ainexus.com',
    password: 'Admin@123',
  };

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

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

      // Redirect based on user role
      const userRole = user?.role || 'User';
      if (userRole === 'Admin') {
        router.push(`${paths.admin.root}/dashboard`);
      } else {
        router.push('/home');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please check your credentials.';
      setErrorMsg(errorMessage);

      // Check if error is about unverified account
      if (errorMessage.toLowerCase().includes('not verified') || errorMessage.toLowerCase().includes('verify')) {
        setShowResendOption(true);
        // Extract email from identifier if it's an email, otherwise we'll need to get it from the error or user
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

  const renderHead = (
    <Stack spacing={1.5} sx={{ mb: 5 }}>
      <Typography variant="h5">Sign in to your account</Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {`Don't have an account?`}
        </Typography>

        <Link component={RouterLink} href={paths.auth.jwt.signUp} variant="subtitle2">
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
          href={paths.auth.jwt.forgotPassword}
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
        onClick={onSubmit}
        loading={isSubmitting}
        loadingIndicator="Sign in..."
      >
        Sign in
      </LoadingButton>
    </Stack>
  );

  return (
    <>
      {renderHead}

      <Alert severity="info" sx={{ mb: 3 }}>
        Use <strong>{defaultValues.identifier}</strong>
        {' with password '}
        <strong>{defaultValues.password}</strong>
      </Alert>

      {!!errorMsg && (
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

      <Form methods={methods}>{renderForm}</Form>
    </>
  );
}
