import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { Iconify } from 'src/components/iconify';
import { fServerDateTime, fLocalTimeZoneShort } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export function OrderDetailsInfo({ customer, delivery, payment, shippingAddress }) {
  const tz = fLocalTimeZoneShort();
  const renderCustomer = (
    <>
      <CardHeader title="Customer info" />
      <Stack direction="row" sx={{ p: 3 }}>
        <Avatar
          alt={customer?.name}
          src={customer?.avatarUrl}
          sx={{ width: 48, height: 48, mr: 2 }}
        />

        <Stack spacing={0.5} alignItems="flex-start" sx={{ typography: 'body2' }}>
          <Typography variant="subtitle2">{customer?.name}</Typography>

          <Box sx={{ color: 'text.secondary' }}>{customer?.email}</Box>



        </Stack>
      </Stack>
    </>
  );

  const renderDelivery = (
    <>
      <CardHeader title="Payment" />
      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 120, flexShrink: 0 }}>
            Processor
          </Box>
          {delivery?.shipBy || 'WooshPay'}
        </Stack>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 120, flexShrink: 0 }}>
            Method
          </Box>
          {payment?.methodLabel || delivery?.speedy || 'Online payment'}
        </Stack>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 120, flexShrink: 0 }}>
            Session ID
          </Box>
          <Link underline="always" color="inherit">
            {delivery?.trackingNumber}
          </Link>
        </Stack>
      </Stack>
    </>
  );

  const renderShipping = (
    <>
      <CardHeader title="Shipping" />
      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Stack direction="row">
          <Box component="span" sx={{ color: 'text.secondary', width: 120, flexShrink: 0 }}>
            Address
          </Box>
          {shippingAddress?.fullAddress}
        </Stack>

        <Stack direction="row">
          <Box component="span" sx={{ color: 'text.secondary', width: 120, flexShrink: 0 }}>
            Phone number
          </Box>
          {shippingAddress?.phoneNumber}
        </Stack>
      </Stack>
    </>
  );


  const renderAudit = (
    <>
      <CardHeader title="Payment audit" />
      <Stack spacing={1.25} sx={{ p: 3, pt: 1.5, typography: 'body2' }}>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Order ID
          </Box>
          {payment?.audit?.orderId || '—'}
        </Stack>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Client Reference ID
          </Box>
          {payment?.audit?.clientReferenceId || '—'}
        </Stack>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            WooshPay Session ID
          </Box>
          {payment?.audit?.wooshpaySessionId || '—'}
        </Stack>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Payment Intent ID
          </Box>
          {payment?.audit?.wooshpayPaymentIntentId || '—'}
        </Stack>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Order Status
          </Box>
          {payment?.audit?.orderStatus || '—'}
        </Stack>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Payment Status
          </Box>
          {payment?.audit?.paymentStatus || '—'}
        </Stack>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Source
          </Box>
          {payment?.audit?.source || '—'}
        </Stack>
        <Stack direction="row" alignItems="center">
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Created At
          </Box>
          {payment?.audit?.createdAt ? `${fServerDateTime(payment?.audit?.createdAt)} (${tz})` : '—'}
        </Stack>
      </Stack>
    </>
  );

  return (
    <Card>
      {renderCustomer}

      <Divider sx={{ borderStyle: 'dashed' }} />

      {renderDelivery}

      <Divider sx={{ borderStyle: 'dashed' }} />

      {renderShipping}

      <Divider sx={{ borderStyle: 'dashed' }} />

    
      <Divider sx={{ borderStyle: 'dashed' }} />

      {renderAudit}
    </Card>
  );
}
