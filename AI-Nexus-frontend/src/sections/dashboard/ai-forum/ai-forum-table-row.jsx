import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { getForumFullName } from 'src/utils/mask-forum-display-name';

// ----------------------------------------------------------------------

export function AiForumTableRow({ row, selected, onEditRow, onSelectRow, onDeleteRow }) {
  const router = useRouter();
  const confirm = useBoolean();
  const popover = usePopover();
  const authorId = row.author?.id || row.userId;
  const authorName = getForumFullName(row.author);
  const authorEmail = row.author?.email || null;

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
            <Link
              component={RouterLink}
              href={paths.admin.aiForum.details(row.id)}
              color="inherit"
              sx={{ cursor: 'pointer' }}
            >
              {row.title}
            </Link>
            <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.875rem' }}>
              {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''}
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          {authorId || row.author ? (
            <Stack spacing={0.25} alignItems="flex-start">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {authorName}
              </Typography>
              {authorEmail && authorId ? (
                <Link
                  component={RouterLink}
                  href={paths.admin.user.details(authorId)}
                  variant="caption"
                  sx={{ wordBreak: 'break-all' }}
                >
                  {authorEmail}
                </Link>
              ) : authorEmail ? (
                <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
                  {authorEmail}
                </Typography>
              ) : null}
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              —
            </Typography>
          )}
        </TableCell>

        <TableCell>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {row.viewCount || 0} views
          </Box>
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
              router.push(paths.admin.aiForum.details(row.id));
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
        content={
          <>
            Are you sure want to delete <strong> {row.title} </strong>?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={() => {
              onDeleteRow();
              confirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}
