import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import ListItem from '@mui/material/ListItem';
import LoadingButton from '@mui/lab/LoadingButton';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

import { fCurrency } from 'src/utils/format-number';

import { Form } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useCheckoutContext } from './context';
import { useAuthContext } from 'src/auth/hooks';
import { courseService } from 'src/services/course.service';
import { createCheckoutSession } from 'src/services/payment.service';
import { toast } from 'src/components/snackbar';
import { CheckoutSummary } from './checkout-summary';
// import { CheckoutDelivery } from './checkout-delivery';
import { CheckoutBillingInfo } from './checkout-billing-info';
// import { CheckoutPaymentMethods } from './checkout-payment-methods';

// ----------------------------------------------------------------------

// Delivery options (commented out - not needed for digital course purchase)
// const DELIVERY_OPTIONS = [
//   { value: 0, label: 'Free', description: '5-7 days delivery' },
//   { value: 10, label: 'Standard', description: '3-5 days delivery' },
//   { value: 20, label: 'Express', description: '2-3 days delivery' },
// ];

// Payment method options (commented out - payment via WooshPay redirect)
// const PAYMENT_OPTIONS = [
//   {
//     value: 'paypal',
//     label: 'Pay with Paypal',
//     description: 'You will be redirected to PayPal website to complete your purchase securely.',
//   },
//   {
//     value: 'credit',
//     label: 'Credit / Debit card',
//     description: 'We support Mastercard, Visa, Discover and Stripe.',
//   },
//   { value: 'cash', label: 'Cash', description: 'Pay with cash when your order is delivered.' },
// ];
//
// const CARDS_OPTIONS = [
//   { value: 'ViSa1', label: '**** **** **** 1212 - Jimmy Holland' },
//   { value: 'ViSa2', label: '**** **** **** 2424 - Shawn Stokes' },
//   { value: 'MasterCard', label: '**** **** **** 4545 - Cole Armstrong' },
// ];

// ----------------------------------------------------------------------

export const PaymentSchema = zod.object({
  payment: zod.string().optional(), // not required when using WooshPay redirect
  delivery: zod.number(),
});

// ----------------------------------------------------------------------

export function CheckoutPayment() {
  const checkout = useCheckoutContext();
  const { authenticated } = useAuthContext();

  const items = checkout.items || [];
  const courseItems = items;

  const defaultValues = { delivery: checkout.shipping, payment: '' };

  const methods = useForm({
    resolver: zodResolver(PaymentSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      // If user is not logged in, redirect to login and return to this page after sign-in
      if (!authenticated) {
        const returnTo = encodeURIComponent(
          typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/product/checkout'
        );
        const base = (CONFIG.site.basePath || '').replace(/\/$/, '');
        window.location.replace(`${base}${CONFIG.auth.redirectPath}?returnTo=${returnTo}`);
        return;
      }

      const totalAmount = checkout.total || 0;

      if (courseItems.length === 0) {
        toast.error('Your cart is empty');
        return;
      }

      if (totalAmount <= 0) {
        const courseIds = courseItems.map((item) => item.id).filter(Boolean);
        if (courseIds.length > 0) {
          await courseService.enrollCourses(courseIds);
        }
        checkout.onReset();
        toast.success('Enrolled successfully');
        const base = (CONFIG.site.basePath || '').replace(/\/$/, '');
        const redirectPath =
          courseIds.length === 1
            ? paths.learningCourse.details(courseIds[0])
            : paths.learning;
        window.location.replace(`${base}${redirectPath}`);
        return;
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      // Include checkout session id in redirect so success page can verify payment with backend.
      const successUrl = `${baseUrl}/product/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/product/checkout`;

      const { url, sessionId, refId } = await createCheckoutSession({
        items: courseItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        })),
        successUrl,
        cancelUrl,
        currency: 'sgd',
      });

      if (url) {
        if (typeof window !== 'undefined' && sessionId) {
          sessionStorage.setItem('pending_checkout_session_id', sessionId);
        }
        if (typeof window !== 'undefined' && refId) {
          sessionStorage.setItem('pending_checkout_ref', refId);
        }
        toast.success('Redirecting to payment page...');
        window.location.href = url;
      } else {
        toast.error('Could not start payment');
      }
    } catch (error) {
      console.error(error);
      let msg = error?.response?.data?.message ?? error?.message ?? 'Payment failed';
      if (typeof msg !== 'string' && msg?.message) msg = msg.message;
      try {
        const parsed = typeof msg === 'string' && msg.startsWith('{') ? JSON.parse(msg) : null;
        if (parsed?.message) msg = parsed.message;
      } catch {
        // keep msg as is
      }
      toast.error(typeof msg === 'string' ? msg : 'Payment failed');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          {/* Your courses – review before payment */}
          {courseItems.length > 0 && (
            <Card
              sx={{
                mb: 2,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.secondary.light}`,
                boxShadow: (theme) => theme.customShadows.z8,
              }}
            >
              <CardHeader
                title={
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Cart Items
                    <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      &nbsp;(
                      {checkout.totalItems} {checkout.totalItems === 1 ? 'course' : 'courses'})
                    </Typography>
                  </Typography>
                }
                subheader="Review your selection before payment."
                sx={{
                  mb: 0,
                  pb: { xs: 1, md: 1.5 },
                  borderBottom: (theme) => `1px solid ${theme.palette.secondary.light}`,
                }}
              />
              <List disablePadding sx={{ p: 1 }}>
                {courseItems.map((item) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderRadius: 1.25,
                      mx: 0.5,
                      my: 0.4,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        alt={item.name}
                        src={item.coverUrl}
                        sx={{
                          width: 50,
                          height: 50,
                          borderRadius: 1.25,
                          border: (theme) => `1px solid ${theme.palette.divider}`,
                          boxShadow: (theme) => theme.shadows[2],
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.name}
                      primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 700 }}
                      secondary="Digital course access"
                      secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    />
                    <Stack alignItems="flex-end" spacing={0.6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                        {fCurrency(Number(item.price) || 0)}
                      </Typography>
                    </Stack>
                  </ListItem>
                ))}
              </List>
            </Card>
          )}

        </Grid>

        <Grid xs={12} md={4}>
          {checkout.billing && (
            <CheckoutBillingInfo billing={checkout.billing} onBackStep={checkout.onBackStep} />
          )}

          <CheckoutSummary
            total={checkout.total}
            subtotal={checkout.subtotal}
            discount={checkout.discount}
            shipping={checkout.shipping}
            discountDisabled
          />

          <Card
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.secondary.light}`,
              boxShadow: (theme) => theme.customShadows.z12,
              background: (theme) =>
                `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.lighter} 150%)`,
            }}
          >
            <Stack spacing={1.5}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {(checkout.total || 0) <= 0
                  ? 'Free courses - you will be enrolled and redirected to My Learning.'
                  : 'Click "Complete order" to continue to secure payment.'}
                {(checkout.total || 0) > 0 && CONFIG.payment.publicKey && (
                  <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                    Secure payment powered by WooshPay.
                  </Box>
                )}
              </Typography>

              <LoadingButton
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                loading={isSubmitting}
                startIcon={<Iconify icon="solar:card-bold" />}
                sx={{
                  py: { xs: 1.1, md: 1.3 },
                  fontWeight: 800,
                  borderRadius: 1.25,
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                }}
              >
                Complete order
              </LoadingButton>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                By continuing, you agree to our terms. Course access is activated immediately
                after successful payment.
              </Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
