import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import { useBoolean } from 'src/hooks/use-boolean';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

function linkedCoursesLabel(row) {
  const courses = row.linkedCourses || [];
  if (!courses.length) return 'None yet';
  return courses.map((c) => c.title).join(', ');
}

export function ProgramTableRow({ row, selected, onEditRow, onSelectRow, onDeleteRow }) {
  const router = useRouter();
  const confirm = useBoolean();
  const popover = usePopover();
  const label = linkedCoursesLabel(row);

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox"><Checkbox checked={selected} onClick={onSelectRow} /></TableCell>
        <TableCell>
          <Link component={RouterLink} href={paths.admin.program.details(row.id)} color="inherit">
            {row.title}
          </Link>
        </TableCell>
        <TableCell>
          <Box sx={{ typography: 'body2', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
            {label}
          </Box>
        </TableCell>
        <TableCell>
          <Chip label={row.status || 'active'} size="small" color={row.status === 'active' ? 'success' : 'default'} />
        </TableCell>
        <TableCell>
          <IconButton onClick={popover.onOpen}><Iconify icon="eva:more-vertical-fill" /></IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover open={popover.open} anchorEl={popover.anchorEl} onClose={popover.onClose}>
        <MenuList>
          <MenuItem onClick={() => { router.push(paths.admin.program.details(row.id)); popover.onClose(); }}>
            <Iconify icon="solar:eye-bold" /> View
          </MenuItem>
          <MenuItem onClick={() => { onEditRow(); popover.onClose(); }}>
            <Iconify icon="solar:pen-bold" /> Edit
          </MenuItem>
          <MenuItem onClick={() => { confirm.onTrue(); popover.onClose(); }} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" /> Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <ConfirmDialog open={confirm.value} onClose={confirm.onFalse} title="Delete" content="Delete this program?"
        action={<Button variant="contained" color="error" onClick={onDeleteRow}>Delete</Button>} />
    </>
  );
}
