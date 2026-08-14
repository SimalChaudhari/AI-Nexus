import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z as zod } from 'zod';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { AnimateLogo2 } from 'src/components/animate';
import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import {
  confirmAffiliatePayment,
  createAffiliateSignupCheckout,
  trackAffiliateClick,
  validateAffiliateCodes,
} from 'src/services/affiliate.service';
import { passwordSchema, PASSWORD_COMPLEXITY_HINT } from 'src/validations/user.validation';

// ----------------------------------------------------------------------

const AFFILIATE_REF_STORAGE_KEY = 'affiliateSignupRefCode';
const AFFILIATE_DRAFT_STORAGE_KEY = 'affiliateSignupDraft';
const AFFILIATE_PENDING_REF_KEY = 'pending_affiliate_ref';
const AFFILIATE_PENDING_SESSION_KEY = 'pending_affiliate_session_id';

const AffiliateSignUpSchema = zod.object({
  username: zod
    .string()
    .min(1, { message: 'Username is required' })
    .max(50, { message: 'Username must be less than 50 characters' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Email must be a valid email address' }),
  password: passwordSchema,
  affiliateCode: zod.string().optional(),
  voucherCode: zod.string().optional(),
});

function formatMoney(amount, currency = 'SGD') {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  return `${currency} ${safe.toFixed(2)}`;
}

export function AffiliateSignUpView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const password = useBoolean();
  const trackedRef = useRef('');

  const refFromUrl = (searchParams.get('ref') || '').trim().toUpperCase();
  const paymentState = searchParams.get('payment') || '';
  const paymentRef = searchParams.get('ref') || '';
  const paymentSessionId = searchParams.get('session_id') || '';
  const step = searchParams.get('step') || 'form';

  const [errorMsg, setErrorMsg] = useState('');
  const [pricing, setPricing] = useState(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const defaultAffiliateCode = useMemo(() => {
    if (typeof window === 'undefined') return refFromUrl;
    if (refFromUrl && !paymentState && step === 'form') {
      return refFromUrl;
    }
    return sessionStorage.getItem(AFFILIATE_REF_STORAGE_KEY) || '';
  }, [refFromUrl, paymentState, step]);

  const methods = useForm({
    resolver: zodResolver(AffiliateSignUpSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      affiliateCode: defaultAffiliateCode,
      voucherCode: '',
    },
  });

  const { handleSubmit, setValue, watch, getValues } = methods;
  const watchedAffiliate = watch('affiliateCode');
  const watchedVoucher = watch('voucherCode');

  const persistDraft = useCallback((values, nextPricing) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(
      AFFILIATE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        ...values,
        pricing: nextPricing || null,
      })
    );
  }, []);

  // Capture affiliate link ?ref=SP001
  useEffect(() => {
    if (!refFromUrl || paymentState || step === 'checkout') return;
    // Ignore payment return refs (short alphanumeric payment refs vs codes like SP001)
    if (refFromUrl.length > 24) return;

    sessionStorage.setItem(AFFILIATE_REF_STORAGE_KEY, refFromUrl);
    setValue('affiliateCode', refFromUrl);

    if (trackedRef.current === refFromUrl) return;
    trackedRef.current = refFromUrl;
    trackAffiliateClick({
      affiliateCode: refFromUrl,
      landingPath: window.location.pathname + window.location.search,
    }).catch(() => {
      // Click tracking should not block signup.
    });
  }, [refFromUrl, paymentState, setValue, step]);

  // Restore draft when opening checkout step
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(AFFILIATE_DRAFT_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      methods.reset({
        username: parsed.username || '',
        email: parsed.email || '',
        password: parsed.password || '',
        affiliateCode: parsed.affiliateCode || defaultAffiliateCode || '',
        voucherCode: parsed.voucherCode || '',
      });
      if (parsed.pricing) setPricing(parsed.pricing);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runValidation = useCallback(async (affiliateCode, voucherCode) => {
    setValidating(true);
    setErrorMsg('');
    try {
      const result = await validateAffiliateCodes({ affiliateCode, voucherCode });
      setPricing(result);
      return result;
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || 'Could not validate codes.';
      setErrorMsg(message);
      return null;
    } finally {
      setValidating(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 'form') return undefined;
    const timer = setTimeout(() => {
      runValidation(watchedAffiliate, watchedVoucher);
    }, 400);
    return () => clearTimeout(timer);
  }, [watchedAffiliate, watchedVoucher, runValidation, step]);

  // Confirm payment on return from gateway
  useEffect(() => {
    if (paymentState === 'canceled') {
      setErrorMsg('Payment was canceled. You can try again when ready.');
      return;
    }

    const pendingRef =
      paymentRef
      || (typeof window !== 'undefined' ? sessionStorage.getItem(AFFILIATE_PENDING_REF_KEY) : '')
      || '';
    const pendingSession =
      (paymentSessionId && !paymentSessionId.includes('{CHECKOUT_SESSION_ID}')
        ? paymentSessionId
        : '')
      || (typeof window !== 'undefined'
        ? sessionStorage.getItem(AFFILIATE_PENDING_SESSION_KEY) || ''
        : '');

    // Payment return: URL has session_id or we have a pending payment ref after redirect
    const looksLikePaymentReturn = Boolean(paymentSessionId) || Boolean(searchParams.get('ref') && step === 'checkout' && pendingSession);

    if (!looksLikePaymentReturn && !pendingSession) return undefined;
    if (!pendingRef) return undefined;

    let cancelled = false;
    (async () => {
      setConfirming(true);
      setErrorMsg('');
      try {
        const result = await confirmAffiliatePayment({
          ref: pendingRef,
          sessionId: pendingSession || undefined,
        });
        if (cancelled) return;
        setSuccessInfo(result);
        sessionStorage.removeItem(AFFILIATE_PENDING_REF_KEY);
        sessionStorage.removeItem(AFFILIATE_PENDING_SESSION_KEY);
        sessionStorage.removeItem(AFFILIATE_DRAFT_STORAGE_KEY);
      } catch (error) {
        if (cancelled) return;
        setErrorMsg(
          error?.response?.data?.message || error?.message || 'Could not confirm payment.'
        );
      } finally {
        if (!cancelled) setConfirming(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentRef, paymentSessionId, paymentState, searchParams, step]);

  const onContinueToCheckout = handleSubmit(async (data) => {
    const result = await runValidation(data.affiliateCode, data.voucherCode);
    if (!result) return;
    persistDraft(data, result);
    router.push(`${paths.auth.affiliate.signUp}?step=checkout`);
  });

  const onPay = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const values = getValues();
      const origin = window.location.origin;
      const successUrl = `${origin}${paths.auth.affiliate.signUp}?step=checkout`;
      const cancelUrl = `${origin}${paths.auth.affiliate.signUp}?step=checkout`;

      const response = await createAffiliateSignupCheckout({
        username: values.username,
        email: values.email,
        password: values.password,
        affiliateCode: values.affiliateCode || undefined,
        voucherCode: values.voucherCode || undefined,
        successUrl,
        cancelUrl,
      });

      if (response?.refId) {
        sessionStorage.setItem(AFFILIATE_PENDING_REF_KEY, response.refId);
      }
      if (response?.sessionId) {
        sessionStorage.setItem(AFFILIATE_PENDING_SESSION_KEY, response.sessionId);
      }
      if (response?.pricing) {
        setPricing((prev) => ({ ...(prev || {}), ...response.pricing }));
        persistDraft(values, { ...(pricing || {}), ...response.pricing });
      }

      if (response?.url) {
        window.location.href = response.url;
        return;
      }
      setErrorMsg('Checkout URL was not returned by the payment service.');
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message || error?.message || 'Could not start payment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const payableAmount = pricing?.payableAmount;
  const originalAmount = pricing?.originalAmount;
  const currency = pricing?.currency || 'SGD';
  const discountApplied = Boolean(pricing?.discountApplied);
  const appliedCodes = [
    pricing?.affiliateValid ? pricing?.affiliateCode : null,
    pricing?.voucherValid ? pricing?.voucherCode : null,
  ].filter(Boolean);

  if (successInfo) {
    return (
      <Stack spacing={3} sx={{ py: 4 }}>
        <AnimateLogo2 sx={{ mx: 'auto' }} />
        <Alert severity="success">
          Payment confirmed. Your account has been created.
        </Alert>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Welcome, {successInfo.username || 'member'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Email: {successInfo.email}
          </Typography>
          {successInfo.affiliateCode && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Affiliate code: {successInfo.affiliateCode}
            </Typography>
          )}
          {successInfo.voucherCode && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Voucher code: {successInfo.voucherCode}
            </Typography>
          )}
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            Paid: {formatMoney(successInfo.payableAmount, successInfo.currency || currency)}
          </Typography>
        </Box>
        <Button component={RouterLink} href={paths.auth.simple.signIn} variant="contained" size="large">
          Continue to sign in
        </Button>
      </Stack>
    );
  }

  if (confirming) {
    return (
      <Stack spacing={2} sx={{ py: 6, alignItems: 'center' }}>
        <AnimateLogo2 />
        <Typography>Confirming your payment...</Typography>
      </Stack>
    );
  }

  if (step === 'checkout') {
    return (
      <Stack spacing={3} sx={{ py: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <AnimateLogo2 sx={{ mb: 2, mx: 'auto' }} />
          <Typography variant="h4">Checkout</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Review your signup details and complete payment.
          </Typography>
        </Box>

        {!!errorMsg && <Alert severity="warning">{errorMsg}</Alert>}

        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            bgcolor: 'background.neutral',
          }}
        >
          <Stack spacing={1.25}>
            <Typography variant="subtitle2">Account</Typography>
            <Typography variant="body2">Username: {getValues('username') || '—'}</Typography>
            <Typography variant="body2">Email: {getValues('email') || '—'}</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Pricing</Typography>
            <Typography variant="body2">
              Original price: {formatMoney(originalAmount, currency)}
            </Typography>
            {discountApplied && (
              <Typography variant="body2" color="success.main">
                Discount applied
              </Typography>
            )}
            <Typography variant="h6">
              Payable amount: {formatMoney(payableAmount, currency)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Applied code(s): {appliedCodes.length ? appliedCodes.join(', ') : 'None'}
            </Typography>
          </Stack>
        </Box>

        <LoadingButton
          fullWidth
          size="large"
          variant="contained"
          loading={submitting}
          onClick={onPay}
        >
          Pay {formatMoney(payableAmount, currency)}
        </LoadingButton>

        <Button
          fullWidth
          variant="outlined"
          onClick={() => router.push(paths.auth.affiliate.signUp)}
        >
          Back to signup form
        </Button>
      </Stack>
    );
  }

  return (
    <Form methods={methods} onSubmit={onContinueToCheckout}>
      <Stack spacing={3} sx={{ py: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <AnimateLogo2 sx={{ mb: 2, mx: 'auto' }} />
          <Typography variant="h4">Sign up</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Create your account. Affiliate and voucher codes can unlock a promotional price.
          </Typography>
        </Box>

        {!!errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <Field.Text name="username" label="Username" />
        <Field.Text name="email" label="Email address" />
        <Field.Text
          name="password"
          label="Password"
          type={password.value ? 'text' : 'password'}
          helperText={PASSWORD_COMPLEXITY_HINT}
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

        <Field.Text
          name="affiliateCode"
          label="Affiliate code"
          helperText="Auto-filled from your invite link when present (example: ?ref=SP001)."
        />
        <Field.Text name="voucherCode" label="Voucher code (optional)" />

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.neutral',
          }}
        >
          {validating ? (
            <Typography variant="body2">Validating codes...</Typography>
          ) : (
            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Price preview</Typography>
              <Typography variant="body2">
                Original: {formatMoney(originalAmount, currency)}
              </Typography>
              <Typography variant="subtitle1">
                Payable: {formatMoney(payableAmount, currency)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {discountApplied
                  ? `Promo active via ${appliedCodes.join(' / ')}`
                  : 'No valid affiliate/voucher code — original price applies.'}
              </Typography>
              {pricing?.affiliateMessage && !pricing?.affiliateValid && watchedAffiliate && (
                <Typography variant="caption" color="warning.main">
                  {pricing.affiliateMessage}
                </Typography>
              )}
              {pricing?.voucherMessage && !pricing?.voucherValid && watchedVoucher && (
                <Typography variant="caption" color="warning.main">
                  {pricing.voucherMessage}
                </Typography>
              )}
            </Stack>
          )}
        </Box>

        <LoadingButton fullWidth size="large" type="submit" variant="contained" loading={validating}>
          Continue to checkout
        </LoadingButton>

        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Link component={RouterLink} href={paths.auth.simple.signIn} variant="subtitle2">
            Sign in
          </Link>
        </Typography>
      </Stack>
    </Form>
  );
}
