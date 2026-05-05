import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import Avatar from '@mui/material/Avatar';
import LoadingButton from '@mui/lab/LoadingButton';
import { useSelector } from 'react-redux';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { fServerDate } from 'src/utils/format-time';
import { getCourseDefaultImage } from 'src/utils/course-default-image';

import { AdminBundleTableCell } from './admin-bundle-ui';

// ----------------------------------------------------------------------

export function CourseTableRow({ row, selected, onEditRow, onSelectRow, onDeleteRow }) {
  const router = useRouter();
  const confirm = useBoolean();
  const popover = usePopover();
  const { deleting } = useSelector((state) => state.courses);
  const defaultCourseImage = getCourseDefaultImage();

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Stack spacing={2} direction="row" alignItems="center">
            <Avatar
              src={row.image || defaultCourseImage}
              alt={row.title}
              variant="rounded"
              sx={{ width: 48, height: 48 }}
            />

            <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
              <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 0.75 }}>
                <Link
                  component={RouterLink}
                  href={paths.admin.course.details(row.id)}
                  color="inherit"
                  sx={{ cursor: 'pointer' }}
                >
                  {row.title}
                </Link>
                {row.isBundle && (
                  <Chip
                    size="small"
                    icon={<Iconify icon="solar:layers-bold" width={14} />}
                    label="Bundle"
                    color="secondary"
                    variant="soft"
                    sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem', fontWeight: 800 } }}
                  />
                )}
              </Stack>
              <Box
                component="span"
                sx={{
                  color: 'text.secondary',
                  opacity: 0.8,
                  fontSize: '0.8rem',
                  letterSpacing: 0.2,
                }}
              >
                {row.createdAt ? `Created At · ${fServerDate(row.createdAt, 'MMM DD YYYY')}` : ''}
              </Box>
            </Stack>
          </Stack>
        </TableCell>

        <TableCell>
          <Chip
            label={row.level || 'Beginner'}
            color={
              row.level === 'Advanced' ? 'error' : row.level === 'Intermediate' ? 'warning' : 'info'
            }
            size="small"
          />
        </TableCell>

        <TableCell>
          <Chip
            label={row.categoryTitle || 'Uncategorized'}
            color={row.categoryTitle ? 'default' : 'warning'}
            variant={row.categoryTitle ? 'soft' : 'outlined'}
            size="small"
          />
        </TableCell>

        <TableCell>
          <Chip
            label={row.freeOrPaid ? 'Paid' : 'AI Fluency'}
            color={row.freeOrPaid ? 'success' : 'default'}
            size="small"
          />
        </TableCell>

        <TableCell sx={{ verticalAlign: 'middle' }}>
          <AdminBundleTableCell row={row} />
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
              router.push(paths.admin.course.details(row.id));
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
        onClose={deleting ? () => {} : confirm.onFalse}
        title="Delete course"
        content={
          <>
            Are you sure you want to delete this course? If you delete it, the following will also
            be permanently removed:
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
              <li>All enrollments (users who purchased or enrolled in this course)</li>
              <li>All reviews and ratings for this course given by users</li>
              <li>All course progress records</li>
              <li>All favorites for this course</li>
            </Box>
            This cannot be undone.
          </>
        }
        action={
          <LoadingButton
            variant="contained"
            color="error"
            onClick={onDeleteRow}
            loading={deleting}
            disabled={deleting}
            startIcon={!deleting ? <Iconify icon="solar:trash-bin-trash-bold" /> : null}
          >
            Delete
          </LoadingButton>
        }
      />
    </>
  );
}
