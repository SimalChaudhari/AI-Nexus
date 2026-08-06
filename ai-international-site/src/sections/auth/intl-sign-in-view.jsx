'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { AuthCenteredLayout } from 'src/layouts/auth-centered';
import { paths } from 'src/routes/paths';
import { intlLogin } from 'src/services/intl-auth.service';
import { IntlSignInSchema } from 'src/validations/intl-auth.validation';

const NAVY = '#002060';

// ----------------------------------------------------------------------

function textFieldProps(field) {
  const { ref, ...rest } = field;
  return { ...rest, inputRef: ref };
}

export function IntlSignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || paths.dashboard;
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(IntlSignInSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    setErrorMsg('');
    try {
      await intlLogin(data);
      router.push(returnTo.startsWith('/') ? returnTo : paths.dashboard);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Invalid email or password.';
      setErrorMsg(Array.isArray(message) ? message.join(', ') : String(message));
    }
  });

  return (
    <AuthCenteredLayout>
      <Stack alignItems="center" spacing={1.25} sx={{ mb: 3 }}>
        <Logo disableLink sx={{ width: 104, maxWidth: 120, height: 46, maxHeight: 52 }} />

        <Typography
          sx={{
            mt: 0.5,
            px: 1.25,
            py: 0.35,
            borderRadius: 1,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: NAVY,
            bgcolor: alpha(NAVY, 0.08),
          }}
        >
          International
        </Typography>

        <Typography
          variant="h4"
          sx={{
            textAlign: 'center',
            fontWeight: 700,
            color: NAVY,
            fontSize: { xs: 22, sm: 26 },
            letterSpacing: -0.3,
          }}
        >
          Sign in
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 320, lineHeight: 1.55 }}
        >
          Access AI Fluency modules and pathway tools for accountancy professionals worldwide.
        </Typography>
      </Stack>

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      ) : null}

      <Stack spacing={2} component="form" onSubmit={onSubmit} noValidate>
        <Controller
          name="identifier"
          control={control}
          render={({ field }) => (
            <TextField
              {...textFieldProps(field)}
              fullWidth
              required
              label="Email or username"
              placeholder="Enter your email or username"
              error={Boolean(errors.identifier?.message)}
              helperText={errors.identifier?.message || ''}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="solar:user-circle-bold-duotone" width={18} />
                  </InputAdornment>
                ),
              }}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <TextField
              {...textFieldProps(field)}
              fullWidth
              required
              label="Password"
              placeholder="6+ characters"
              type={showPassword ? 'text' : 'password'}
              error={Boolean(errors.password?.message)}
              helperText={errors.password?.message || ''}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="solar:lock-password-bold-duotone" width={18} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                      <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
        />

        <Button
          fullWidth
          color="primary"
          size="large"
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          sx={{
            height: 48,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          }}
        >
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
        </Button>
      </Stack>

      <Stack alignItems="center" spacing={1.25} sx={{ mt: 2.75 }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center" useFlexGap>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            New here?
          </Typography>
          <Typography
            component={Link}
            href={`${paths.auth.signUp}?returnTo=${encodeURIComponent(returnTo)}`}
            variant="subtitle2"
            sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
          >
            Create an account
          </Typography>
        </Stack>

        <Typography
          component={Link}
          href={paths.home}
          variant="body2"
          sx={{ color: alpha(NAVY, 0.65), textDecoration: 'none', fontWeight: 500 }}
        >
          ← Back to home
        </Typography>
      </Stack>
    </AuthCenteredLayout>
  );
}
