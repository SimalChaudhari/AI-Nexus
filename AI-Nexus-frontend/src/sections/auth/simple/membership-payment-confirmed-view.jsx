import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

const STEPS = ['Cart', 'Details', 'Payment', 'Receipt'];

function formatMoney(amount, currency = 'SGD') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${currency} —`;
  return `${currency} ${value.toFixed(2)}`;
}

/**
 * Centered card-style membership payment success screen.
 * Shown after successful WooshPay membership checkout.
 */
export function MembershipPaymentConfirmedView({
  email = '',
  memberName = '',
  paidAmount = 0,
  currency = 'SGD',
  itemName = 'ISCA membership',
  paymentRef = '',
  paymentMethodLabel = 'Card payment',
  redirectCountdown = 15,
  onSignIn,
}) {
  const displayName = String(memberName || '').trim() || 'Member';
  const totalLabel = formatMoney(paidAmount, currency);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        overflow: 'auto',
        bgcolor: '#f5f6f8',
        py: { xs: 3, md: 5 },
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 880, mx: 'auto' }}>
        <Stack spacing={3} alignItems="center">
          <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ width: 1 }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                bgcolor: '#22c55e',
                color: 'common.white',
                boxShadow: `0 10px 28px ${alpha('#22c55e', 0.35)}`,
              }}
            >
              <Iconify icon="eva:checkmark-fill" width={36} />
            </Box>

            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}
            >
              Payment Successful!
            </Typography>
            <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: 420 }}>
              Your transaction has been processed successfully.
            </Typography>

            <Box sx={{ width: 1, maxWidth: 520, pt: 1.5, px: { xs: 1, sm: 2 } }}>
              <Box sx={{ position: 'relative', px: 1 }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: '12.5%',
                    right: '12.5%',
                    top: 11,
                    height: 3,
                    bgcolor: '#22c55e',
                    borderRadius: 99,
                  }}
                />
                <Stack direction="row" justifyContent="space-between" sx={{ position: 'relative' }}>
                  {STEPS.map((label) => (
                    <Stack key={label} spacing={0.75} alignItems="center" sx={{ width: 64 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: '#22c55e',
                          border: '3px solid #fff',
                          boxShadow: `0 0 0 1px ${alpha('#22c55e', 0.35)}`,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: '#374151', fontSize: 11 }}
                      >
                        {label}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Stack>

          <Box
            sx={{
              width: 1,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2.5,
            }}
          >
            <Box
              sx={{
                bgcolor: 'common.white',
                borderRadius: 2.5,
                p: { xs: 2.5, md: 3 },
                boxShadow: `0 8px 24px ${alpha('#111827', 0.06)}`,
                border: `1px solid ${alpha('#111827', 0.06)}`,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5, color: '#111827' }}>
                Order Summary
              </Typography>

              <Stack spacing={1.75}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Typography variant="body2" sx={{ color: '#4b5563' }}>
                    {itemName}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                    {totalLabel}
                  </Typography>
                </Stack>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                    Total Paid
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#2563eb' }}>
                    {totalLabel}
                  </Typography>
                </Stack>

                <Chip
                  label="COMPLETED"
                  size="small"
                  sx={{
                    alignSelf: 'flex-start',
                    mt: 0.5,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    bgcolor: alpha('#22c55e', 0.12),
                    color: '#15803d',
                    borderRadius: 1,
                  }}
                />
              </Stack>
            </Box>

            <Box
              sx={{
                bgcolor: 'common.white',
                borderRadius: 2.5,
                p: { xs: 2.5, md: 3 },
                boxShadow: `0 8px 24px ${alpha('#111827', 0.06)}`,
                border: `1px solid ${alpha('#111827', 0.06)}`,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5, color: '#111827' }}>
                Billing Details
              </Typography>

              <Stack spacing={2.25}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      color: '#9ca3af',
                      mb: 0.75,
                    }}
                  >
                    BILL TO
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#111827' }}>
                    {displayName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.25 }}>
                    {email || '—'}
                  </Typography>
                  {paymentRef ? (
                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.75 }}>
                      Ref: {paymentRef}
                    </Typography>
                  ) : null}
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      color: '#9ca3af',
                      mb: 0.75,
                    }}
                  >
                    PAYMENT METHOD
                  </Typography>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                      sx={{
                        width: 36,
                        height: 24,
                        borderRadius: 0.75,
                        bgcolor: alpha('#2563eb', 0.1),
                        display: 'grid',
                        placeItems: 'center',
                        color: '#2563eb',
                      }}
                    >
                      <Iconify icon="solar:card-bold" width={18} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                        {paymentMethodLabel}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        Processed securely via WooshPay
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Box>

          <Stack spacing={1.25} alignItems="center" sx={{ width: 1, pt: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center' }}>
              Redirecting to sign in in {redirectCountdown} second
              {redirectCountdown === 1 ? '' : 's'}. Please verify your email before signing in.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={onSignIn}
              sx={{
                px: 4,
                minWidth: 220,
                bgcolor: '#111827',
                fontWeight: 700,
                '&:hover': { bgcolor: '#1f2937' },
              }}
            >
              Go to sign in now
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
