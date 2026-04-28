import { useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { PRODUCT_CHECKOUT_STEPS } from 'src/_mock/_product';

import { Iconify } from 'src/components/iconify';

import { CheckoutCart } from '../checkout-cart';
import { useCheckoutContext } from '../context';
import { CheckoutSteps } from '../checkout-steps';
import { CheckoutPayment } from '../checkout-payment';
import { CheckoutOrderComplete } from '../checkout-order-complete';
// import { CheckoutBillingAddress } from '../checkout-billing-address';

// ----------------------------------------------------------------------

export function CheckoutView() {
  const checkout = useCheckoutContext();

  useEffect(() => {
    checkout.initialStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{ px: { xs: 1.5, sm: 2, md: 4, lg: 6 }, mb: { xs: 3, md: 5 } }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.25, sm: 1.5 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ my: { xs: 2, md: 3 } }}
      >
        <Stack spacing={0.25}>
          <Typography variant="h4" sx={{ fontSize: { xs: '1.45rem', md: '2.125rem' }, fontWeight: 800 }}>
            Checkout
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Secure payment in just one final step.
          </Typography>
        </Stack>

        {checkout.activeStep === 0 && (
          <Button
            component={RouterLink}
            href={paths.learning}
            color="primary"
            variant="contained"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            sx={{
              fontWeight: 700,
              borderRadius: 1.5,
              width: { xs: '100%', sm: 'auto' },
              px: 2,
              boxShadow: 'none',
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            }}
          >
            Continue Shopping
          </Button>
        )}

        {checkout.activeStep === 1 && (
          <Button
            onClick={checkout.onBackStep}
            color="primary"
            variant="outlined"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            sx={{
              fontWeight: 700,
              borderRadius: 1.5,
              width: { xs: '100%', sm: 'auto' },
              px: 2,
            }}
          >
            Back
          </Button>
        )}
      </Stack>

      <Grid container justifyContent="center" sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid xs={12} md={10} lg={9}>
          <CheckoutSteps
            activeStep={checkout.activeStep}
            steps={PRODUCT_CHECKOUT_STEPS}
            sx={{ mx: 'auto' }}
          />
        </Grid>
      </Grid>

      <>
        {checkout.activeStep === 0 && <CheckoutCart />}

        {/* {checkout.activeStep === 1 && <CheckoutBillingAddress />} */}

        {checkout.activeStep === 1 && <CheckoutPayment />}

        {checkout.completed && (
          <CheckoutOrderComplete
            open
            onReset={() => checkout.onReset(paths.learning)}
            onDownloadPDF={() => {}}
          />
        )}
      </>
    </Container>
  );
}
