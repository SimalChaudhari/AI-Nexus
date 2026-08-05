'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

import { AnimateLogo2 } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { intlLogin } from 'src/services/intl-auth.service';
import { IntlSignInSchema } from 'src/validations/intl-auth.validation';

// ----------------------------------------------------------------------

export function IntlSignInView() {
  const router = useRouter();
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
      router.push(paths.internationalAiFluency);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Invalid email or password.';
      setErrorMsg(Array.isArray(message) ? message.join(', ') : String(message));
    }
  });

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: { xs: 4, md: 6 },
        bgcolor: '#f4f6f8',
        backgroundImage: 'linear-gradient(180deg, #f4f6f8 0%, #eceef1 48%, #f4f6f8 100%)',
      }}
    >
      <Box sx={{ width: 1, maxWidth: 420 }}>
        <AnimateLogo2 sx={{ mb: 1.5, mx: 'auto', transform: 'scale(0.88)' }} />

        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ textAlign: 'center' }}>
            Sign in
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            Local email and password sign-in for AI Nexus International.
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              New here?
            </Typography>
            <Typography
              component={Link}
              href={paths.auth.signUp}
              variant="subtitle2"
              sx={{ color: 'primary.main', textDecoration: 'none' }}
            >
              Create an account
            </Typography>
          </Stack>
        </Stack>

        <Box
          sx={(theme) => ({
            p: { xs: 2.5, md: 3 },
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
            boxShadow: `0 8px 24px ${alpha(theme.palette.grey[500], 0.08)}`,
          })}
        >
          <Stack spacing={2} component="form" onSubmit={onSubmit} noValidate>
            {errorMsg ? <Alert severity="error">{errorMsg}</Alert> : null}

            <Controller
              name="identifier"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  required
                  label="Email or username"
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
                  {...field}
                  fullWidth
                  required
                  label="Password"
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
                          <Iconify
                            icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Button
              fullWidth
              color="inherit"
              size="large"
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{ height: 44, fontWeight: 700 }}
            >
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
            </Button>
          </Stack>
        </Box>

        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Typography
            component={Link}
            href={paths.home}
            variant="body2"
            sx={{ color: 'text.secondary', textDecoration: 'none' }}
          >
            ← Back to home
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
