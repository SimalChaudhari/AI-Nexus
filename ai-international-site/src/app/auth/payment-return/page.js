'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useIntlAuth } from 'src/auth/intl-auth-context';
import { setIntlFlashToast } from 'src/auth/intl-session';
import { paths } from 'src/routes/paths';
import { confirmIntlPayment } from 'src/services/intl-payment.service';
import { AuthCenteredLayout } from 'src/layouts/auth-centered';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessingError(error) {
  const message =
    error?.response?.data?.message || error?.message || '';
  const text = Array.isArray(message) ? message.join(' ') : String(message);
  return /still being processed|try again/i.test(text);
}

function PaymentReturnInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applySession, refresh } = useIntlAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [statusText, setStatusText] = useState('Confirming your payment…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const canceled = searchParams.get('payment') === 'canceled';
      const ref = searchParams.get('ref') || '';
      const sessionIdRaw =
        searchParams.get('session_id') || searchParams.get('sessionId') || '';
      const sessionId =
        sessionIdRaw && !sessionIdRaw.includes('{CHECKOUT_SESSION_ID}')
          ? sessionIdRaw
          : '';

      if (canceled) {
        router.replace(`${paths.auth.signUp}?payment=canceled`);
        return;
      }

      if (!ref) {
        setErrorMsg('Missing payment reference. Please try signing up again.');
        return;
      }

      const maxAttempts = 6;
      let lastError = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (cancelled) return;
        try {
          if (attempt > 1) {
            setStatusText(`Confirming your payment… (attempt ${attempt}/${maxAttempts})`);
          }
          const result = await confirmIntlPayment({ ref, sessionId: sessionId || undefined });
          if (cancelled) return;

          if (result?.accessToken && result?.user) {
            applySession({ accessToken: result.accessToken, user: result.user });
            await refresh().catch(() => null);
          }

          setIntlFlashToast({
            message: 'Payment successful — you are signed in.',
            severity: 'success',
          });
          setStatusText('Payment confirmed. Signing you in…');
          router.replace(paths.dashboard);
          return;
        } catch (error) {
          lastError = error;
          if (attempt < maxAttempts && isProcessingError(error)) {
            await sleep(1500 * attempt);
            continue;
          }
          break;
        }
      }

      const message =
        lastError?.response?.data?.message ||
        lastError?.message ||
        'Could not confirm payment. Please contact support if you were charged.';
      if (!cancelled) {
        setErrorMsg(Array.isArray(message) ? message.join(', ') : String(message));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [applySession, refresh, router, searchParams]);

  return (
    <AuthCenteredLayout>
      <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
        {errorMsg ? (
          <Alert severity="error" sx={{ width: 1 }}>
            {errorMsg}
          </Alert>
        ) : (
          <>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              {statusText}
            </Typography>
          </>
        )}
      </Stack>
    </AuthCenteredLayout>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      }
    >
      <PaymentReturnInner />
    </Suspense>
  );
}
