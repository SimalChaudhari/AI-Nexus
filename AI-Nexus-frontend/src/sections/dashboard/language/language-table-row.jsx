import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Radio from '@mui/material/Radio';
import LoadingButton from '@mui/lab/LoadingButton';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import RadioGroup from '@mui/material/RadioGroup';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { updateLanguage } from 'src/store/slices/languageSlice';
import { resolveLanguageAdminPaths } from './language-admin-paths';

// ----------------------------------------------------------------------

export function LanguageTableRow({ row, selected, onEditRow, onSelectRow, onDeleteRow }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const languagePaths = resolveLanguageAdminPaths(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );
  const confirm = useBoolean();
  const popover = usePopover();
  const statusModal = useBoolean();
  const [selectedDeleted, setSelectedDeleted] = useState(row.deleted);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (statusModal.value) {
      setSelectedDeleted(!!row.deleted);
    }
  }, [statusModal.value, row.deleted]);

  const handleStatusUpdate = useCallback(async () => {
    setStatusUpdating(true);
    try {
      await dispatch(
        updateLanguage({
          id: row.id,
          data: { deleted: !!selectedDeleted },
        })
      ).unwrap();
      toast.success('Status updated successfully');
      statusModal.onFalse();
    } catch (error) {
      toast.error(error || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  }, [dispatch, row.id, selectedDeleted, statusModal]);

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
              href={languagePaths.details(row.id)}
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
          <Box
            component="span"
            onClick={() => statusModal.onTrue()}
            sx={{
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: row.deleted ? 'error.main' : 'text.secondary',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
              '&:hover': { opacity: 0.8 },
            }}
          >
            {row.deleted ? 'Deleted' : 'Active'}
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
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              router.push(languagePaths.details(row.id));
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
        content="Are you sure you want to delete this language?"
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

      <Dialog fullWidth maxWidth="xs" open={statusModal.value} onClose={statusModal.onFalse}>
        <DialogTitle sx={{ pb: 1 }}>Update status</DialogTitle>
        <DialogContent>
          <Box sx={{ typography: 'body2', mb: 2 }}>
            Language: <strong>{row.title}</strong>
          </Box>
          <RadioGroup
            value={selectedDeleted ? 'deleted' : 'active'}
            onChange={(e) => setSelectedDeleted(e.target.value === 'deleted')}
          >
            <FormControlLabel value="active" control={<Radio />} label="Active" />
            <FormControlLabel value="deleted" control={<Radio />} label="Deleted" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <LoadingButton
            variant="contained"
            onClick={handleStatusUpdate}
            loading={statusUpdating}
            disabled={statusUpdating}
          >
            Update
          </LoadingButton>
          <Button
            variant="outlined"
            color="inherit"
            onClick={statusModal.onFalse}
            disabled={statusUpdating}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
