import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

function MetaLine({ label, value }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'block',
        color: 'text.secondary',
        fontSize: '0.75rem',
        lineHeight: 1.5,
        letterSpacing: 0.1,
      }}
    >
      <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>
        {label}
      </Box>
      {' · '}
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {value || '—'}
      </Box>
    </Box>
  );
}

export function CorporateMemberTableRow({ row, selected, onSelectRow, onViewRow }) {
  const fullName = row.name || `${row.firstname || ''} ${row.lastname || ''}`.trim() || '—';
  const statusColor =
    (row.status === 'Active' && 'success') || (row.status === 'Banned' && 'error') || 'warning';

  const createdDate = row.createdAt ? new Date(row.createdAt) : null;
  const createdDateText = createdDate
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(createdDate)
    : '—';

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      <TableCell padding="checkbox">
        <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
      </TableCell>

      <TableCell>
        <Stack spacing={2} direction="row" alignItems="center">
          <Avatar alt={fullName} src={row.avatarUrl} />

          <Stack
            sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start', minWidth: 0 }}
          >
            <Link
              component={RouterLink}
              href={paths.admin.corporateMember.details(row.id)}
              color="inherit"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
            >
              {fullName}
            </Link>
            <MetaLine label="Username" value={row.username} />
            <MetaLine label="Email" value={row.email} />
          </Stack>
        </Stack>
      </TableCell>

      <TableCell>
        <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
          {row.company && row.company !== '-' ? row.company : '—'}
        </Typography>
      </TableCell>

      <TableCell>
        <Label variant="soft" color="info">
          {row.companyCode || '—'}
        </Label>
      </TableCell>

      <TableCell>
        <Label variant="soft" color={statusColor}>
          {row.status || '—'}
        </Label>
      </TableCell>

      <TableCell>
        <Typography variant="body2">{createdDateText}</Typography>
      </TableCell>

      <TableCell align="right">
        <Button
          size="small"
          variant="soft"
          color="inherit"
          startIcon={<Iconify icon="solar:eye-bold" />}
          onClick={onViewRow}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}
