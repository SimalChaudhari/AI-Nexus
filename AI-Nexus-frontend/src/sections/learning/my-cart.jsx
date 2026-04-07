import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { DashboardContent } from 'src/layouts/dashboard';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useCheckoutContext } from 'src/sections/checkout/context';

// ----------------------------------------------------------------------

function formatPrice(freeOrPaid, amount) {
  if (!freeOrPaid) return 'Free';
  return `$${Number(amount || 0).toFixed(2)}`;
}

export function MyCart() {
  const theme = useTheme();
  const checkout = useCheckoutContext();
  const cartItems = checkout.items || [];

  const removeFromCart = (courseId) => {
    checkout.onDeleteCart(courseId);
  };

  const clearCart = () => {
    checkout.onUpdate((prev) => ({ ...prev, items: [] }));
  };

  if (cartItems.length === 0) {
    return (
      <DashboardContent>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 2,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.grey[500], 0.12),
            }}
          >
            <Iconify icon="solar:cart-3-bold" width={40} sx={{ color: 'text.disabled' }} />
          </Box>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            Your cart is empty
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Add courses from All Courses to get started.
          </Typography>
          <Button
            component={RouterLink}
            to={paths.learning}
            variant="contained"
            startIcon={<Iconify icon="solar:book-bold" width={18} />}
          >
            Browse courses
          </Button>
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
          My Cart ({cartItems.length})
        </Typography>
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={18} />}
          onClick={clearCart}
        >
          Clear cart
        </Button>
      </Stack>

      <Stack spacing={2}>
        {cartItems.map((item) => (
          <Card key={item.id} sx={{ p: 2, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 100,
                height: 64,
                flexShrink: 0,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Image
                alt={item.name}
                src={item.coverUrl}
                visibleByDefault
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                {item.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatPrice(true, item.price)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                component={RouterLink}
                to={paths.learningCourse.details(item.id)}
                variant="soft"
                size="small"
              >
                View
              </Button>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeFromCart(item.id)}
                aria-label="Remove from cart"
              >
                <Iconify icon="solar:trash-bin-trash-bold" width={20} />
              </IconButton>
            </Stack>
          </Card>
        ))}
      </Stack>

      <Box sx={{ mt: 4, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Cart is synced with checkout, so changes update cart count immediately.
        </Typography>
      </Box>
    </DashboardContent>
  );
}
