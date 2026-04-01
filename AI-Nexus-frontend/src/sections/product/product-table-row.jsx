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
import Typography from '@mui/material/Typography';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export function ProductTableRow({ row, selected, onEditRow, onSelectRow, onDeleteRow }) {
  const router = useRouter();
  const confirm = useBoolean();
  const popover = usePopover();

  const firstImage = row.images && row.images.length > 0 ? (typeof row.images[0] === 'object' ? row.images[0].image : row.images[0]) : null;

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Stack spacing={2} direction="row" alignItems="center">
            {firstImage ? (
              <Avatar
                alt={row.title}
                src={firstImage}
                variant="rounded"
                sx={{ width: 48, height: 48 }}
              />
            ) : (
              <Avatar variant="rounded" sx={{ width: 48, height: 48 }}>
                {row.title?.[0]?.toUpperCase()}
              </Avatar>
            )}

            <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
              <Link
                component={RouterLink}
                href={paths.admin.product.details(row.id)}
                color="inherit"
                sx={{ cursor: 'pointer' }}
              >
                {row.title}
              </Link>
              <Typography variant="caption" color="text.secondary">
                ₹{row.actualPrice}
                {row.discountPrice && row.discountPrice < row.actualPrice && (
                  <Box component="span" sx={{ textDecoration: 'line-through', ml: 1, color: 'text.disabled' }}>
                    ₹{row.discountPrice}
                  </Box>
                )}
              </Typography>
            </Stack>
          </Stack>
        </TableCell>

        <TableCell>
          <Label color={row.inStock ? 'success' : 'error'} variant="soft">
            {row.inStock ? 'In Stock' : 'Out of Stock'}
          </Label>
        </TableCell>

        <TableCell>
          {row.isSale && <Label color="warning" variant="soft">On Sale</Label>}
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
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              router.push(paths.admin.product.details(row.id));
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
          <Button variant="contained" color="error" onClick={onDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}
