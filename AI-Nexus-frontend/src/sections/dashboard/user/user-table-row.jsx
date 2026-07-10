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
import IconButton from '@mui/material/IconButton';

import { useBoolean } from 'src/hooks/use-boolean';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { getJobRoleAuditStatus } from './view/user-fee-waiver-audit-panel';

// ----------------------------------------------------------------------

export function UserTableRow({ row, selected, onEditRow, onSelectRow, onDeleteRow }) {
  const router = useRouter();
  const confirm = useBoolean();

  const popover = usePopover();

  const jobRoleStatus = getJobRoleAuditStatus(row);

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Stack spacing={2} direction="row" alignItems="center">
            <Avatar alt={row.name} src={row.avatarUrl} />

            <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
              <Link
                component={RouterLink}
                href={paths.admin.user.details(row.id)}
                color="inherit"
                sx={{ cursor: 'pointer' }}
              >
                {row.name}
              </Link>
              <Box component="span" sx={{ color: 'text.disabled' }}>
                {row.email}
              </Box>
            </Stack>
          </Stack>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.username}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', typography: 'body2', color: 'text.secondary' }}>
          {row.createdAt ? fDate(row.createdAt) : '—'}
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={row.isVerified ? 'success' : 'warning'}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
          >
            <Iconify
              icon={row.isVerified ? 'solar:verified-check-bold' : 'solar:close-circle-bold'}
              width={16}
            />
            {row.isVerified ? 'Verified' : 'Unverified'}
          </Label>
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={jobRoleStatus.color}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
          >
            <Iconify
              icon={
                jobRoleStatus.label === 'Verified'
                  ? 'solar:verified-check-bold'
                  : jobRoleStatus.label === 'Rejected'
                    ? 'solar:close-circle-bold'
                    : 'solar:hourglass-line-bold'
              }
              width={16}
            />
            {jobRoleStatus.label}
          </Label>
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={
              (row.status === 'Active' && 'success') ||
              (row.status === 'Banned' && 'error') ||
              'default'
            }
          >
            {row.status}
          </Label>
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
              router.push(paths.admin.user.details(row.id));
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
