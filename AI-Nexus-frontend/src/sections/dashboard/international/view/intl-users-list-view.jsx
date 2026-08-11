'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { useBoolean } from 'src/hooks/use-boolean';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import { useSetState } from 'src/hooks/use-set-state';
import { varAlpha } from 'src/theme/styles';
import { DashboardContent } from 'src/layouts/dashboard';
import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';

import { intlUsersService } from 'src/services/intl-users.service';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'banned', label: 'Banned' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Name' },
  { id: 'authProvider', label: 'Auth', width: 110 },
  { id: 'membershipType', label: 'Plan', width: 120 },
  { id: 'promoCode', label: 'Promo', width: 120 },
  { id: 'paymentStatus', label: 'Payment', width: 120 },
  { id: 'status', label: 'Status', width: 140 },
  { id: 'createdAt', label: 'Joined', width: 180 },
  { id: '', width: 72 },
];

function displayName(row) {
  const full = [row.salutation, row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  const name = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  return name || row.username || '—';
}

function MetaLine({ label, value }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'block',
        color: 'text.secondary',
        fontSize: '0.75rem',
        lineHeight: 1.5,
        letterSpacing: 0.1,
      }}
    >
      <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>
        {label}
      </Box>
      {' · '}
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {value || '—'}
      </Box>
    </Box>
  );
}

function formatJoined(value) {
  const createdDate = value ? new Date(value) : null;
  if (!createdDate || Number.isNaN(createdDate.getTime())) {
    return { dateText: '—', timeText: '' };
  }
  return {
    dateText: `${new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(createdDate)}, ${new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(createdDate)}`,
    timeText: new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(createdDate),
  };
}

// ----------------------------------------------------------------------

