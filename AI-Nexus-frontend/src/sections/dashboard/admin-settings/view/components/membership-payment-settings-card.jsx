import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

function AmountBreakdown({ title, rows, totalLabel, totalValue, currency }) {
  return (
    <Box
      sx={(theme) => ({
        width: 1,
        height: 1,
        p: 2,
        borderRadius: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.grey[500], 0.04),
        display: 'flex',
        flexDirection: 'column',
      })}
    >
      <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack spacing={0.85} sx={{ flexGrow: 1 }}>
        {rows.map((row) => (
          <Stack
            key={row.label}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography variant="body2" color="text.secondary">
              {row.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {currency} {row.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Divider sx={{ borderStyle: 'dashed', my: 1.25 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">{totalLabel}</Typography>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'primary.main' }}
        >
          {currency} {totalValue}
        </Typography>
      </Stack>
    </Box>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <Box
      sx={(theme) => ({
        p: 2.5,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
      })}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {children}
      </Stack>
    </Box>
  );
}

export function MembershipPaymentSettingsCard({
  paymentSettings,
  setPaymentSettings,
  submitting,
  onSave,
}) {
  const values = paymentSettings || {};

  const preview = useMemo(() => {
    const base = Number(values.baseAmount) || 0;
    const verified = Number(values.verifiedBaseAmount) || 0;
    const gstPercent = Number(values.gstRatePercent) || 0;
    const gstRate = gstPercent / 100;
    return {
      gstPercent,
      gstAmount: Number((base * gstRate).toFixed(2)),
      totalAmount: Number((base * (1 + gstRate)).toFixed(2)),
      verifiedGstAmount: Number((verified * gstRate).toFixed(2)),
      verifiedTotalAmount: Number((verified * (1 + gstRate)).toFixed(2)),
    };
  }, [values.baseAmount, values.verifiedBaseAmount, values.gstRatePercent]);

  const updateField = (field, value) => {
    setPaymentSettings((prev) => ({
      ...(prev || {}),
      [field]: value,
    }));
  };

  const currency = String(values.currency || 'SGD').toUpperCase();
  const gstLabel = `GST (${preview.gstPercent || 0}%)`;
  const promoAmount = Number(values.voucherDiscountAmount);

  const handleSave = async () => {
    if (!Number.isFinite(promoAmount) || promoAmount <= 0) {
      toast.error('Promo payable amount is required and must be a number greater than 0');
      return;
    }
    await onSave?.({
      currency: values.currency,
      baseAmount: values.baseAmount,
      verifiedBaseAmount: values.verifiedBaseAmount,
      gstRatePercent: values.gstRatePercent,
      voucherDiscountAmount: values.voucherDiscountAmount,
    });
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6">Membership payment & voucher pricing</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Configure signup checkout amounts and the promo payable amount used by active voucher codes.
          </Typography>
        </Box>

        <SectionCard
          title="Payment amounts"
          description="Standard and verified membership fees shown on signup checkout."
        >
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Currency"
                value={values.currency || 'SGD'}
                onChange={(event) => updateField('currency', event.target.value.toUpperCase())}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="GST rate"
                value={values.gstRatePercent ?? ''}
                onChange={(event) => updateField('gstRatePercent', event.target.value)}
                inputProps={{ min: 0, step: '0.01' }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Standard base"
                value={values.baseAmount ?? ''}
                onChange={(event) => updateField('baseAmount', event.target.value)}
                inputProps={{ min: 0, step: '0.01' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
                helperText="Ex-GST"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Verified base"
                value={values.verifiedBaseAmount ?? ''}
                onChange={(event) => updateField('verifiedBaseAmount', event.target.value)}
                inputProps={{ min: 0, step: '0.01' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
                helperText="Ex-GST"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} alignItems="stretch">
            <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
              <AmountBreakdown
                title="Standard"
                currency={currency}
                rows={[
                  { label: 'Base', value: Number(values.baseAmount || 0).toFixed(2) },
                  { label: gstLabel, value: preview.gstAmount.toFixed(2) },
                ]}
                totalLabel="Payable"
                totalValue={preview.totalAmount.toFixed(2)}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
              <AmountBreakdown
                title="Verified"
                currency={currency}
                rows={[
                  { label: 'Base', value: Number(values.verifiedBaseAmount || 0).toFixed(2) },
                  { label: gstLabel, value: preview.verifiedGstAmount.toFixed(2) },
                ]}
                totalLabel="Payable"
                totalValue={preview.verifiedTotalAmount.toFixed(2)}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          title="Promo payable amount"
          description="Charged on signup when any active voucher code is applied. Manage codes in the table below."
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            sx={(theme) => ({
              p: 2,
              borderRadius: 1.5,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.grey[500], 0.04),
            })}
          >
            <TextField
              size="small"
              required
              type="number"
              label="Promo payable amount"
              value={values.voucherDiscountAmount ?? ''}
              onChange={(event) => updateField('voucherDiscountAmount', event.target.value)}
              inputProps={{ min: 0.01, step: '0.01' }}
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
              }}
              sx={{ width: { xs: 1, sm: 260 }, flexShrink: 0 }}
            />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1, sm: 3 }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ minWidth: 0 }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  With voucher
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {currency}{' '}
                  {Number.isFinite(promoAmount) && promoAmount > 0
                    ? promoAmount.toFixed(2)
                    : '0.00'}
                </Typography>
              </Box>
              <Divider
                flexItem
                orientation="vertical"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Without voucher
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {currency} {preview.totalAmount.toFixed(2)}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </SectionCard>

        <Divider />

        <Stack direction="row" justifyContent="flex-end">
          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={handleSave}
            startIcon={<Iconify icon="solar:diskette-bold" width={18} />}
          >
            Save payment settings
          </LoadingButton>
        </Stack>
      </Stack>
    </Card>
  );
}
