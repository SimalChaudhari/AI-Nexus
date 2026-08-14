import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { fDateTime } from 'src/utils/format-time';
import { getMembershipPaymentHistoryById } from 'src/services/payment.service';

function money(currency, amount) {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value.toFixed(2) : '0.00';
  return `${String(currency || 'SGD').toUpperCase()} ${safe}`;
}

function statusColor(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 'success';
  if (normalized === 'pending') return 'warning';
  if (normalized === 'canceled' || normalized === 'cancelled') return 'default';
  if (normalized === 'failed' || normalized === 'refunded') return 'error';
  return 'default';
}

function pricingLabel(row) {
  if (row?.discountApplied) return 'Promo';
  if (row?.pricingType === 'verified') return 'Verified';
  return 'Standard';
}

function SectionCard({ title, icon, children, action = null }) {
  return (
    <Card
      sx={(theme) => ({
        p: 3,
        width: 1,
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
      })}
    >
      <Stack spacing={2.5} sx={{ flexGrow: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={(theme) => ({
                width: 36,
                height: 36,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
              })}
            >
              <Iconify icon={icon} width={20} />
            </Box>
            <Typography variant="h6">{title}</Typography>
          </Stack>
          {action}
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.35, sm: 2 }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
      sx={{ py: 1.1 }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          textAlign: { xs: 'left', sm: 'right' },
          wordBreak: 'break-word',
          ...(mono
            ? {
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 12.5,
                letterSpacing: '0.02em',
              }
            : null),
        }}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}

function AmountStat({ label, value, emphasis = false, muted = false }) {
  return (
    <Box
      sx={(theme) => ({
        p: 2.25,
        height: 1,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: emphasis
          ? alpha(theme.palette.primary.main, 0.06)
          : alpha(theme.palette.grey[500], 0.04),
      })}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography
        variant={emphasis ? 'h5' : 'subtitle1'}
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: muted ? 'text.secondary' : emphasis ? 'primary.main' : 'text.primary',
          textDecoration: muted ? 'line-through' : 'none',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function AdminPaymentHistoryDetailsView({ id }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getMembershipPaymentHistoryById(id);
      setRow(data);
    } catch (err) {
      const message = err?.message || 'Failed to load payment details';
      setError(message);
      setRow(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <DashboardContent>
        <Stack alignItems="center" justifyContent="center" sx={{ py: 12 }}>
          <CircularProgress />
        </Stack>
      </DashboardContent>
    );
  }

  if (!row) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Payment details"
          links={[
            { name: 'Dashboard', href: paths.admin.root },
            { name: 'Payment', href: paths.admin.payment.root },
            { name: 'History', href: paths.admin.payment.history },
            { name: 'Details' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <EmptyContent
          filled
          title="Payment not found"
          description={error || 'This payment record is missing or not a membership payment.'}
          action={
            <Button
              component={RouterLink}
              href={paths.admin.payment.history}
              variant="contained"
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
              Back to history
            </Button>
          }
          sx={{ py: 10 }}
        />
      </DashboardContent>
    );
  }

  const code = row.voucherCode || row.affiliateCode || null;
  const itemNames = Array.isArray(row.items)
    ? row.items.map((item) => item?.name || item?.id).filter(Boolean).join(', ')
    : null;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Payment details"
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'Payment', href: paths.admin.payment.root },
          { name: 'History', href: paths.admin.payment.history },
          { name: row.paymentRef || 'Details' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.payment.history}
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card
        sx={(theme) => ({
          mb: 3,
          p: 3,
          border: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(
            theme.palette.background.paper,
            1
          )} 55%)`,
        })}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.5}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          <Stack spacing={1.25} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Label variant="soft" color={statusColor(row.status)}>
                {String(row.status || '—').toUpperCase()}
              </Label>
              <Chip
                size="small"
                color={row.discountApplied ? 'info' : 'default'}
                variant="soft"
                label={pricingLabel(row)}
                sx={{ fontWeight: 700 }}
              />
              {code ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={code}
                  sx={{ fontWeight: 700, letterSpacing: '0.04em' }}
                />
              ) : null}
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {row.name || row.email || 'Membership payment'}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              Ref · {row.paymentRef || '—'}
            </Typography>
          </Stack>

          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Payable amount
            </Typography>
            <Typography
              variant="h3"
              sx={{ fontWeight: 800, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}
            >
              {money(row.currency, row.payableAmount ?? row.amount)}
            </Typography>
          </Box>
        </Stack>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <AmountStat
            label="Original amount"
            value={money(row.currency, row.originalAmount)}
            muted={Boolean(row.discountApplied)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <AmountStat
            label="Discount"
            value={
              row.discountApplied
                ? `− ${money(row.currency, row.discountAmount)}`
                : money(row.currency, 0)
            }
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <AmountStat
            label="Payable"
            value={money(row.currency, row.payableAmount ?? row.amount)}
            emphasis
          />
        </Grid>

        <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
          <SectionCard title="Customer" icon="solar:user-rounded-bold-duotone">
            <Stack divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <InfoRow label="Name" value={row.name} />
              <InfoRow label="Email" value={row.email} />
              <InfoRow label="Username" value={row.username} />
              <InfoRow label="User ID" value={row.userId} mono />
            </Stack>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
          <SectionCard title="Pricing & promo" icon="solar:ticket-bold-duotone">
            <Stack divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <InfoRow label="Pricing type" value={pricingLabel(row)} />
              <InfoRow label="Discount applied" value={row.discountApplied ? 'Yes' : 'No'} />
              <InfoRow label="Promo / affiliate code" value={code || 'None'} mono />
              <InfoRow label="Event type" value={row.eventType} mono />
              <InfoRow label="Items" value={itemNames} />
            </Stack>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
          <SectionCard title="Payment provider" icon="solar:card-bold-duotone">
            <Stack divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <InfoRow label="Payment method" value={row.paymentMethod || 'Online payment'} />
              <InfoRow label="Payment ref" value={row.paymentRef} mono />
              <InfoRow label="WooshPay session" value={row.wooshpaySessionId} mono />
              <InfoRow label="Payment intent" value={row.wooshpayPaymentIntentId} mono />
              <InfoRow label="Source" value={row.source} />
              <InfoRow label="Failure reason" value={row.failureReason} />
              <InfoRow label="Course / purpose IDs" value={row.courseIds} mono />
            </Stack>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
          <SectionCard title="Timeline" icon="solar:calendar-bold-duotone">
            <Stack divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <InfoRow label="Created at" value={fDateTime(row.createdAt)} />
              <InfoRow label="Updated at" value={fDateTime(row.updatedAt)} />
              <InfoRow label="Paid at" value={fDateTime(row.paidAt)} />
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
