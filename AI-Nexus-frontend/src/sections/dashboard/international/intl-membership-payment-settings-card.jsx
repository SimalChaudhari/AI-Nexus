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
import { CountryPromoAmountsCard } from 'src/sections/dashboard/admin-settings/view/components/country-promo-amounts-card';

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
    const full = Number(values.baseAmountSgd) || 0;
    const student = Number(values.studentAmountSgd) || 0;
    return {
      full: Number(full.toFixed(2)),
      student: Number(student.toFixed(2)),
    };
  }, [values.baseAmountSgd, values.studentAmountSgd]);

  const updateField = (field, value) => {
    setPaymentSettings((prev) => ({
      ...(prev || {}),
      [field]: value,
    }));
  };

  const handleSave = async () => {
    const full = Number(values.baseAmountSgd);
    const student = Number(values.studentAmountSgd);
    if (!Number.isFinite(full) || full <= 0) {
      toast.error('Full / Role amount (SGD) is required and must be greater than 0');
      return;
    }
    if (!Number.isFinite(student) || student <= 0) {
      toast.error('Student amount (SGD) is required and must be greater than 0');
      return;
    }
    await onSave?.({
      baseAmountSgd: full,
      studentAmountSgd: student,
      voucherDiscountAmountSgd: values.voucherDiscountAmountSgd,
      promoAmountsByCountry: values.promoAmountsByCountry || {},
    });
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6">International membership pricing</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Set separate Student and Full / Role fees in SGD. Amounts are converted to the
            member&apos;s country currency at signup checkout.
          </Typography>
        </Box>

        <SectionCard
          title="Payment amounts (SGD)"
          description="Student unlocks Student tab only. Full / Role unlocks By role + Pillars."
        >
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Student amount"
                value={values.studentAmountSgd ?? ''}
                onChange={(event) => updateField('studentAmountSgd', event.target.value)}
                inputProps={{ min: 0.01, step: '0.01' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
                helperText="Student plan fee"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Full / Role amount"
                value={values.baseAmountSgd ?? ''}
                onChange={(event) => updateField('baseAmountSgd', event.target.value)}
                inputProps={{ min: 0.01, step: '0.01' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                }}
                helperText="Full / Role plan fee"
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
                Student
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {preview.student.toFixed(2)} {currency}
              </Typography>
            </Box>
            <Divider
              flexItem
              orientation="vertical"
              sx={{ display: { xs: 'none', sm: 'block' } }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Full / Role
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {preview.full.toFixed(2)} {currency}
              </Typography>
            </Box>
          </Stack>
        </SectionCard>

        <CountryPromoAmountsCard
          promoAmountsByCountry={values.promoAmountsByCountry}
          promoCountries={values.promoCountries}
          onChange={(next) => updateField('promoAmountsByCountry', next)}
        />

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
