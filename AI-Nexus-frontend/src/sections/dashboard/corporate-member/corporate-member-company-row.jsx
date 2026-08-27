import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Collapse from '@mui/material/Collapse';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AvatarGroup from '@mui/material/AvatarGroup';
import { avatarGroupClasses } from '@mui/material/AvatarGroup';

import { useBoolean } from 'src/hooks/use-boolean';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function memberDisplayName(member) {
  return member.name || `${member.firstname || ''} ${member.lastname || ''}`.trim() || '—';
}

function statusColor(status) {
  if (status === 'Active') return 'success';
  if (status === 'Banned') return 'error';
  if (status === 'Mixed') return 'warning';
  return 'warning';
}

// ----------------------------------------------------------------------

function HrContactItem({ member, onViewRow, onEditRow, onDeleteRow }) {
  const confirm = useBoolean();
  const popover = usePopover();
  const fullName = memberDisplayName(member);
  const memberStatus = member.status || 'Active';

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          p: (theme) => theme.spacing(1.5, 2, 1.5, 1.5),
          '&:not(:last-of-type)': {
            borderBottom: (theme) => `solid 1px ${theme.vars.palette.divider}`,
          },
        }}
      >
        <Avatar alt={fullName} src={member.avatarUrl} sx={{ width: 40, height: 40 }} />

        <Stack sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Link
            component={RouterLink}
            href={paths.admin.corporateMember.details(member.id)}
            color="inherit"
            sx={{ cursor: 'pointer', fontWeight: 600, typography: 'body2' }}
          >
            {fullName}
          </Link>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
            {member.email || '—'}
          </Typography>
          {member.username ? (
            <Typography variant="caption" sx={{ color: 'text.disabled' }} noWrap>
              {member.username}
            </Typography>
          ) : null}
        </Stack>

        <Label variant="soft" color={statusColor(memberStatus)}>
          {memberStatus}
        </Label>

        <Typography variant="caption" sx={{ color: 'text.secondary', width: 92, flexShrink: 0 }}>
          {formatDate(member.createdAt)}
        </Typography>

        <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>
      </Stack>

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
              onViewRow(member.id);
              popover.onClose();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>
          <MenuItem
            onClick={() => {
              onEditRow(member.id);
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
        content={`Delete HR contact ${fullName}?`}
        action={
          <Button
            variant="contained"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={() => onDeleteRow(member.id)}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

export function CorporateMemberCompanyRow({ company, defaultExpanded = false, onViewRow, onEditRow, onDeleteRow }) {
  const collapse = useBoolean(defaultExpanded);
  const hrLabel = company.hrCount === 1 ? '1 HR contact' : `${company.hrCount} HR contacts`;

  return (
    <>
      <TableRow hover selected={false} tabIndex={-1}>
        <TableCell>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.dark', width: 40, height: 40 }}>
              <Iconify icon="solar:buildings-2-bold" width={22} />
            </Avatar>

            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {company.companyName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {hrLabel}
              </Typography>
            </Stack>
          </Stack>
        </TableCell>

        <TableCell>
          {company.companyCode ? (
            <Label variant="soft" color="info">
              {company.companyCode}
            </Label>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              —
            </Typography>
          )}
        </TableCell>

        <TableCell>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <AvatarGroup
              max={4}
              sx={{ [`& .${avatarGroupClasses.avatar}`]: { width: 28, height: 28, fontSize: 12 } }}
            >
              {company.members.map((member) => (
                <Avatar
                  key={member.id}
                  alt={memberDisplayName(member)}
                  src={member.avatarUrl}
                />
              ))}
            </AvatarGroup>
            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {hrLabel}
            </Typography>
          </Stack>
        </TableCell>

        <TableCell>
          <Label variant="soft" color={statusColor(company.status)}>
            {company.status}
          </Label>
        </TableCell>

        <TableCell>
          <Typography variant="body2">{formatDate(company.createdAt)}</Typography>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <IconButton
            color={collapse.value ? 'inherit' : 'default'}
            onClick={collapse.onToggle}
            sx={{ ...(collapse.value && { bgcolor: 'action.hover' }) }}
            aria-label={collapse.value ? 'Hide HR contacts' : 'Show HR contacts'}
          >
            <Iconify icon="eva:arrow-ios-downward-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell sx={{ p: 0, border: 'none' }} colSpan={6}>
          <Collapse in={collapse.value} timeout="auto" unmountOnExit sx={{ bgcolor: 'background.neutral' }}>
            <Paper sx={{ m: 1.5 }}>
              <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 1.5, pb: 0.5, color: 'text.secondary' }}>
                HR contacts
              </Typography>
              {company.members.map((member) => (
                <HrContactItem
                  key={member.id}
                  member={member}
                  onViewRow={onViewRow}
                  onEditRow={onEditRow}
                  onDeleteRow={onDeleteRow}
                />
              ))}
            </Paper>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