export function IntlUsersListView() {
  const router = useRouter();
  const table = useTable({ defaultRowsPerPage: 20 });
  const filters = useSetState({ name: '', status: 'all' });
  const confirm = useBoolean();
  const confirmRow = useBoolean();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await intlUsersService.getUsers({
        page: table.page + 1,
        limit: table.rowsPerPage,
        search: filters.state.name || undefined,
        status: filters.state.status,
      });
      setTableData(result.data || []);
      setTotal(result.pagination?.total || 0);
    } catch (error) {
      toast.error(error?.message || 'Failed to load international users');
      setTableData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [table.page, table.rowsPerPage, filters.state.name, filters.state.status]);

  useEffect(() => {
    load();
  }, [load]);

  const statusCounts = useMemo(() => {
    const counts = { all: tableData.length, active: 0, pending_payment: 0, banned: 0 };
    tableData.forEach((row) => {
      if (counts[row.status] != null) counts[row.status] += 1;
    });
    return counts;
  }, [tableData]);

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await intlUsersService.deleteUser(id);
        toast.success('Delete success!');
        confirmRow.onFalse();
        setSelectedUser(null);
        if (table.selected.includes(id)) {
          table.setSelected(table.selected.filter((item) => item !== id));
        }
        await load();
      } catch (error) {
        toast.error(error?.message || 'Failed to delete user');
      }
    },
    [confirmRow, load, table]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      await Promise.all(table.selected.map((id) => intlUsersService.deleteUser(id)));
      toast.success('Delete success!');
      table.setSelected([]);
      confirm.onFalse();
      await load();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete users');
    }
  }, [confirm, load, table]);

  const handleFilterStatus = useCallback(
    (_event, newValue) => {
      table.onResetPage();
      filters.setState({ status: newValue });
    },
    [filters, table]
  );

  const notFound = !loading && !tableData.length;

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.admin.root },
            { name: 'International', href: paths.admin.international.root },
            { name: 'Users', href: paths.admin.international.users.list },
            { name: 'List' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <Tabs
            value={filters.state.status}
            onChange={handleFilterStatus}
            sx={{
              px: 2.5,
              boxShadow: (theme) =>
                `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
            }}
          >
            {STATUS_OPTIONS.map((tab) => (
              <Tab
                key={tab.value}
                iconPosition="end"
                value={tab.value}
                label={tab.label}
                icon={
                  <Label
                    variant={
                      ((tab.value === 'all' || tab.value === filters.state.status) && 'filled') ||
                      'soft'
                    }
                    color={
                      (tab.value === 'active' && 'success') ||
                      (tab.value === 'banned' && 'error') ||
                      (tab.value === 'pending_payment' && 'warning') ||
                      'default'
                    }
                  >
                    {tab.value === 'all' ? statusCounts.all : statusCounts[tab.value] || 0}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <Stack
            spacing={2}
            alignItems={{ xs: 'flex-end', md: 'center' }}
            direction={{ xs: 'column', md: 'row' }}
            sx={{ p: 2.5, pr: { xs: 2.5, md: 1 } }}
          >
            <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
              <TextField
                fullWidth
                value={filters.state.name}
                onChange={(e) => {
                  table.onResetPage();
                  filters.setState({ name: e.target.value });
                }}
                placeholder="Search by name, username, or email..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </Stack>

          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={tableData.length}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  tableData.map((row) => row.id)
                )
              }
              action={
                <Tooltip title="Delete">
                  <IconButton color="primary" onClick={confirm.onTrue}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Tooltip>
              }
            />

            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={tableData.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      tableData.map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {tableData.map((row) => (
                    <IntlUserTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onViewRow={() => router.push(paths.admin.international.users.details(row.id))}
                      onDeleteRow={() => {
                        setSelectedUser(row);
                        confirmRow.onTrue();
                      }}
                    />
                  ))}

                  <TableEmptyRows
                    height={table.dense ? 56 : 56 + 20}
                    emptyRows={emptyRows(0, table.rowsPerPage, tableData.length)}
                  />

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>

            {loading ? <TableLoadingOverlay minHeight={220} /> : null}
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={total}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 30]}
          />
        </Card>
      </DashboardContent>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content={
          <>
            Are you sure want to delete <strong> {table.selected.length} </strong> items?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={handleDeleteRows}
          >
            Delete
          </Button>
        }
      />

      <ConfirmDialog
        open={confirmRow.value}
        onClose={() => {
          confirmRow.onFalse();
          setSelectedUser(null);
        }}
        title="Delete"
        content="Are you sure want to delete?"
        action={
          <Button
            variant="contained"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={() => selectedUser?.id && handleDeleteRow(selectedUser.id)}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

function IntlUserTableRow({ row, selected, onSelectRow, onViewRow, onDeleteRow }) {
  const popover = usePopover();
  const name = displayName(row);
  const isOAuth = String(row.authProvider || '').toUpperCase() === 'OAUTH';
  const { dateText, timeText } = formatJoined(row.createdAt);

  const paymentStatus = String(row.paymentStatus || '').toLowerCase();
  const accountStatus = String(row.status || '').toLowerCase();
  const membershipType = String(row.membershipType || '').toLowerCase() === 'student' ? 'student' : 'full';
  const planLabel = membershipType === 'student' ? 'Student' : 'Full / Role';
  const promoCode = String(row.promoCode || '').trim();

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Stack spacing={2} direction="row" alignItems="center">
            <Avatar alt={name} src={row.avatarUrl || undefined}>
              {name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('') || '?'}
            </Avatar>

            <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start', minWidth: 0 }}>
              <Link
                component={RouterLink}
                href={paths.admin.international.users.details(row.id)}
                color="inherit"
                sx={{ cursor: 'pointer', fontWeight: 600 }}
              >
                {name}
              </Link>
              <MetaLine label="Username" value={row.username} />
              <MetaLine label="Email" value={row.email} />
              {row.company ? <MetaLine label="Company" value={row.company} /> : null}
              {row.countryOfResidence ? (
                <MetaLine label="Country" value={row.countryOfResidence} />
              ) : null}
            </Stack>
          </Stack>
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={isOAuth ? 'info' : 'default'}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
          >
            <Iconify
              icon={isOAuth ? 'solar:shield-keyhole-bold' : 'solar:user-rounded-bold'}
              width={16}
            />
            {isOAuth ? 'OAuth' : 'Local'}
          </Label>
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={membershipType === 'student' ? 'info' : 'secondary'}
          >
            {planLabel}
          </Label>
        </TableCell>

        <TableCell>
          {promoCode ? (
            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
              {promoCode}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              —
            </Typography>
          )}
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={
              (paymentStatus === 'paid' && 'success') ||
              (paymentStatus === 'pending' && 'warning') ||
              (paymentStatus === 'failed' && 'error') ||
              'default'
            }
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
          >
            <Iconify
              icon={
                paymentStatus === 'paid'
                  ? 'solar:verified-check-bold'
                  : paymentStatus === 'failed'
                    ? 'solar:close-circle-bold'
                    : 'solar:card-bold'
              }
              width={16}
            />
            {row.paymentStatus || '—'}
          </Label>
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={
              (accountStatus === 'active' && 'success') ||
              (accountStatus === 'banned' && 'error') ||
              (accountStatus === 'pending_payment' && 'warning') ||
              'default'
            }
          >
            {row.status || '—'}
          </Label>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Typography variant="body2">{dateText}</Typography>
          {timeText ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {timeText}
            </Typography>
          ) : null}
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
              onDeleteRow();
              popover.onClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}
