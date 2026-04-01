import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function toDisplayText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    return value.title ?? value.label ?? value.name ?? '';
  }
  return String(value);
}

export function CheckoutCartProduct({ row, onDelete }) {
  const displayName = toDisplayText(row.name);
  const priceTotal = Number(row.price) || 0;

  return (
    <TableRow>
      <TableCell>
        <Stack spacing={2} direction="row" alignItems="center">
          <Avatar
            variant="rounded"
            alt={displayName}
            src={row.coverUrl}
            sx={{ width: 64, height: 64 }}
          />

          <Stack spacing={0.5}>
            <Typography noWrap variant="subtitle2" sx={{ maxWidth: 240 }}>
              {displayName}
            </Typography>
          </Stack>
        </Stack>
      </TableCell>

      <TableCell>{fCurrency(row.price)}</TableCell>

      <TableCell align="right">{fCurrency(priceTotal)}</TableCell>

      <TableCell align="right" sx={{ px: 1 }}>
        <IconButton onClick={onDelete}>
          <Iconify icon="solar:trash-bin-trash-bold" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
