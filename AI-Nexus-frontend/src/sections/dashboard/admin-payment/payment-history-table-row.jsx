import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { fDateTime } from 'src/utils/format-time';

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
  if (row.discountApplied) return 'Promo';
  if (row.pricingType === 'verified') return 'Verified';
  return 'Standard';
}

export function PaymentHistoryTableRow({ row }) {
  const code = row.voucherCode || row.affiliateCode || null;
  const detailsHref = paths.admin.payment.historyDetails(row.id);

  return (
    <TableRow hover>
      <TableCell sx={{ maxWidth: 180, width: 180 }}>
        <Stack spacing={0.25} sx={{ minWidth: 0, maxWidth: 180 }}>
          <Typography variant="subtitle2" noWrap title={row.name || ''}>
            {row.name || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap title={row.email || ''}>
            {row.email || '—'}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
          }}
        >
          {row.paymentRef || '—'}
        </Typography>
      </TableCell>

      <TableCell>
        <Label variant="soft" color={statusColor(row.status)}>
          {String(row.status || '—').toUpperCase()}
        </Label>
      </TableCell>

      <TableCell>
        <Label variant="soft" color={row.discountApplied ? 'info' : 'default'}>
          {pricingLabel(row)}
        </Label>
        {code ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.5, fontWeight: 700, letterSpacing: '0.04em' }}
          >
            {code}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
            No code
          </Typography>
        )}
      </TableCell>

      <TableCell align="right">
        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {money(row.currency, row.payableAmount ?? row.amount)}
        </Typography>
        {row.discountApplied ? (
          <Box sx={{ mt: 0.25 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textDecoration: 'line-through', display: 'block' }}
            >
              {money(row.currency, row.originalAmount)}
            </Typography>
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              −{money(row.currency, row.discountAmount)}
            </Typography>
          </Box>
        ) : null}
      </TableCell>

      <TableCell>
        <Typography variant="body2">{fDateTime(row.createdAt) || '—'}</Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2">{fDateTime(row.updatedAt) || '—'}</Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {fDateTime(row.paidAt) || '—'}
        </Typography>
      </TableCell>

      <TableCell align="right">
        <Tooltip title="View details">
          <IconButton
            component={RouterLink}
            href={detailsHref}
            size="small"
            aria-label="View payment"
          >
            <Iconify icon="solar:eye-bold" width={18} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
