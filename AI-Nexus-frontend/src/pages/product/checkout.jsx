import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'src/routes/hooks';
import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { CheckoutView } from 'src/sections/checkout/view';
import { getPaymentStatus } from 'src/services/payment.service';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const metadata = { title: `Checkout - ${CONFIG.site.name}` };

const REDIRECT_HOME_DELAY_MS = 3000;

export default function Page() {
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const paymentCanceled = searchParams.get('payment') === 'canceled';
  const ref = searchParams.get('ref') || '';
  const [cancelState, setCancelState] = useState('loading'); // loading | failed | success | processing | error
  const [redirectCountdown, setRedirectCountdown] = useState(REDIRECT_HOME_DELAY_MS / 1000);

  useEffect(() => {
    if (!paymentCanceled || !ref) return () => {};
    let cancelled = false;
    getPaymentStatus(ref)
      .then((data) => {
        if (cancelled) return;
        const state = data?.state || 'processing';
        setCancelState(state);
      })
      .catch(() => {
        if (!cancelled) setCancelState('error');
      });
    return () => { cancelled = true; };
  }, [paymentCanceled, ref]);

  useEffect(() => {
    if (!paymentCanceled || !ref || cancelState !== 'failed') return () => {};
    const t = setTimeout(() => navigate(paths.home), REDIRECT_HOME_DELAY_MS);
    return () => clearTimeout(t);
  }, [paymentCanceled, ref, navigate, cancelState]);

  // Countdown for "Redirecting in X seconds..."
  useEffect(() => {
    if (!paymentCanceled || !ref || cancelState !== 'failed') return () => {};
    setRedirectCountdown(REDIRECT_HOME_DELAY_MS / 1000);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentCanceled, ref, cancelState]);

  if (paymentCanceled && ref) {
    if (cancelState === 'success') {
      return (
        <>
          <Helmet>
            <title>{metadata.title} - Payment confirmed</title>
          </Helmet>
          <DashboardContent>
            <Box sx={{ py: 8, maxWidth: 480, mx: 'auto', textAlign: 'center', px: 2 }}>
              <Iconify icon="solar:check-circle-bold" width={80} sx={{ color: 'success.main', mb: 2 }} />
              <Typography variant="h4" sx={{ mb: 2 }}>
                Payment confirmed
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your payment is already completed. Continue to the success page.
              </Typography>
              <Button
                component={RouterLink}
                to={`/product/checkout/success?ref=${encodeURIComponent(ref)}`}
                variant="contained"
                size="large"
                startIcon={<Iconify icon="solar:check-read-bold" width={24} />}
              >
                View success page
              </Button>
            </Box>
          </DashboardContent>
        </>
      );
    }

    return (
      <>
        <Helmet>
          <title>{metadata.title} - Order failed</title>
        </Helmet>
        <DashboardContent>
          <Box sx={{ py: 8, maxWidth: 480, mx: 'auto', textAlign: 'center', px: 2 }}>
            <Iconify icon="solar:close-circle-bold" width={80} sx={{ color: 'error.main', mb: 2 }} />
            <Typography variant="h4" sx={{ mb: 2 }}>
              {cancelState === 'loading' || cancelState === 'processing' ? 'Checking payment status' : 'Order failed'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {cancelState === 'loading' || cancelState === 'processing'
                ? 'Please wait while we securely verify your payment status.'
                : 'You returned without completing the payment (or the link expired). Your order has been recorded as failed.'}
            </Typography>
            {cancelState === 'failed' && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Redirecting to home in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}…
              </Typography>
            )}
            {cancelState === 'error' && (
              <Typography variant="body2" color="error.main" sx={{ mb: 3 }}>
                Could not verify current payment status. Please check again from checkout.
              </Typography>
            )}
            <Button
              component={RouterLink}
              to={paths.home}
              variant="contained"
              size="large"
              startIcon={<Iconify icon="solar:home-2-bold" width={24} />}
              sx={{ mr: 1 }}
            >
              Go to Home
            </Button>
            <Button
              component={RouterLink}
              to={paths.product.checkout}
              variant="outlined"
              size="large"
              startIcon={<Iconify icon="solar:cart-large-2-bold" width={24} />}
            >
              Back to checkout
            </Button>
          </Box>
        </DashboardContent>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CheckoutView />
    </>
  );
}
