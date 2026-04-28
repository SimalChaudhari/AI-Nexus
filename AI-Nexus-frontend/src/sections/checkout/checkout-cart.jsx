import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { CONFIG } from 'src/config-global';

import { EmptyContent } from 'src/components/empty-content';

import { useCheckoutContext } from './context';
import { CheckoutSummary } from './checkout-summary';
import { CheckoutCartProductList } from './checkout-cart-product-list';

// ----------------------------------------------------------------------

export function CheckoutCart() {
  const checkout = useCheckoutContext();

  const empty = !checkout.items.length;
  const totalLabel = `${checkout.totalItems} ${checkout.totalItems === 1 ? 'course' : 'courses'}`;

  return (
    <Grid container spacing={{ xs: 2.5, md: 3 }}>
      <Grid xs={12} md={8}>
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
                  &nbsp;({totalLabel})
                </Typography>
              </Typography>
            }
            subheader={
              !empty
                ? 'Verify course names and totals before payment.'
                : 'Your cart has no courses yet. Add courses to continue.'
            }
            sx={{ mb: 0, pb: { xs: 1, md: 1.5 }, borderBottom: (theme) => `1px solid ${theme.palette.secondary.light}` }}
          />

          {empty ? (
            <EmptyContent
              title="Your cart is currently empty"
              description="Browse the course catalog and add at least one course to continue checkout."
              imgUrl={`${CONFIG.site.basePath}/assets/icons/empty/ic-cart.svg`}
              sx={{ pt: 7, pb: 9 }}
            />
          ) : (
            <CheckoutCartProductList products={checkout.items} onDelete={checkout.onDeleteCart} />
          )}
        </Card>

      </Grid>

      <Grid xs={12} md={4} sx={{ position: 'relative', mt: { xs: 0.5, md: 0 } }}>
        <Box sx={{ position: { md: 'sticky' }, top: { md: 112 } }}>
          <CheckoutSummary
            total={checkout.total}
            discount={checkout.discount}
            subtotal={checkout.subtotal}
            onApplyDiscount={checkout.onApplyDiscount}
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
              <Button
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                disabled={empty}
                onClick={checkout.onNextStep}
                sx={{
                  py: { xs: 1.1, md: 1.3 },
                  fontWeight: 800,
                  borderRadius: 1.25,
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                }}
              >
                Proceed to Payment
              </Button>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box sx={{ px: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  By continuing, you agree to our terms. Course access is activated immediately
                  after successful payment.
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Box>
      </Grid>
    </Grid>
  );
}
