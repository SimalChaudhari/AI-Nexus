import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha } from '@mui/material/styles';

const DEFAULT_PROMO_COUNTRIES = [
  { code: 'BN', name: 'Brunei', currency: 'BND' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'LA', name: 'Laos', currency: 'LAK' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'CN', name: 'China', currency: 'CNY' },
];

function formatExactAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '';
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export function CountryPromoAmountsCard({
  promoAmountsByCountry,
  promoCountries,
  onChange,
}) {
  const amounts = promoAmountsByCountry && typeof promoAmountsByCountry === 'object'
    ? promoAmountsByCountry
    : {};
  const rows = Array.isArray(promoCountries) && promoCountries.length
    ? promoCountries
    : DEFAULT_PROMO_COUNTRIES.map((row) => ({
        ...row,
        amount: Number(amounts[row.code]) > 0 ? Number(amounts[row.code]) : null,
      }));

  const updateAmount = (code, value) => {
    const next = { ...amounts };
    const parsed = Number(value);
    if (value === '' || !Number.isFinite(parsed) || parsed <= 0) {
      delete next[code];
    } else {
      next[code] = parsed;
    }
    onChange?.(next);
  };

  return (
    <Box
      sx={(theme) => ({
        p: 2.5,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
      })}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Country promo amounts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Set the exact payable amount for each country when a promo code is applied.
            Leave blank to use the default SGD promo amount. No currency conversion is used
            when an exact amount is set (e.g. Thailand 2006 THB).
          </Typography>
        </Box>

        <Grid container spacing={1.5}>
          {rows.map((row) => {
            const code = String(row.code || '').toUpperCase();
            const currency = String(row.currency || '').toUpperCase();
            const current = amounts[code];
            return (
              <Grid item xs={12} sm={6} md={4} key={code}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={`${row.name || code}`}
                  value={current == null || current === '' ? '' : current}
                  onChange={(event) => updateAmount(code, event.target.value)}
                  inputProps={{ min: 0, step: '1' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">{currency}</InputAdornment>
                    ),
                  }}
                  helperText={
                    Number(current) > 0
                      ? `${currency} ${formatExactAmount(current)}`
                      : 'Uses default SGD promo'
                  }
                />
              </Grid>
            );
          })}
        </Grid>

        <Box
          sx={(theme) => ({
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.info.main, 0.06),
            border: `1px solid ${alpha(theme.palette.info.main, 0.16)}`,
          })}
        >
          <Typography variant="caption" color="text.secondary">
            Signup detects the member&apos;s country and charges this exact amount in that
            currency. ASEAN + China are listed here.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
