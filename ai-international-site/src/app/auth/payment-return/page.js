'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { confirmIntlPayment } from 'src/services/intl-payment.service';
import { AuthCenteredLayout } from 'src/layouts/auth-centered';

function PaymentReturnInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const canceled = searchParams.get('payment') === 'canceled';
      const ref = searchParams.get('ref') || '';
      const sessionId =
        searchParams.get('session_id') || searchParams.get('sessionId') || '';

      if (canceled) {
        router.replace(`${paths.auth.signUp}?payment=canceled`);
        return;
      }

      if (!ref) {
        setErrorMsg('Missing payment reference. Please try signing up again.');
        return;
      }

      try {
        await confirmIntlPayment({ ref, sessionId: sessionId || undefined });
        if (!cancelled) {
          router.replace(paths.dashboard);
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Could not confirm payment. Please contact support if you were charged.';
        if (!cancelled) {
          setErrorMsg(Array.isArray(message) ? message.join(', ') : String(message));
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

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
              Confirming your payment…
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
