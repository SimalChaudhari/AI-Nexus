import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export function IntlPathwayModuleTableRow({ row, selected, onEditRow, onSelectRow, onDeleteRow }) {
  const confirm = useBoolean();
  const popover = usePopover();

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
            {row.code}
          </Typography>
        </TableCell>

        <TableCell>
          <Stack sx={{ typography: 'body2', alignItems: 'flex-start' }}>
            <Link
              component={RouterLink}
              href={paths.admin.international.modules.edit(row.id)}
              color="inherit"
              underline="hover"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
            >
              {row.title}
            </Link>
            <Box component="span" sx={{ color: 'text.disabled', fontSize: 12 }}>
              Sort {row.sortOrder ?? 0}
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          <Label variant="soft" color="info">
            Pillar {Number(row.pillar) || row.pillar}
          </Label>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {Number(row.minutes) || 0}m
          </Typography>
        </TableCell>

        <TableCell>
          <Label variant="soft" color={row.videoUrl ? 'success' : 'warning'}>
            {row.videoUrl ? 'Video linked' : 'No video'}
          </Label>
        </TableCell>

        <TableCell>
          <Label variant="soft" color={row.deleted ? 'error' : 'success'}>
            {row.deleted ? 'Deleted' : 'Active'}
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              onEditRow();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>

          {!row.deleted && (
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
          )}
        </MenuList>
      </CustomPopover>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Soft-delete this pathway module? It will no longer appear on the public planner."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              confirm.onFalse();
              onDeleteRow();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}
