import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import CardMedia from '@mui/material/CardMedia';
import LoadingButton from '@mui/lab/LoadingButton';
import { useSelector } from 'react-redux';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export function CourseCard({ row, onEditRow, onDeleteRow }) {
  const router = useRouter();
  const confirm = useBoolean();
  const popover = usePopover();
  const { deleting } = useSelector((state) => state.courses);

  const levelColor =
    row.level === 'Advanced' ? 'error' : row.level === 'Intermediate' ? 'warning' : 'info';

  return (
    <>
      <Card
        sx={{
          position: 'relative',
          overflow: 'hidden',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease',
          '&:hover': {
            boxShadow: (theme) => theme.shadows[12],
            transform: 'translateY(-4px)',
          },
        }}
      >
        {/* Action menu - top right */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
          }}
        >
          <IconButton
            size="small"
            color={popover.open ? 'inherit' : 'default'}
            onClick={popover.onOpen}
            sx={{
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </Box>

        {/* Image / placeholder */}
        <Link
          component={RouterLink}
          href={paths.admin.course.details(row.id)}
          color="inherit"
          sx={{ display: 'block' }}
        >
          <CardMedia
            component="img"
            image={row.image || '/assets/images/cover/cover-1.jpg'}
            alt={row.title}
            sx={{
              height: 180,
              objectFit: 'cover',
            }}
          />
        </Link>

        {/* Content */}
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Link
            component={RouterLink}
            href={paths.admin.course.details(row.id)}
            color="inherit"
            underline="none"
            sx={{
              typography: 'subtitle2',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              '&:hover': { color: 'primary.main' },
            }}
          >
            {row.title}
          </Link>

          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            <Chip
              label={row.level || 'Beginner'}
              color={levelColor}
              size="small"
              sx={{ height: 22, fontWeight: 600 }}
            />
            <Chip
              label={row.freeOrPaid ? 'Paid' : 'Free'}
              color={row.freeOrPaid ? 'success' : 'default'}
              size="small"
              sx={{ height: 22, fontWeight: 600 }}
            />
          </Stack>

          <Box
            component="span"
            sx={{
              typography: 'caption',
              color: 'text.secondary',
            }}
          >
            {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''}
            {Array.isArray(row.languageIds) && row.languageIds.length > 0 && (
              <> · {row.languageIds.length} language{row.languageIds.length !== 1 ? 's' : ''}</>
            )}
          </Box>
        </Stack>
      </Card>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
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
            Are you sure you want to delete this course? If you delete it, the following will also be
            permanently removed:
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
          >
            Delete
          </LoadingButton>
        }
      />
    </>
  );
}
