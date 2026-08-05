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
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { AnimateLogo2 } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { intlRegister } from 'src/services/intl-auth.service';
import {
  COUNTRY_OF_RESIDENCE_OPTIONS,
  INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS,
  INTL_PAID_SIGNUP_DEFAULTS,
  IntlPaidSignUpSchema,
} from 'src/validations/intl-auth.validation';

// ----------------------------------------------------------------------

const FORM_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
  columnGap: 2,
  rowGap: 2,
  '& .MuiFormLabel-asterisk': { color: 'error.main' },
  '& > *': { minWidth: 0 },
};

const FULL = { gridColumn: '1 / -1' };

function fieldError(errors, name) {
  return errors?.[name]?.message || '';
}

// ----------------------------------------------------------------------

export function IntlSignUpView() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(IntlPaidSignUpSchema),
    defaultValues: INTL_PAID_SIGNUP_DEFAULTS,
  });

  const jobFunctionValue = watch('jobFunction');

  const onSubmit = handleSubmit(async (data) => {
    setErrorMsg('');
    try {
      await intlRegister({
        salutation: data.salutation,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        contactNumber: data.contactNumber || undefined,
        password: data.password,
        companyCode: data.companyCode || undefined,
        company: data.company,
        jobFunction: data.jobFunction,
        jobFunctionOther: data.jobFunctionOther || undefined,
        yearsOfExperience: data.yearsOfExperience,
        countryOfResidence: data.countryOfResidence,
        promoCode: data.promoCode || undefined,
      });
      router.push(paths.internationalAiFluency);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Could not create your account. Please try again.';
      setErrorMsg(Array.isArray(message) ? message.join(', ') : String(message));
    }
  });

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        px: 2,
        py: { xs: 4, md: 6 },
        bgcolor: '#f4f6f8',
        backgroundImage: 'linear-gradient(180deg, #f4f6f8 0%, #eceef1 48%, #f4f6f8 100%)',
      }}
    >
      <Box sx={{ width: 1, maxWidth: 560 }}>
        <AnimateLogo2 sx={{ mb: 1.5, mx: 'auto', transform: 'scale(0.88)' }} />

        <Stack alignItems="center" spacing={1} sx={{ mb: { xs: 2.5, md: 2 } }}>
          <Box
            sx={(theme) => ({
              px: 1.5,
              py: 0.5,
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.3,
              color: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            })}
          >
            PAYMENT
          </Box>

          <Typography variant="h5" sx={{ textAlign: 'center' }}>
            Complete your payment
          </Typography>

          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            Create your international account with email and password (local sign-in). OAuth will be
            added later.
          </Typography>

          <Stack direction="row" spacing={0.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Already have an account?
            </Typography>
            <Typography
              component={Link}
              href={paths.auth.signIn}
              variant="subtitle2"
              sx={{ color: 'primary.main', textDecoration: 'none' }}
            >
              Sign in
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

            <Box
              sx={(theme) => ({
                width: 1,
                px: 1.5,
                py: 1.25,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`,
                bgcolor: alpha(theme.palette.info.main, 0.08),
              })}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Iconify icon="solar:info-circle-bold" width={18} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Paid membership checkout will be connected next. For now, submitting creates your
                  local account so you can sign in.
                </Typography>
              </Stack>
            </Box>

            <Box sx={FORM_GRID_SX}>
              <Box sx={FULL}>
                <Controller
                  name="salutation"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      required
                      label="Salutation"
                      error={Boolean(fieldError(errors, 'salutation'))}
                      helperText={fieldError(errors, 'salutation')}
                      InputLabelProps={{ shrink: true }}
                    >
                      {['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Box>

              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    required
                    label="First name"
                    error={Boolean(fieldError(errors, 'firstName'))}
                    helperText={fieldError(errors, 'firstName')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="solar:user-id-bold-duotone" width={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    required
                    label="Last name"
                    error={Boolean(fieldError(errors, 'lastName'))}
                    helperText={fieldError(errors, 'lastName')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="solar:user-id-bold-duotone" width={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Box sx={FULL}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      required
                      type="email"
                      label="Email address"
                      error={Boolean(fieldError(errors, 'email'))}
                      helperText={fieldError(errors, 'email')}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Iconify icon="solar:letter-bold-duotone" width={18} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              <Controller
                name="contactNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contact number (optional)"
                    error={Boolean(fieldError(errors, 'contactNumber'))}
                    helperText={fieldError(errors, 'contactNumber')}
                    InputLabelProps={{ shrink: true }}
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
                    placeholder="6+ characters"
                    type={showPassword ? 'text' : 'password'}
                    error={Boolean(fieldError(errors, 'password'))}
                    helperText={fieldError(errors, 'password')}
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

              <Box sx={FULL}>
                <Controller
                  name="companyCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Company reference (optional)"
                      helperText="Optional company reference code."
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Box>

              <Controller
                name="company"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    required
                    label="Company"
                    error={Boolean(fieldError(errors, 'company'))}
                    helperText={fieldError(errors, 'company')}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />

              <Controller
                name="jobFunction"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    required
                    label="Job function"
                    error={Boolean(fieldError(errors, 'jobFunction'))}
                    helperText={fieldError(errors, 'jobFunction')}
                    InputLabelProps={{ shrink: true }}
                  >
                    {INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              <Controller
                name="yearsOfExperience"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    required
                    label="No. of years of relevant work experience in accounting and finance"
                    placeholder="0"
                    error={Boolean(fieldError(errors, 'yearsOfExperience'))}
                    helperText={fieldError(errors, 'yearsOfExperience')}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                )}
              />

              <Controller
                name="countryOfResidence"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    required
                    label="Country of residence"
                    error={Boolean(fieldError(errors, 'countryOfResidence'))}
                    helperText={fieldError(errors, 'countryOfResidence')}
                    InputLabelProps={{ shrink: true }}
                  >
                    {COUNTRY_OF_RESIDENCE_OPTIONS.map((country) => (
                      <MenuItem key={country} value={country}>
                        {country}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              {jobFunctionValue === 'others' ? (
                <Box sx={FULL}>
                  <Controller
                    name="jobFunctionOther"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        required
                        label="Please specify your job function"
                        error={Boolean(fieldError(errors, 'jobFunctionOther'))}
                        helperText={fieldError(errors, 'jobFunctionOther')}
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Box>
              ) : null}

              <Box sx={FULL}>
                <Controller
                  name="promoCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Promo code (optional)"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Box>

              <Box sx={FULL}>
                <Button
                  fullWidth
                  color="inherit"
                  size="large"
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ height: 44, fontWeight: 700 }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    'Create account'
                  )}
                </Button>
              </Box>
            </Box>
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
