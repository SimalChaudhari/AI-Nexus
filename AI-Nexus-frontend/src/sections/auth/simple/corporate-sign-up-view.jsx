import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { AnimateLogo2 } from 'src/components/animate';
import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';
import { CorporateSignUpSchema } from 'src/validations/user.validation';

import { signUp } from 'src/auth/context/jwt';

const CORPORATE_SIGNUP_ELIGIBILITY = {
  eligibilityType: 'corporate-isca-partner',
  snapshot: {
    signupType: 'corporate-isca-partner',
    freeSignup: true,
    partner: 'ISCA',
  },
};

export function CorporateSignUpView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const password = useBoolean();
  const returnTo = searchParams.get('returnTo') || '';
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [appliedSuggestion, setAppliedSuggestion] = useState('');

  const signInHref = returnTo
    ? `${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(returnTo)}`
    : paths.auth.simple.signIn;

  const methods = useForm({
    resolver: zodResolver(CorporateSignUpSchema),
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      companyCode: '',
      contactNumber: '',
      password: '',
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = methods;

  const usernameValue = watch('username');

  const buildUsernameSuggestions = (username, count = 10) => {
    const base = String(username || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 14);

    if (!base) return [];

    const randomTwoDigits = () => Math.floor(Math.random() * 90 + 10).toString();
    const candidates = new Set();

    while (candidates.size < count) {
      candidates.add(`${base}${randomTwoDigits()}`);
    }

    return [...candidates]
      .filter((name) => /^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/i.test(name))
      .slice(0, count);
  };

  const applyUsernameSuggestion = (suggestion) => {
    setValue('username', suggestion, { shouldDirty: true, shouldValidate: true });
    setErrorMsg('');
    setAppliedSuggestion(suggestion);
    setUsernameSuggestions([]);
    setShowAllSuggestions(false);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setUsernameSuggestions([]);
      setShowAllSuggestions(false);
      setAppliedSuggestion('');

      await signUp({
        username: data.username,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        companyCode: data.companyCode,
        contactNumber: data.contactNumber,
        eligibilityData: CORPORATE_SIGNUP_ELIGIBILITY,
      });

      const verifySearch = new URLSearchParams({ email: data.email }).toString();
      router.push(`${paths.auth.simple.verify}?${verifySearch}`);
    } catch (error) {
      const message = error?.message || 'Sign up failed.';
      setErrorMsg(message);
      if (String(message).toLowerCase().includes('username already exists')) {
        setUsernameSuggestions(buildUsernameSuggestions(data.username, 10));
        setShowAllSuggestions(false);
        setAppliedSuggestion('');
      }
    }
  });

  const renderLogo = <AnimateLogo2 sx={{ mb: 1.5, mx: 'auto', transform: 'scale(0.88)' }} />;

  const renderHead = (
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
        CREATE ACCOUNT
      </Box>

      <Typography variant="h5" sx={{ textAlign: 'center' }}>
        Get started absolutely free
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        Build your profile and start learning in minutes.
      </Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Already have an account?
        </Typography>

        <Link component={RouterLink} href={signInHref} variant="subtitle2">
          Sign in
        </Link>
      </Stack>
    </Stack>
  );

  const renderAccountFields = (
    <Stack spacing={2} sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>
      <Field.Text
        name="username"
        label="Username"
        required
        placeholder="Choose a username"
        InputLabelProps={{ shrink: true }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="solar:user-circle-bold-duotone" width={18} />
            </InputAdornment>
          ),
          endAdornment:
            appliedSuggestion && usernameValue === appliedSuggestion ? (
              <InputAdornment position="end">
                <Iconify icon="solar:verified-check-bold" width={18} sx={{ color: 'success.main' }} />
              </InputAdornment>
            ) : null,
        }}
      />
      {usernameSuggestions.length > 0 && (
        <Stack spacing={1} sx={{ mt: -1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Username is taken. Try one of these:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            {(showAllSuggestions ? usernameSuggestions : usernameSuggestions.slice(0, 4)).map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                size="small"
                clickable
                color="default"
                variant="outlined"
                onClick={() => applyUsernameSuggestion(suggestion)}
              />
            ))}
          </Stack>
          {!showAllSuggestions && usernameSuggestions.length > 4 && (
            <Stack direction="row" justifyContent="flex-end">
              <Button
                size="small"
                variant="contained"
                color="inherit"
                onClick={() => setShowAllSuggestions(true)}
                sx={{ minWidth: 'auto' }}
              >
                Show more
              </Button>
            </Stack>
          )}
        </Stack>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Field.Text
          name="firstName"
          label="First name"
          required
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:user-id-bold-duotone" width={18} />
              </InputAdornment>
            ),
          }}
        />
        <Field.Text
          name="lastName"
          label="Last name"
          required
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:user-id-bold-duotone" width={18} />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Field.Text
        name="email"
        label="Email address"
        required
        InputLabelProps={{ shrink: true }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="solar:letter-bold-duotone" width={18} />
            </InputAdornment>
          ),
        }}
      />

      <Field.Text
        name="companyCode"
        label="Organization / company name"
        required
        placeholder="e.g. Acme Pte Ltd"
        InputLabelProps={{ shrink: true }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="solar:buildings-2-bold-duotone" width={18} />
            </InputAdornment>
          ),
        }}
      />

      <Field.Phone name="contactNumber" label="Contact number (optional)" country="SG" />

      <Field.Text
        name="password"
        label="Password"
        required
        placeholder="6+ characters"
        type={password.value ? 'text' : 'password'}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="solar:lock-password-bold-duotone" width={18} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={password.onToggle} edge="end">
                <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Create account..."
        sx={{ height: 44, fontWeight: 700 }}
      >
        Create account
      </LoadingButton>
    </Stack>
  );

  const renderTerms = (
    <Typography
      component="div"
      sx={{
        mt: 3,
        mb: 0.5,
        textAlign: 'center',
        typography: 'caption',
        color: 'text.secondary',
      }}
    >
      {'By signing up, I agree to '}
      <Link underline="always" color="text.primary">
        Terms of service
      </Link>
      {' and '}
      <Link underline="always" color="text.primary">
        Privacy policy
      </Link>
      .
    </Typography>
  );

  return (
    <>
      {renderLogo}
      {renderHead}

      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Box
        sx={(theme) => ({
          p: 2.25,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.neutral, 0.8)} 100%)`,
          boxShadow: `0 20px 40px ${alpha(theme.palette.grey[500], 0.12)}`,
        })}
      >
        <Form methods={methods} onSubmit={onSubmit}>
          {renderAccountFields}
        </Form>
      </Box>

      {renderTerms}
    </>
  );
}
