import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
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

import { DashboardContent } from 'src/layouts/dashboard';

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

import { fetchAnnouncements, deleteAnnouncement } from 'src/store/slices/announcementSlice';
import { AnnouncementTableRow } from '../announcement-table-row';
import { AnnouncementTableToolbar } from '../announcement-table-toolbar';
import { AnnouncementTableFiltersResult } from '../announcement-table-filters-result';
import {
  ANNOUNCEMENT_LIST_DEFAULTS,
  ANNOUNCEMENT_LIST_FILTER_DEFAULTS,
  ANNOUNCEMENT_LIST_QUERY_MAP,
  ANNOUNCEMENT_LIST_TABLE_HEAD,
} from '../constants';

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator }) {

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  return stabilizedThis.map((el) => el[0]);
}

// ----------------------------------------------------------------------

export function AnnouncementListView() {
  const dispatch = useDispatch();
  const { announcements: tableData, loading, pagination } = useSelector((state) => state.announcements);
  const { table, filters, query } = useAdminTableQueryState({
    defaultPage: ANNOUNCEMENT_LIST_DEFAULTS.page,
    defaultRowsPerPage: ANNOUNCEMENT_LIST_DEFAULTS.rowsPerPage,
    filterDefaults: ANNOUNCEMENT_LIST_FILTER_DEFAULTS,
    queryMap: ANNOUNCEMENT_LIST_QUERY_MAP,
  });
  const router = useRouter();
  const confirm = useBoolean();
  const announcementsQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      search: query.name,
    }),
    [query.limit, query.name, query.page]
  );
  const debouncedSearch = useDebounce(announcementsQuery.search, 500);
  const announcementsQueryForFetch = useMemo(
    () => ({
      page: announcementsQuery.page,
      limit: announcementsQuery.limit,
      search: debouncedSearch,
    }),
    [announcementsQuery.limit, announcementsQuery.page, debouncedSearch]
  );

  useEffect(() => {
    dispatch(fetchAnnouncements(announcementsQueryForFetch));
  }, [announcementsQueryForFetch, dispatch]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
  });

  const canReset = !!filters.state.name;

  const notFound = !loading && !dataFiltered.length;

  const { refreshAfterDelete } = useAdminTableDeleteRecovery({
    table,
    fetchAction: fetchAnnouncements,
    query: announcementsQueryForFetch,
  });

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await dispatch(deleteAnnouncement(id)).unwrap();
        toast.success('Delete success!');
        await refreshAfterDelete();
      } catch (error) {
        toast.error(error || 'Failed to delete announcement');
      }
    },
    [dispatch, refreshAfterDelete]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      const deletePromises = table.selected.map((id) => dispatch(deleteAnnouncement(id)).unwrap());
      await Promise.all(deletePromises);
      toast.success('Delete success!');
      table.setSelected([]);
      await refreshAfterDelete();
      confirm.onFalse();
    } catch (error) {
      toast.error(error || 'Failed to delete announcements');
    }
  }, [confirm, dispatch, refreshAfterDelete, table]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.announcement.edit(id));
    },
    [router]
  );

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Announcement', href: paths.admin.announcement.list },
            { name: 'List' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.admin.announcement.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New announcement
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <AnnouncementTableToolbar filters={filters} onResetPage={table.onResetPage} />

          {canReset && (
            <AnnouncementTableFiltersResult
              filters={filters}
              totalResults={pagination?.totalItems || dataFiltered.length}
              onResetPage={table.onResetPage}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={dataFiltered.length}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  dataFiltered.map((row) => row.id)
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
                  headLabel={ANNOUNCEMENT_LIST_TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      dataFiltered.map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {dataFiltered.map((row) => (
                      <AnnouncementTableRow
                        key={row.id}
                        row={row}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        onEditRow={() => handleEditRow(row.id)}
                      />
                    ))}

                  <TableEmptyRows
                    height={table.dense ? 52 : 72}
                    emptyRows={emptyRows(0, table.rowsPerPage, dataFiltered.length)}
                  />

                  {notFound && <TableNoData notFound={notFound} />}
                </TableBody>
              </Table>
            </Scrollbar>
            {loading && <TableLoadingOverlay minHeight={220} />}
          </Box>

          <TablePaginationCustom
            count={pagination?.totalItems || dataFiltered.length}
            page={table.page}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            dense={table.dense}
            onChangeDense={table.onChangeDense}
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
