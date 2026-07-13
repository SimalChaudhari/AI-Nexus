import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
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
import { AuthSignInSchema } from 'src/validations/user.validation';

import { useAuthContext } from 'src/auth/hooks';
import { signInWithPassword, resendVerification } from 'src/auth/context/jwt';
import {
  MembershipSignupDialog,
  MEMBERSHIP_SIGNUP_ENTRY_AUTH_SIGN_UP,
} from 'src/sections/learning/components/membership-signup-dialog';
import { continueMembershipSignupDialog, navigateToPaidMembershipSignup, RESUME_MEMBERSHIP_SIGNUP_QUERY, shouldOpenResumedMembershipSignupModal, stripResumeMembershipSignupFromPath, clearMembershipEligibilityDraftOnModalClose, ensureNoYesYesFlowAfterEservicesFailure, isStudentAcademicFeeWaiverResumeFlow, readResumedMembershipEligibilityFlow } from 'src/utils/membership-eligibility-sso';

// ----------------------------------------------------------------------

export function SimpleSignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkUserSession, authenticated } = useAuthContext();
  const membershipPaymentConfirmed = searchParams.get('membershipPaymentConfirmed') === '1';
  const returnTo = searchParams.get('returnTo') || '';
  const prefilledEmail = searchParams.get('email') || '';
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showResendOption, setShowResendOption] = useState(false);
  const [showCorporateForm, setShowCorporateForm] = useState(false);
  const password = useBoolean();

  const defaultValues = {
    identifier: prefilledEmail,
    password: '',
  };

  const methods = useForm({
    resolver: zodResolver(AuthSignInSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (!prefilledEmail) return;
    setValue('identifier', prefilledEmail, { shouldDirty: false, shouldValidate: false });
    setUserEmail(prefilledEmail);
  }, [prefilledEmail, setValue]);

  useEffect(() => {
    if (authenticated) {
      if (
        searchParams.get('membershipNotEligible') === '1'
        || searchParams.get(RESUME_MEMBERSHIP_SIGNUP_QUERY) === '1'
      ) {
        clearMembershipEligibilityDraftOnModalClose();
        const nextPath = stripResumeMembershipSignupFromPath(
          `${window.location.pathname}${window.location.search || ''}`
        );
        router.replace(nextPath);
      }
      setSignupModalOpen(false);
      return;
    }

    if (searchParams.get('membershipNotEligible') === '1') {
      const resumed = readResumedMembershipEligibilityFlow();
      if (
        !resumed?.flow?.showCitizenshipRecordGap
        && !isStudentAcademicFeeWaiverResumeFlow(resumed?.flow, resumed?.parsed?.membershipOutcome)
      ) {
        ensureNoYesYesFlowAfterEservicesFailure();
      }
      const params = new URLSearchParams(window.location.search || '');
      params.delete('membershipNotEligible');
      params.set(RESUME_MEMBERSHIP_SIGNUP_QUERY, '1');
      const next = params.toString();
      router.replace(`${window.location.pathname}${next ? `?${next}` : ''}`);
      setSignupModalOpen(true);
      return;
    }
    if (searchParams.get('studentAcademicVerified') === '1') {
      const params = new URLSearchParams(window.location.search || '');
      params.delete('studentAcademicVerified');
      params.set(RESUME_MEMBERSHIP_SIGNUP_QUERY, '1');
      const next = params.toString();
      router.replace(`${window.location.pathname}${next ? `?${next}` : ''}`);
      setSignupModalOpen(true);
      return;
    }
    if (searchParams.get(RESUME_MEMBERSHIP_SIGNUP_QUERY) !== '1') return;
    if (!shouldOpenResumedMembershipSignupModal()) {
      clearMembershipEligibilityDraftOnModalClose();
      const nextPath = stripResumeMembershipSignupFromPath(
        `${window.location.pathname}${window.location.search || ''}`
      );
      router.replace(nextPath);
      return;
    }
    setSignupModalOpen(true);
  }, [authenticated, searchParams, router]);

  useEffect(() => {
    if (!membershipPaymentConfirmed) return;

    setSuccessMsg(
      prefilledEmail
        ? `Payment confirmed. Your account was created successfully. Please verify ${prefilledEmail} from your email inbox, then sign in.`
        : 'Payment confirmed. Your account was created successfully. Please verify your email from your inbox, then sign in.'
    );
  }, [membershipPaymentConfirmed, prefilledEmail]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      setShowResendOption(false);
      clearErrors(['identifier', 'password']);
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

      const msg = String(errorMessage || '').toLowerCase();
      if (msg.includes('no account found')) {
        setError('identifier', { type: 'server', message: errorMessage });
      } else if (msg.includes('incorrect password')) {
        setError('password', { type: 'server', message: errorMessage });
      }

      // Check if error is about unverified account
      if (msg.includes('not verified') || msg.includes('verify your account')) {
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
        WELCOME BACK
      </Box>

      <Typography variant="h5" sx={{ textAlign: 'center' }}>
        {showCorporateForm ? 'Corporate Sign In' : 'Sign in to your account'}
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        Access your dashboard, courses, and AI tools securely.
      </Typography>
    </Stack>
  );

  const renderLandingButtons = (
    <Stack spacing={1.5}>
      <Button
        fullWidth
        size="large"
        variant="contained"
        color="primary"
        component={RouterLink}
        href={paths.auth.oauth.start}
        startIcon={<Iconify icon="solar:login-3-bold-duotone" width={18} />}
        sx={{ height: 48, fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9375rem' }, px: { xs: 1.5, sm: 2 } }}
      >
        Login with ISCA account
      </Button>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Button
        fullWidth
        size="large"
        variant="outlined"
        color="inherit"
        startIcon={<Iconify icon="solar:user-plus-bold-duotone" width={18} />}
        onClick={() => setSignupModalOpen(true)}
        sx={{ height: 48, fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.9375rem' }, px: { xs: 1.5, sm: 2 } }}
      >
        Sign up for an ISCA account
      </Button>

      <Button
        fullWidth
        size="large"
        variant="outlined"
        color="inherit"
        startIcon={<Iconify icon="solar:buildings-2-bold-duotone" width={18} />}
        onClick={() => setShowCorporateForm(true)}
        sx={{ height: 48, fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.9375rem' }, px: { xs: 1.5, sm: 2 } }}
      >
        Login as a corporate account
      </Button>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={2}>
      <Button
        size="small"
        color="inherit"
        startIcon={<Iconify icon="solar:arrow-left-bold" />}
        onClick={() => {
          setShowCorporateForm(false);
          setErrorMsg('');
          setSuccessMsg('');
          setShowResendOption(false);
        }}
        sx={{ alignSelf: 'flex-start', mb: 0.5 }}
      >
        Back
      </Button>

      <Field.Text
        name="identifier"
        label="Email or username"
        placeholder="Enter your email or username"
        InputLabelProps={{ shrink: true }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="solar:user-circle-bold-duotone" width={18} />
            </InputAdornment>
          ),
        }}
      />

      <Stack spacing={1}>
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

        <Link
          component={RouterLink}
          href={paths.auth.simple.forgotPassword}
          variant="body2"
          color="inherit"
          sx={{ alignSelf: 'flex-end' }}
        >
          Forgot password?
        </Link>
      </Stack>

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Sign in..."
        sx={{ height: 44, fontWeight: 700 }}
      >
        Sign in
      </LoadingButton>
    </Stack>
  );

  return (
    <>
      {renderLogo}

      {renderHead}

      {!!errorMsg && !showResendOption && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {!!successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      {showResendOption && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Stack spacing={1}>
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
           
          </Stack>
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
        {showCorporateForm ? (
          <Form methods={methods} onSubmit={onSubmit}>
            {renderForm}
          </Form>
        ) : (
          renderLandingButtons
        )}
      </Box>

      <MembershipSignupDialog
        entrySource={MEMBERSHIP_SIGNUP_ENTRY_AUTH_SIGN_UP}
        open={signupModalOpen}
        onClose={() => setSignupModalOpen(false)}
        onDeclineFeeWaiver={() => {
          setSignupModalOpen(false);
          navigateToPaidMembershipSignup(router.push, returnTo || paths.home);
        }}
        onContinue={(payload) => {
          setSignupModalOpen(false);
          continueMembershipSignupDialog({
            navigate: router.push,
            returnPath: returnTo || paths.home,
            authenticated: false,
            payload,
          });
        }}
      />
    </>
  );
}

