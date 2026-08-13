import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useBoolean } from 'src/hooks/use-boolean';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

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

export function CorporateMemberTableRow({ row, selected, onSelectRow, onViewRow, onEditRow, onDeleteRow }) {
  const confirm = useBoolean();
  const popover = usePopover();

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
    <>
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

        <TableCell>
          <Stack direction="row" alignItems="center">
            <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          </Stack>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        disableScrollLock
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              onViewRow();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>

          <MenuItem
            onClick={() => {
              onEditRow();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>

          <MenuItem
            onClick={() => {
              confirm.onTrue();
              popover.onClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete?"
        action={
          <Button
            variant="contained"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={onDeleteRow}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}
