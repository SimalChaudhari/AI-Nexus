import { useEffect, useState } from 'react';
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

import { getVerifiedSignupAccess, saveMembershipSignupDraft, signUp } from 'src/auth/context/jwt';
import { confirmMembershipPayment, createMembershipCheckoutSession } from 'src/services/payment.service';

function buildEligibilityDataFromFlow(flow, membershipOutcome) {
  if (!flow || typeof flow !== 'object' || Array.isArray(flow)) {
    return null;
  }

  const eligibilityType = typeof flow.eligibilityType === 'string' ? flow.eligibilityType.trim() : '';

  return {
    isSingaporePr: typeof flow.isSingaporePr === 'boolean' ? flow.isSingaporePr : undefined,
    isIscaMember: typeof flow.isIscaMember === 'boolean' ? flow.isIscaMember : undefined,
    wantsIscaMembership:
      typeof flow.wantsIscaMembership === 'boolean' ? flow.wantsIscaMembership : undefined,
    eligibilityType: eligibilityType || undefined,
    snapshot: {
      ...flow,
      membershipOutcome: membershipOutcome || '',
    },
  };
}

export function SimpleSignUpView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const password = useBoolean();
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [appliedSuggestion, setAppliedSuggestion] = useState('');
  const [paymentConsentChecked, setPaymentConsentChecked] = useState(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [paymentConfirming, setPaymentConfirming] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(null);
  const [paymentCompletedState, setPaymentCompletedState] = useState(null);
  const [paymentRedirectCountdown, setPaymentRedirectCountdown] = useState(5);
  const [verifiedSignupLoading, setVerifiedSignupLoading] = useState(false);
  const [verifiedSignupAccessError, setVerifiedSignupAccessError] = useState('');
  const [verifiedSignupPrefill, setVerifiedSignupPrefill] = useState(null);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [scaqSsoPrefillNotice, setScaqSsoPrefillNotice] = useState(false);
  const membershipOutcome = searchParams.get('membershipOutcome');
  const returnTo = searchParams.get('returnTo') || '';
  const paymentState = searchParams.get('payment') || '';
  const paymentRef = searchParams.get('ref') || '';
  const paymentSessionId = searchParams.get('session_id') || '';
  const isPaidMembershipFlow = membershipOutcome === 'paid-signup';
  const isVerifiedNricSignupFlow = membershipOutcome === 'verified-nric-signup';
  const isMembershipFeeFlow = isPaidMembershipFlow || isVerifiedNricSignupFlow;
  const signupAccessToken = searchParams.get('signupAccessToken') || '';
  const membershipDraftFormStorageKey = 'membershipSignupDraftForm';
  const membershipEligibilityStorageKey = 'membershipEligibilityFlow';
  const pendingMembershipSessionKey = 'pending_membership_session_id';
  const pendingMembershipRefKey = 'pending_membership_ref';
  const trimPaymentLogValue = (value, keep = 18) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '(none)';
    return normalized.length > keep ? `${normalized.slice(0, keep)}...` : normalized;
  };
  const membershipBaseAmount = isVerifiedNricSignupFlow ? 300 : 900;
  const gstRate = 0.09;
  const gstAmount = membershipBaseAmount * gstRate;
  const totalAmount = membershipBaseAmount + gstAmount;
  const isVerifiedSignupSignInOnlyState =
    isVerifiedNricSignupFlow
    && !!verifiedSignupAccessError
    && verifiedSignupAccessError.toLowerCase().includes('sign in');
  const signInHref = returnTo
    ? `${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(returnTo)}`
    : paths.auth.simple.signIn;
  const buildPaymentCompleteSignInHref = (email = '') => {
    const nextSearch = new URLSearchParams();
    if (returnTo) nextSearch.set('returnTo', returnTo);
    if (email) nextSearch.set('email', email);
    nextSearch.set('membershipPaymentConfirmed', '1');
    return `${paths.auth.simple.signIn}?${nextSearch.toString()}`;
  };
  const membershipInfoText = isVerifiedNricSignupFlow
    ? 'Verified document membership rate applied. Base fee is SGD 300 (excluding GST).'
    : 'Membership paid plan selected. Base fee is SGD 900 (excluding GST).';
  const membershipSource = isVerifiedNricSignupFlow ? 'membership-verified-signup' : 'membership-paid-signup';
  const membershipBadgeLabel = isVerifiedNricSignupFlow ? 'Discount applied' : 'GST included';
  const normalizedPaymentRef =
    paymentRef || (typeof window !== 'undefined' ? sessionStorage.getItem(pendingMembershipRefKey) || '' : '');
  const normalizedPaymentSessionId =
    paymentSessionId && !paymentSessionId.includes('{CHECKOUT_SESSION_ID}') ? paymentSessionId : '';

  const resolveMembershipPaymentNotice = (error, phase = 'confirm') => {
    const fallbackMessage =
      phase === 'start'
        ? 'Could not start membership payment.'
        : 'We could not confirm your payment yet. Please try again.';
    const message = error?.message || String(error || fallbackMessage);
    const normalizedMessage = String(message || fallbackMessage).trim() || fallbackMessage;
    const lowerMessage = normalizedMessage.toLowerCase();

    if (lowerMessage.includes('still being processed') || lowerMessage.includes('not completed yet')) {
      return {
        severity: 'warning',
        message: 'Payment is still being verified. Please wait a moment and try again.',
      };
    }

    if (
      lowerMessage.includes('not completed successfully')
      || lowerMessage.includes('payment was not completed')
      || lowerMessage.includes('canceled')
      || lowerMessage.includes('cancelled')
      || lowerMessage.includes('expired')
    ) {
      return {
        severity: 'warning',
        message: normalizedMessage,
      };
    }

    return {
      severity: 'error',
      message: normalizedMessage,
    };
  };

  const defaultValues = {
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    password: '',
  };

  const methods = useForm({
    resolver: zodResolver(AuthSignUpSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    getValues,
    reset,
    watch,
    formState: { isSubmitting },
  } = methods;
  const usernameValue = watch('username');

  useEffect(() => {
    let active = true;

    if (!isVerifiedNricSignupFlow) {
      setVerifiedSignupLoading(false);
      setVerifiedSignupAccessError('');
      setVerifiedSignupPrefill(null);
      return () => {
        active = false;
      };
    }

    if (!signupAccessToken) {
      setVerifiedSignupLoading(false);
      setVerifiedSignupAccessError('This verified signup link is invalid or missing. Please run NRIC verification again.');
      setVerifiedSignupPrefill(null);
      return () => {
        active = false;
      };
    }

    setVerifiedSignupLoading(true);
    setVerifiedSignupAccessError('');

    getVerifiedSignupAccess({ token: signupAccessToken })
      .then((response) => {
        if (!active) return;
        const prefill = response?.prefill || {};
        setVerifiedSignupPrefill(prefill);
        reset({
          username: prefill.username || '',
          firstName: prefill.firstName || '',
          lastName: prefill.lastName || '',
          email: prefill.email || '',
          contactNumber: prefill.contactNumber || '',
          password: '',
        });
      })
      .catch((error) => {
        if (!active) return;
        setVerifiedSignupPrefill(null);
        setVerifiedSignupAccessError(
          error?.message || 'Verified signup access is invalid or expired. Please run NRIC verification again.'
        );
      })
      .finally(() => {
        if (!active) return;
        setVerifiedSignupLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isVerifiedNricSignupFlow, reset, signupAccessToken]);

  useEffect(() => {
    if (!isMembershipFeeFlow) {
      setEligibilityData(null);
      return;
    }

    setEligibilityData(null);

    try {
      const stored = sessionStorage.getItem(membershipEligibilityStorageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.membershipOutcome !== membershipOutcome || !parsed?.flow) return;
      setEligibilityData(buildEligibilityDataFromFlow(parsed.flow, parsed.membershipOutcome));
    } catch {
      // Ignore invalid cached eligibility payloads.
    }
  }, [isMembershipFeeFlow, membershipEligibilityStorageKey, membershipOutcome]);

  useEffect(() => {
    if (!isPaidMembershipFlow) {
      setScaqSsoPrefillNotice(false);
      return;
    }

    try {
      const stored = sessionStorage.getItem(membershipDraftFormStorageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.membershipOutcome !== membershipOutcome || !parsed?.values) return;

      if (parsed?.flow) {
        setEligibilityData(buildEligibilityDataFromFlow(parsed.flow, membershipOutcome));
      } else if (parsed?.eligibility) {
        setEligibilityData(parsed.eligibility);
      }

      if (parsed?.prefillSource === 'scaq-sso-rejected') {
        setScaqSsoPrefillNotice(true);
      }

      reset({
        username: parsed.values.username || '',
        firstName: parsed.values.firstName || '',
        lastName: parsed.values.lastName || '',
        email: parsed.values.email || '',
        contactNumber: parsed.values.contactNumber || '',
        password: '',
      });
    } catch {
      // Ignore invalid cached draft payloads.
    }
  }, [isPaidMembershipFlow, membershipDraftFormStorageKey, membershipOutcome, reset]);

  useEffect(() => {
    if (!isMembershipFeeFlow || paymentState !== 'canceled') return;

    setPaymentNotice({
      severity: 'warning',
      message: 'Payment was not completed. Your details are still saved as a draft. Continue payment to create your account.',
    });
  }, [isMembershipFeeFlow, paymentState]);

  useEffect(() => {
    if (!paymentCompletedState) {
      return undefined;
    }

    if (paymentRedirectCountdown <= 0) {
      router.replace(buildPaymentCompleteSignInHref(paymentCompletedState.email));
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPaymentRedirectCountdown((current) => current - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [buildPaymentCompleteSignInHref, paymentCompletedState, paymentRedirectCountdown, router]);

  useEffect(() => {
    if (!isMembershipFeeFlow || paymentState !== 'success') {
      return undefined;
    }

    if (!normalizedPaymentRef) {
      setPaymentNotice({
        severity: 'error',
        message: 'We could not find your payment reference. Please return to the signup page and try again.',
      });
      setErrorMsg('');
      return undefined;
    }

    let active = true;
    const fallbackSessionId =
      normalizedPaymentSessionId
      || (typeof window !== 'undefined' ? sessionStorage.getItem(pendingMembershipSessionKey) || '' : '');

    setPaymentConfirming(true);
    setPaymentCompletedState(null);
    setPaymentRedirectCountdown(5);
    setPaymentNotice({
      severity: 'info',
      message: 'Payment received. We are creating your account now...',
    });
    setErrorMsg('');
    console.info('[MembershipPayment] Confirmation started', {
      refId: trimPaymentLogValue(normalizedPaymentRef),
      sessionId: trimPaymentLogValue(fallbackSessionId),
    });

    confirmMembershipPayment({ ref: normalizedPaymentRef, sessionId: fallbackSessionId })
      .then((response) => {
        if (!active) return;
        console.info('[MembershipPayment] Confirmation success', {
          refId: trimPaymentLogValue(normalizedPaymentRef),
          userId: trimPaymentLogValue(response?.userId),
        });

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('membershipDraftUserId');
          sessionStorage.removeItem(membershipDraftFormStorageKey);
          sessionStorage.removeItem(membershipEligibilityStorageKey);
          sessionStorage.removeItem(pendingMembershipSessionKey);
          sessionStorage.removeItem(pendingMembershipRefKey);
        }

        const verifiedEmail = response?.email || getValues('email') || '';
        setPaymentNotice(null);
        setPaymentCompletedState({
          email: verifiedEmail,
          userId: response?.userId || '',
        });
        setPaymentRedirectCountdown(5);
      })
      .catch((error) => {
        if (!active) return;
        const notice = resolveMembershipPaymentNotice(error, 'confirm');
        console.error('[MembershipPayment] Confirmation failed', {
          refId: trimPaymentLogValue(normalizedPaymentRef),
          sessionId: trimPaymentLogValue(fallbackSessionId),
          message: notice.message,
        });
        setPaymentNotice(notice);
        setErrorMsg('');
      })
      .finally(() => {
        if (!active) return;
        setPaymentConfirming(false);
      });

    return () => {
      active = false;
    };
  }, [
    getValues,
    isMembershipFeeFlow,
    membershipDraftFormStorageKey,
    membershipEligibilityStorageKey,
    normalizedPaymentRef,
    normalizedPaymentSessionId,
    paymentState,
    pendingMembershipRefKey,
    pendingMembershipSessionKey,
    router,
  ]);

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

  const handleSignupError = (error, attemptedUsername) => {
    console.error(error);
    const message = error && error.message ? error.message : String(error || 'Sign up failed.');
    setErrorMsg(message);

    if (String(message).toLowerCase().includes('username already exists')) {
      setUsernameSuggestions(buildUsernameSuggestions(attemptedUsername, 10));
      setShowAllSuggestions(false);
      setAppliedSuggestion('');
    }
  };

  const handleCreateAccount = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setPaymentNotice(null);
      setUsernameSuggestions([]);
      setShowAllSuggestions(false);
      setAppliedSuggestion('');
      await signUp({
        username: data.username,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: data.contactNumber,
        signupAccessToken: isVerifiedNricSignupFlow ? signupAccessToken : undefined,
        eligibilityData,
      });

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(membershipEligibilityStorageKey);
      }

      // Redirect to verify page after successful registration
      const verifySearch = new URLSearchParams({ email: data.email }).toString();
      const href = `${paths.auth.simple.verify}?${verifySearch}`;
      router.push(href);
    } catch (error) {
      handleSignupError(error, data.username);
    }
  });

  const handleMembershipPayment = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setPaymentNotice(null);
      setUsernameSuggestions([]);
      setShowAllSuggestions(false);
      setAppliedSuggestion('');
      setPaymentActionLoading(true);
      console.info('[MembershipPayment] Checkout started', {
        source: membershipSource,
        flow: membershipOutcome || 'default',
      });

      const cachedDraftUserId =
        typeof window !== 'undefined' ? sessionStorage.getItem('membershipDraftUserId') || '' : '';

      const draftResponse = await saveMembershipSignupDraft({
        username: data.username,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: data.contactNumber,
        signupAccessToken: isVerifiedNricSignupFlow ? signupAccessToken : undefined,
        draftUserId: cachedDraftUserId || undefined,
        eligibilityData,
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          membershipDraftFormStorageKey,
          JSON.stringify({
            membershipOutcome,
            eligibility: eligibilityData,
            values: {
              username: data.username,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              contactNumber: data.contactNumber,
              password: data.password,
            },
          })
        );
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const nextSearch = new URLSearchParams();
      if (membershipOutcome) nextSearch.set('membershipOutcome', membershipOutcome);
      if (returnTo) nextSearch.set('returnTo', returnTo);
      if (isVerifiedNricSignupFlow && signupAccessToken) {
        nextSearch.set('signupAccessToken', signupAccessToken);
      }

      const successSearch = new URLSearchParams(nextSearch);
      successSearch.set('payment', 'success');
      successSearch.set('session_id', '{CHECKOUT_SESSION_ID}');

      const cancelSearch = new URLSearchParams(nextSearch);
      cancelSearch.set('payment', 'canceled');

      const checkoutResponse = await createMembershipCheckoutSession({
        draftUserId: draftResponse?.draftUserId || cachedDraftUserId,
        signupAccessToken: isVerifiedNricSignupFlow ? signupAccessToken : undefined,
        source: membershipSource,
        successUrl: `${baseUrl}${paths.auth.simple.signUp}?${successSearch.toString()}`,
        cancelUrl: `${baseUrl}${paths.auth.simple.signUp}?${cancelSearch.toString()}`,
        currency: 'sgd',
      });

      if (!checkoutResponse?.url) {
        throw new Error('Could not start membership payment.');
      }

      if (typeof window !== 'undefined') {
        if (checkoutResponse?.sessionId) {
          sessionStorage.setItem(pendingMembershipSessionKey, checkoutResponse.sessionId);
        }
        if (checkoutResponse?.refId) {
          sessionStorage.setItem(pendingMembershipRefKey, checkoutResponse.refId);
        }
        console.info('[MembershipPayment] Checkout redirect ready', {
          refId: trimPaymentLogValue(checkoutResponse?.refId),
          sessionId: trimPaymentLogValue(checkoutResponse?.sessionId),
        });
        window.location.href = checkoutResponse.url;
      }
    } catch (error) {
      const rawMessage = String(error?.message || '').toLowerCase();
      if (rawMessage.includes('username already exists')) {
        handleSignupError(error, data.username);
      } else {
        const notice = resolveMembershipPaymentNotice(error, 'start');
        console.error('[MembershipPayment] Checkout failed', {
          source: membershipSource,
          message: notice.message,
        });
        setPaymentNotice(notice);
        setErrorMsg('');
      }
    } finally {
      setPaymentActionLoading(false);
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
        {isMembershipFeeFlow ? 'MEMBERSHIP PAYMENT' : 'CREATE ACCOUNT'}
      </Box>

      <Typography variant="h5" sx={{ textAlign: 'center' }}>
        {isVerifiedNricSignupFlow
          ? 'Complete your verified membership setup'
          : isPaidMembershipFlow
            ? 'Complete your membership payment'
            : 'Get started absolutely free'}
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        {isMembershipFeeFlow
          ? 'Your details stay saved as a draft. We create your account automatically after successful payment.'
          : 'Build your profile and start learning in minutes.'}
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

      <Field.Phone name="contactNumber" label="Contact number (optional)" />

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

      {isMembershipFeeFlow && (
        <Box
          sx={(theme) => ({
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            border: `1px solid ${alpha(theme.palette.success.main, 0.22)}`,
            bgcolor: alpha(theme.palette.success.main, 0.08),
          })}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Iconify icon="solar:shield-check-bold" width={18} />
            <Stack spacing={0.25}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                No separate create account step
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                We save these details as a draft first. Your account is created automatically only after payment succeeds.
              </Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      {!isMembershipFeeFlow && (
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
      )}
    </Stack>
  );

  const renderMembershipPanel = isMembershipFeeFlow ? (
    <Stack spacing={1.5} sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
      {scaqSsoPrefillNotice && (
        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
          You signed in with Salesforce, but you are not registered as an SCAQ candidate. Your name and email are
          pre-filled below. Complete paid signup (SGD 900 excluding GST) to continue.
        </Alert>
      )}
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
          direction={{ xs: 'column', sm: 'row', md: 'column' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center', md: 'flex-start' }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Iconify icon="solar:info-circle-bold" width={18} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {membershipInfoText}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Your form details are saved as a draft first. We only activate the account after payment is confirmed.
          </Typography>
        </Stack>
      </Box>

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
            <Chip size="small" color="warning" variant="outlined" label={membershipBadgeLabel} />
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
          <LoadingButton
            size="medium"
            variant="contained"
            fullWidth
            loading={paymentActionLoading || paymentConfirming}
            disabled={!paymentConsentChecked || verifiedSignupLoading || paymentConfirming}
            onClick={handleMembershipPayment}
          >
            {paymentConfirming ? 'Creating account...' : `Pay SGD ${totalAmount.toFixed(2)}`}
          </LoadingButton>
        </Stack>
      </Box>
    </Stack>
  ) : null;

  const renderForm = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: isMembershipFeeFlow
          ? { xs: '1fr', md: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)' }
          : '1fr',
        gap: { xs: 2, md: 3 },
        alignItems: 'start',
      }}
    >
      <Box>{renderAccountFields}</Box>
      {renderMembershipPanel}
    </Box>
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

  const renderPaymentConfirmed = paymentCompletedState ? (
    <Box
      sx={(theme) => ({
        p: 3,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
        background: `linear-gradient(180deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
        boxShadow: `0 20px 40px ${alpha(theme.palette.success.main, 0.12)}`,
      })}
    >
      <Stack spacing={2.25} alignItems="center" textAlign="center">
        <Box
          sx={(theme) => ({
            width: 68,
            height: 68,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            color: 'success.main',
            bgcolor: alpha(theme.palette.success.main, 0.12),
          })}
        >
          <Iconify icon="solar:check-circle-bold" width={34} />
        </Box>

        <Stack spacing={0.75}>
          <Typography variant="h5">Payment confirmed</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
            Your membership payment was confirmed and your account setup is complete.
            {paymentCompletedState.email
              ? ` We sent a verification email to ${paymentCompletedState.email}.`
              : ' We sent a verification email to your registered email address.'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
            You will be redirected to the sign-in page in {paymentRedirectCountdown} second{paymentRedirectCountdown === 1 ? '' : 's'}.
            Please verify your email before signing in.
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Button variant="contained" onClick={() => router.replace(buildPaymentCompleteSignInHref(paymentCompletedState.email))}>
            Go to sign in now
          </Button>
          <Button
            variant="outlined"
            component={RouterLink}
            href={paymentCompletedState.email ? `${paths.auth.simple.verify}?email=${encodeURIComponent(paymentCompletedState.email)}` : paths.auth.simple.verify}
          >
            Open email verification page
          </Button>
        </Stack>
      </Stack>
    </Box>
  ) : null;

  return (
    <>
      {renderLogo}

      {!paymentCompletedState && renderHead}

      {paymentCompletedState && renderPaymentConfirmed}

      {!paymentCompletedState && isVerifiedNricSignupFlow && verifiedSignupLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Validating your secure verified signup access...
        </Alert>
      )}

      {!paymentCompletedState && isVerifiedNricSignupFlow && !!verifiedSignupAccessError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {verifiedSignupAccessError}
        </Alert>
      )}

      {!paymentCompletedState && isVerifiedSignupSignInOnlyState && (
        <Stack sx={{ mb: 2 }} alignItems="flex-end">
          <Button component={RouterLink} href={signInHref} variant="contained">
            Sign in
          </Button>
        </Stack>
      )}

      {!paymentCompletedState && isVerifiedNricSignupFlow && !verifiedSignupLoading && !verifiedSignupAccessError && (
        <Alert severity="success" sx={{ mb: 2 }}>
          NRIC verification confirmed.
          {verifiedSignupPrefill?.address ? ` Verified address: ${verifiedSignupPrefill.address}` : ''}
        </Alert>
      )}

      {!paymentCompletedState && !!paymentNotice && (
        <Alert severity={paymentNotice.severity || 'info'} sx={{ mb: 2 }}>
          {paymentNotice.message}
        </Alert>
      )}

      {!paymentCompletedState && !!errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {!paymentCompletedState && !(isVerifiedNricSignupFlow && (verifiedSignupLoading || verifiedSignupAccessError)) && (
        <Box
          sx={(theme) => ({
            p: 2.25,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.neutral, 0.8)} 100%)`,
            boxShadow: `0 20px 40px ${alpha(theme.palette.grey[500], 0.12)}`,
          })}
        >
          <Form methods={methods} onSubmit={isMembershipFeeFlow ? handleMembershipPayment : handleCreateAccount}>
            {renderForm}
          </Form>
        </Box>
      )}

      {!paymentCompletedState && renderTerms}
    </>
  );
}

