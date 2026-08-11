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

export function IntlMembershipPaymentSettingsCard({
  paymentSettings,
  setPaymentSettings,
  submitting,
  onSave,
}) {
  const values = paymentSettings || {};
  const currency = 'SGD';

  const preview = useMemo(() => {
    const base = Number(values.baseAmountSgd) || 0;
    const promo = Number(values.voucherDiscountAmountSgd) || 0;
    return {
      base: Number(base.toFixed(2)),
      promo: Number(promo.toFixed(2)),
    };
  }, [values.baseAmountSgd, values.voucherDiscountAmountSgd]);

  const updateField = (field, value) => {
    setPaymentSettings((prev) => ({
      ...(prev || {}),
      [field]: value,
    }));
  };

  const handleSave = async () => {
    const base = Number(values.baseAmountSgd);
    const promo = Number(values.voucherDiscountAmountSgd);
    if (!Number.isFinite(base) || base <= 0) {
      toast.error('Standard amount (SGD) is required and must be greater than 0');
      return;
    }
    if (!Number.isFinite(promo) || promo <= 0) {
      toast.error('Promo payable amount (SGD) is required and must be greater than 0');
      return;
    }
    await onSave?.({
      baseAmountSgd: base,
      voucherDiscountAmountSgd: promo,
    });
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6">International membership pricing</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Amounts are stored in SGD and converted to the member&apos;s country currency at signup
            checkout.
          </Typography>
        </Box>

        <SectionCard
          title="Payment amounts (SGD)"
          description="Standard fee and promo payable amount used when a valid promo code is applied."
        >
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Standard amount"
                value={values.baseAmountSgd ?? ''}
                onChange={(event) => updateField('baseAmountSgd', event.target.value)}
                inputProps={{ min: 0.01, step: '0.01' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
                helperText="Converted by FX at checkout"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                required
                type="number"
                label="Promo payable amount"
                value={values.voucherDiscountAmountSgd ?? ''}
                onChange={(event) => updateField('voucherDiscountAmountSgd', event.target.value)}
                inputProps={{ min: 0.01, step: '0.01' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
                helperText="Charged when a promo code is applied"
              />
            </Grid>
          </Grid>

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
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Without promo
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {currency} {preview.base.toFixed(2)}
              </Typography>
            </Box>
            <Divider
              flexItem
              orientation="vertical"
              sx={{ display: { xs: 'none', sm: 'block' } }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                With promo
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {currency} {preview.promo.toFixed(2)}
              </Typography>
            </Box>
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
