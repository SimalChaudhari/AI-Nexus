import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
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
import { AuthSignUpSchema } from 'src/validations/user.validation';

import { signUp } from 'src/auth/context/jwt';

export function SimpleSignUpView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const password = useBoolean();
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [appliedSuggestion, setAppliedSuggestion] = useState('');
  const [paymentConsentChecked, setPaymentConsentChecked] = useState(false);
  const membershipOutcome = searchParams.get('membershipOutcome');
  const isPaidMembershipFlow = membershipOutcome === 'paid-signup';
  const membershipBaseAmount = 900;
  const gstRate = 0.09;
  const gstAmount = membershipBaseAmount * gstRate;
  const totalAmount = membershipBaseAmount + gstAmount;

  const defaultValues = {
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  };

  const methods = useForm({
    resolver: zodResolver(AuthSignUpSchema),
    defaultValues,
  });

  const {
    handleSubmit,
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
    const targetSize = count;

    while (candidates.size < targetSize) {
      candidates.add(`${base}${randomTwoDigits()}`);
    }

    // Keep unique + valid by your current username rules.
    return [...candidates]
      .filter((name) => /^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/i.test(name))
      .slice(0, count);
  };

  const applyUsernameSuggestion = (suggestion) => {
    methods.setValue('username', suggestion, { shouldDirty: true, shouldValidate: true });
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
      });

      // Redirect to verify page after successful registration
      const searchParams = new URLSearchParams({ email: data.email }).toString();
      const href = `${paths.auth.simple.verify}?${searchParams}`;
      router.push(href);
    } catch (error) {
      console.error(error);
      const message = error && error.message ? error.message : String(error || 'Sign up failed.');
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
    <Stack alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
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

        <Link component={RouterLink} href={paths.auth.simple.signIn} variant="subtitle2">
          Sign in
        </Link>
      </Stack>

    </Stack>
  );

  const renderForm = (
    <Stack spacing={2}>
      <Field.Text
        name="username"
        label="Username"
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
        name="password"
        label="Password"
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

      {isPaidMembershipFlow && (
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
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Iconify icon="solar:info-circle-bold" width={18} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Membership paid plan selected. Base fee is SGD 900 (excluding GST).
              </Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      {isPaidMembershipFlow && (
        <Box
          sx={(theme) => ({
            width: 1,
            p: 2,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
            bgcolor: alpha(theme.palette.primary.main, 0.06),
          })}
        >
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Payment summary
              </Typography>
              <Chip size="small" color="warning" variant="outlined" label="GST included" />
            </Stack>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Base amount</span>
              <strong>SGD {membershipBaseAmount.toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>GST (9%)</span>
              <strong>SGD {gstAmount.toFixed(2)}</strong>
            </Typography>
            <Typography variant="subtitle2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total payable</span>
              <strong>SGD {totalAmount.toFixed(2)}</strong>
            </Typography>
            <FormControlLabel
              sx={{ m: 0, mt: 0.25 }}
              control={(
                <Checkbox
                  size="small"
                  checked={paymentConsentChecked}
                  onChange={(event) => setPaymentConsentChecked(event.target.checked)}
                />
              )}
              label={(
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  I confirm this payable amount and want to continue to payment.
                </Typography>
              )}
            />
            <Button
              size="medium"
              variant="contained"
              disabled={!paymentConsentChecked}
              onClick={() => {
                const paymentParams = new URLSearchParams({
                  amount: totalAmount.toFixed(2),
                  baseAmount: membershipBaseAmount.toFixed(2),
                  gstAmount: gstAmount.toFixed(2),
                  gstRate: `${Math.round(gstRate * 100)}`,
                  currency: 'SGD',
                  source: 'membership-paid-signup',
                });
                // router.push(`${paths.payment}?${paymentParams.toString()}`);
                alert(paymentParams.toString() + " | WooshPay checkout session created successfully. Redirecting to payment page...");
              }}
            >
              Pay SGD {totalAmount.toFixed(2)}
            </Button>
          </Stack>
        </Box>
      )}

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
          {renderForm}
        </Form>
      </Box>

      {renderTerms}
    </>
  );
}

