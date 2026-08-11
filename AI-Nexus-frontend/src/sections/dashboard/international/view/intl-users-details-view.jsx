'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';
import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatMoney(amount, currency) {
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) return '—';
  const n = Number(amount);
  const code = String(currency || '').trim().toUpperCase();
  try {
    if (code) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 2,
      }).format(n);
    }
  } catch {
    // fall through
  }
  return code ? `${code} ${n.toFixed(2)}` : n.toFixed(2);
}

function paymentColor(status) {
  if (status === 'paid') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed' || status === 'canceled') return 'error';
  return 'default';
}

function statusColor(status) {
  if (status === 'active') return 'success';
  if (status === 'pending_payment') return 'warning';
  if (status === 'banned') return 'error';
  return 'default';
}

// ----------------------------------------------------------------------

export function IntlUsersDetailsView({ user, loading, error, paymentLatest = null, payments = [] }) {
  const fullName = useMemo(() => {
    if (!user) return '-';
    const withSalutation = [user.salutation, user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (withSalutation) return withSalutation;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || user.username || user.email || '-';
  }, [user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !user) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="User not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.international.users.list}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const jobFunction =
    user.jobFunction === 'Other' && user.jobFunctionOther
      ? user.jobFunctionOther
      : user.jobFunction;

  const payment = paymentLatest;
  const history = Array.isArray(payments) && payments.length ? payments : payment ? [payment] : [];

  const headerChips = [
    { label: user.status || '-', color: statusColor(user.status) },
    { label: `Payment: ${user.paymentStatus || '-'}`, color: paymentColor(user.paymentStatus) },
  ];

  const sections = [
    {
      title: 'Personal information',
      icon: 'solar:user-id-bold',
      fullWidth: true,
      layout: 'grid',
      rows: [
        { label: 'Salutation', value: user.salutation || '—' },
        { label: 'First name', value: user.firstName || '—' },
        { label: 'Last name', value: user.lastName || '—' },
        { label: 'Username', value: user.username || '—' },
        { label: 'Email', value: user.email || '—' },
        { label: 'Contact number', value: user.contactNumber || '—' },
        { label: 'Company', value: user.company || '—' },
        { label: 'Company code', value: user.companyCode || '—' },
        { label: 'Job function', value: jobFunction || '—' },
        {
          label: 'Years of experience',
          value:
            user.yearsOfExperience != null && user.yearsOfExperience !== ''
              ? String(user.yearsOfExperience)
              : '—',
        },
        { label: 'Country of residence', value: user.countryOfResidence || '—' },
        { label: 'Country code', value: user.countryCode || '—' },
      ],
    },
    {
      title: 'Account details',
      icon: 'solar:shield-check-bold',
      fullWidth: true,
      layout: 'grid',
      rows: [
        {
          label: 'Account status',
          value: (
            <Chip
              label={user.status || '-'}
              color={statusColor(user.status)}
              size="small"
              sx={{ mt: 0.5, fontWeight: 600, textTransform: 'capitalize' }}
            />
          ),
        },
        {
          label: 'Payment status',
          value: (
            <Chip
              label={user.paymentStatus || '-'}
              color={paymentColor(user.paymentStatus)}
              size="small"
              sx={{ mt: 0.5, fontWeight: 600, textTransform: 'capitalize' }}
            />
          ),
        },
        {
          label: 'Email verified',
          value: (
            <Chip
              label={user.isVerified ? 'Yes' : 'No'}
              color={user.isVerified ? 'success' : 'warning'}
              size="small"
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
          ),
        },
        { label: 'Currency', value: user.currency || '—' },
        {
          label: 'Membership plan',
          value:
            String(user.membershipType || '').toLowerCase() === 'student'
              ? 'Student'
              : 'Full / Role',
        },
        { label: 'Promo code', value: user.promoCode || '—' },
        { label: 'Auth provider', value: user.authProvider || '—' },
        { label: 'Joined', value: formatDateTime(user.createdAt) },
      ],
    },
    {
      title: 'Payment details',
      icon: 'solar:card-bold',
      fullWidth: true,
      layout: 'grid',
      rows: payment
        ? [
            {
              label: 'Status',
              value: (
                <Chip
                  label={payment.status || '-'}
                  color={paymentColor(payment.status)}
                  size="small"
                  sx={{ mt: 0.5, fontWeight: 600, textTransform: 'capitalize' }}
                />
              ),
            },
            { label: 'Amount', value: formatMoney(payment.amount, payment.currency) },
            { label: 'Currency', value: payment.currency || '—' },
            {
              label: 'GST',
              value: payment.applyGst
                ? formatMoney(payment.gstAmount, payment.currency)
                : 'Not applied',
            },
            {
              label: 'Promo applied',
              value: payment.promoApplied ? 'Yes' : 'No',
            },
            { label: 'Promo code', value: payment.promoCode || '—' },
            { label: 'Billing country', value: payment.countryOfResidence || '—' },
            { label: 'Country code', value: payment.countryCode || '—' },
            { label: 'Reference ID', value: payment.refId || '—' },
            {
              label: 'WooshPay session ID',
              value: payment.wooshpaySessionId || '—',
            },
            {
              label: 'WooshPay payment intent',
              value: payment.wooshpayPaymentIntentId || '—',
            },
            {
              label: 'Item',
              value:
                Array.isArray(payment.items) && payment.items[0]?.name
                  ? payment.items[0].name
                  : 'AI Nexus International membership',
            },
            { label: 'Paid at', value: formatDateTime(payment.paidAt) },
            { label: 'Created at', value: formatDateTime(payment.createdAt) },
          ]
        : [
            {
              label: 'Record',
              value: 'No payment record found for this user yet.',
            },
            {
              label: 'Account payment status',
              value: user.paymentStatus || '—',
            },
          ],
    },
  ];

  return (
    <EntityDetailsLayout
      heading="User details"
      links={[
        { name: 'Dashboard', href: paths.admin.root },
        { name: 'International', href: paths.admin.international.root },
        { name: 'Users', href: paths.admin.international.users.list },
        { name: fullName },
      ]}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        avatarSrc: user.avatarUrl || undefined,
        title: fullName,
        subtitle: user.email || '-',
        chips: headerChips,
      }}
      sections={sections}
      footer={
        <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Iconify icon="solar:history-bold-duotone" width={20} sx={{ mr: 1 }} />
            Payment history
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {history.length ? (
            <Stack spacing={1.5}>
              {history.map((item, index) => (
                <Box
                  key={item.id || item.refId || index}
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.25,
                    p: 1.75,
                    borderRadius: 1.5,
                    bgcolor: 'background.neutral',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Iconify icon="solar:bill-list-bold-duotone" width={20} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2">
                        {formatMoney(item.amount, item.currency)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {item.refId || 'Membership'} · {formatDateTime(item.paidAt || item.createdAt)}
                      </Typography>
                      {item.wooshpaySessionId ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.disabled',
                            display: 'block',
                            wordBreak: 'break-all',
                            mt: 0.25,
                          }}
                        >
                          Session: {item.wooshpaySessionId}
                        </Typography>
                      ) : null}
                      {item.wooshpayPaymentIntentId ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.disabled',
                            display: 'block',
                            wordBreak: 'break-all',
                          }}
                        >
                          Intent: {item.wooshpayPaymentIntentId}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                  <Label variant="soft" color={paymentColor(item.status)}>
                    {item.status || '—'}
                  </Label>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No payment history yet.
            </Typography>
          )}
        </Card>
      }
    />
  );
}
