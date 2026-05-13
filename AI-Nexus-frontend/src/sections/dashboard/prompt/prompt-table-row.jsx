import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
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

import { PROMPT_PROVIDER_LABEL, PROMPT_PROVIDER_LABEL_COLOR } from './constants';

// ----------------------------------------------------------------------

export const htmlToPlain = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ----------------------------------------------------------------------

export function PromptTableRow({
  row,
  selected,
  onSelectRow,
  onViewRow,
  onEditRow,
  onDeleteRow,
  hideProviders = false,
}) {
  const popover = usePopover();
  const confirm = useBoolean();
  const useCaseText = htmlToPlain(row.useCase);
  const promptText = htmlToPlain(row.prompt);
  const providers = Array.isArray(row.providers) ? row.providers : [];

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
        </TableCell>

        {!hideProviders && (
          <TableCell>
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {providers.map((providerId) => (
                <Label
                  key={`${row.id}-${providerId}`}
                  variant="soft"
                  color={PROMPT_PROVIDER_LABEL_COLOR[providerId] || 'default'}
                  sx={{ fontWeight: 600 }}
                >
                  {PROMPT_PROVIDER_LABEL[providerId] || String(providerId).toUpperCase()}
                </Label>
              ))}
            </Stack>
          </TableCell>
        )}

        <TableCell>
          <Tooltip title={useCaseText || ''}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
              {useCaseText || '-'}
            </Typography>
          </Tooltip>
        </TableCell>

        <TableCell>
          <Tooltip title={promptText || ''}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 420 }}>
              {promptText || '-'}
            </Typography>
          </Tooltip>
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
