import { useMemo, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';
import { useDebounce } from 'src/hooks/use-debounce';
import { useAdminTableQueryState } from 'src/hooks/use-admin-table-query-state';
import { useAdminTableDeleteRecovery } from 'src/hooks/use-admin-table-delete-recovery';

import { varAlpha } from 'src/theme/styles';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';

import { fetchUsers, deleteUser } from 'src/store/slices/userSlice';
import { UserTableRow } from '../user-table-row';
import { UserTableToolbar } from '../user-table-toolbar';
import { UserTableFiltersResult } from '../user-table-filters-result';
import {
  USER_LIST_DEFAULTS,
  USER_LIST_FILTER_DEFAULTS,
  USER_LIST_QUERY_MAP,
  USER_LIST_STATUS_OPTIONS,
  USER_LIST_TABLE_HEAD,
} from '../constants';

// ----------------------------------------------------------------------

export function UserListView() {
  const dispatch = useDispatch();
  const { users: tableData, loading, hasFetched, pagination } = useSelector((state) => state.users);
  const { table, filters, query } = useAdminTableQueryState({
    defaultPage: USER_LIST_DEFAULTS.page,
    defaultRowsPerPage: USER_LIST_DEFAULTS.rowsPerPage,
    filterDefaults: USER_LIST_FILTER_DEFAULTS,
    queryMap: USER_LIST_QUERY_MAP,
  });
  const router = useRouter();
  const confirm = useBoolean();

  const usersQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      search: query.name,
      status: query.status,
    }),
    [query.limit, query.name, query.page, query.status]
  );
  const debouncedSearch = useDebounce(usersQuery.search, 500);
  const usersQueryForFetch = useMemo(
    () => ({
      page: usersQuery.page,
      limit: usersQuery.limit,
      status: usersQuery.status,
      search: debouncedSearch,
    }),
    [debouncedSearch, usersQuery.limit, usersQuery.page, usersQuery.status]
  );

  // Fetch users from backend with pagination/filter/search
  useEffect(() => {
    dispatch(fetchUsers(usersQueryForFetch));
  }, [dispatch, usersQueryForFetch]);

  const dataSorted = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
  });

  const canReset = !!filters.state.name || filters.state.status !== 'all';
  const showTableLoader = loading;

  const notFound = !loading && !dataSorted.length;

  const { refreshAfterDelete } = useAdminTableDeleteRecovery({
    table,
    fetchAction: fetchUsers,
    query: usersQueryForFetch,
  });

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await dispatch(deleteUser(id)).unwrap();
        toast.success('Delete success!');
        await refreshAfterDelete();
      } catch (error) {
        toast.error(error || 'Failed to delete user');
      }
    },
    [dispatch, refreshAfterDelete]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      const deletePromises = table.selected.map((id) => dispatch(deleteUser(id)).unwrap());
      await Promise.all(deletePromises);
      toast.success('Delete success!');
      table.setSelected([]);
      await refreshAfterDelete();
    } catch (error) {
      toast.error(error || 'Failed to delete users');
    }
  }, [dispatch, refreshAfterDelete, table]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.user.edit(id));
    },
    [router]
  );

  const handleFilterStatus = useCallback(
    (event, newValue) => {
      table.onResetPage();
      filters.setState({ status: newValue });
    },
    [filters, table]
  );

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'User', href: paths.admin.user.list },
            { name: 'List' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.admin.user.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New user
            </Button>
          }
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
            {USER_LIST_STATUS_OPTIONS.map((tab) => (
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
                      (tab.value === 'Active' && 'success') ||
                      (tab.value === 'Banned' && 'error') ||
                      'default'
                    }
                  >
                    {['Active', 'Banned'].includes(tab.value)
                      ? tableData.filter((user) => user.status === tab.value).length
                      : tableData.length}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <UserTableToolbar
            filters={filters}
            onResetPage={table.onResetPage}
          />

          {canReset && (
            <UserTableFiltersResult
              filters={filters}
              totalResults={pagination?.totalItems || dataSorted.length}
              onResetPage={table.onResetPage}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={dataSorted.length}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  dataSorted.map((row) => row.id)
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
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={USER_LIST_TABLE_HEAD}
                  rowCount={dataSorted.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      dataSorted.map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {dataSorted.map((row) => (
                      <UserTableRow
                        key={row.id}
                        row={row}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        onEditRow={() => handleEditRow(row.id)}
                      />
                    ))}

                  <TableEmptyRows
                    height={table.dense ? 56 : 56 + 20}
                    emptyRows={emptyRows(0, table.rowsPerPage, dataSorted.length)}
                  />

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
            {showTableLoader && (
              <TableLoadingOverlay minHeight={220} />
            )}
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={pagination?.totalItems || dataSorted.length}
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
            onClick={() => {
              handleDeleteRows();
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

function applyFilter({ inputData, comparator }) {
  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  return stabilizedThis.map((el) => el[0]);
}
