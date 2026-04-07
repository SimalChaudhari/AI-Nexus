import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function CheckoutSummary({ total, discount, subtotal, shipping, onApplyDiscount, discountDisabled }) {
  const displayDiscount = discountDisabled ? '-' : (discount ? fCurrency(-discount) : '-');

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title="Order summary" />

      <Stack spacing={2} sx={{ p: 3 }}>
        <Box display="flex">
          <Typography
            component="span"
            variant="body2"
            sx={{ flexGrow: 1, color: 'text.secondary' }}
          >
            Sub total
          </Typography>
          <Typography component="span" variant="subtitle2">
            {fCurrency(subtotal)}
          </Typography>
        </Box>

        <Box display="flex">
          <Typography
            component="span"
            variant="body2"
            sx={{ flexGrow: 1, color: 'text.secondary' }}
          >
            Discount
          </Typography>
          <Typography component="span" variant="subtitle2">
            {displayDiscount}
          </Typography>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box
          display="flex"
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{
            py: 1.5,
            px: 2,
            borderRadius: 1,
            bgcolor: 'background.neutral',
          }}
        >
          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 600 }}>
            Total
          </Typography>

          <Box sx={{ textAlign: 'right' }}>
            <Typography component="span" variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>
              {fCurrency(total)}
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
              (VAT included if applicable)
            </Typography>
          </Box>
        </Box>

        {onApplyDiscount && (
          <TextField
            fullWidth
            disabled={discountDisabled}
            placeholder="Discount codes / Gifts"
            value="DISCOUNT5"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    color="primary"
                    disabled={discountDisabled}
                    onClick={() => onApplyDiscount(5)}
                    sx={{ mr: -0.5 }}
                  >
                    Apply
                  </Button>
                </InputAdornment>
              ),
            }}
          />
        )}
      </Stack>
    </Card>
  );
}
