import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from 'src/components/loading/circular-progress';
import { useSearchParams } from 'src/routes/hooks';
import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { OrderCompleteIllustration } from 'src/assets/illustrations';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { getPaymentStatus } from 'src/services/payment.service';

const metadata = { title: `Payment successful | ${CONFIG.site.name}` };

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    const refFromStorage =
      typeof window !== 'undefined' ? sessionStorage.getItem('pending_checkout_ref') : '';
    const ref = refFromUrl || refFromStorage;
    if (!ref) {
      setStatus('error');
      setErrorMessage('Missing payment reference. Payment could not be verified.');
      return () => {};
    }

    let timerId;
    let cancelled = false;

    const poll = async (attempt = 0) => {
      try {
        const data = await getPaymentStatus(ref);
        if (cancelled) return;
        if (data?.state === 'success') {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('pending_checkout_ref');
            sessionStorage.removeItem('pending_checkout_session_id');
          }
          setStatus('success');
          return;
        }
        if (data?.state === 'failed') {
          setStatus('error');
          setErrorMessage('Payment was not completed. Please try again.');
          return;
        }
        if (attempt >= 11) {
          setStatus('error');
          setErrorMessage('Payment is still processing. Please refresh in a moment.');
          return;
        }
        timerId = window.setTimeout(() => poll(attempt + 1), 2500);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(err?.response?.data?.message || err?.message || 'Could not verify payment status');
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [searchParams]);

  const isConfirming = status === 'loading';

  const isError = status === 'error';
  const isSuccess = status === 'success';

  return (
    <>
      <Helmet>
        <title>{isError ? `Order failed | ${CONFIG.site.name}` : metadata.title}</title>
      </Helmet>
      <DashboardContent>
        <Box
          sx={{
            py: 8,
            maxWidth: 480,
            mx: 'auto',
            textAlign: 'center',
            px: 2,
          }}
        >
          {isError ? (
            <>
              <Iconify icon="solar:close-circle-bold" width={80} sx={{ color: 'error.main', mb: 2 }} />
              <Typography variant="h4" sx={{ mb: 2 }} color="error.main">
                Order failed
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                We could not confirm your order. Your payment may have gone through – please contact support with the details below.
              </Typography>
              <Typography variant="body2" sx={{ color: 'error.main', mb: 3, fontFamily: 'monospace' }}>
                {errorMessage}
              </Typography>
              <Button
                component={RouterLink}
                to={paths.home}
                variant="contained"
                size="large"
                sx={{ mr: 1 }}
                startIcon={<Iconify icon="solar:home-2-bold" width={20} />}
              >
                Go to Home
              </Button>
              <Button
                component={RouterLink}
                to={paths.product.checkout}
                variant="outlined"
                size="large"
                startIcon={<Iconify icon="solar:cart-large-2-bold" width={20} />}
              >
                Back to checkout
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h4" sx={{ mb: 2 }}>
                Thank you for your purchase!
              </Typography>
              <OrderCompleteIllustration />
              {isConfirming && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Confirming your order…
                  </Typography>
                </Box>
              )}
              {status === 'success' && (
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                  Your payment was successful. Your order has been recorded and you now have access to the course(s).
                </Typography>
              )}
              {!isConfirming && (
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, display: isSuccess ? 'block' : 'none' }}>
                  Enrollment is complete. Go to My Learning to start.
                </Typography>
              )}
              <Button
                component={RouterLink}
                to={paths.learning}
                variant="contained"
                size="large"
                startIcon={<Iconify icon="solar:book-bold" width={24} />}
              >
                Go to My Learning
              </Button>
            </>
          )}
        </Box>
      </DashboardContent>
    </>
  );
}
