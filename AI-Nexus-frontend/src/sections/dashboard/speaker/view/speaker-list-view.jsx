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

import { fetchSpeakers, deleteSpeaker } from 'src/store/slices/speakerSlice';
import { SpeakerTableRow } from '../speaker-table-row';
import { SpeakerTableToolbar } from '../speaker-table-toolbar';
import { SpeakerTableFiltersResult } from '../speaker-table-filters-result';
import {
  SPEAKER_LIST_DEFAULTS,
  SPEAKER_LIST_FILTER_DEFAULTS,
  SPEAKER_LIST_QUERY_MAP,
  SPEAKER_LIST_TABLE_HEAD,
} from '../constants';

function applyFilter({ inputData, comparator }) {
  const stabilizedThis = inputData.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

export function SpeakerListView() {
  const dispatch = useDispatch();
  const { speakers: tableData, loading, pagination } = useSelector((state) => state.speakers);
  const { table, filters, query } = useAdminTableQueryState({
    defaultPage: SPEAKER_LIST_DEFAULTS.page,
    defaultRowsPerPage: SPEAKER_LIST_DEFAULTS.rowsPerPage,
    filterDefaults: SPEAKER_LIST_FILTER_DEFAULTS,
    queryMap: SPEAKER_LIST_QUERY_MAP,
  });
  const router = useRouter();
  const confirm = useBoolean();

  const speakersQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      search: query.name,
    }),
    [query.limit, query.name, query.page]
  );
  const debouncedSearch = useDebounce(speakersQuery.search, 500);
  const speakersQueryForFetch = useMemo(
    () => ({
      page: speakersQuery.page,
      limit: speakersQuery.limit,
      search: debouncedSearch,
    }),
    [debouncedSearch, speakersQuery.limit, speakersQuery.page]
  );

  useEffect(() => {
    dispatch(fetchSpeakers(speakersQueryForFetch));
  }, [dispatch, speakersQueryForFetch]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
  });
  const canReset = !!filters.state.name;
  const notFound = !loading && !dataFiltered.length;

  const { refreshAfterDelete } = useAdminTableDeleteRecovery({
    table,
    fetchAction: fetchSpeakers,
    query: speakersQueryForFetch,
  });

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await dispatch(deleteSpeaker(id)).unwrap();
        toast.success('Deleted successfully');
        await refreshAfterDelete();
      } catch (error) {
        toast.error(error || 'Failed to delete');
      }
    },
    [dispatch, refreshAfterDelete]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      await Promise.all(table.selected.map((id) => dispatch(deleteSpeaker(id)).unwrap()));
      toast.success('Deleted successfully');
      table.setSelected([]);
      await refreshAfterDelete();
    } catch (error) {
      toast.error(error || 'Failed to delete');
    }
  }, [dispatch, refreshAfterDelete, table]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.speaker.edit(id));
    },
    [router]
  );

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Speakers"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Speaker', href: paths.admin.speaker.list },
            { name: 'List' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.admin.speaker.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New speaker
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Card>
          <SpeakerTableToolbar filters={filters} onResetPage={table.onResetPage} />
          {canReset && (
            <SpeakerTableFiltersResult
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
                table.onSelectAllRows(checked, dataFiltered.map((row) => row.id))
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
                  headLabel={SPEAKER_LIST_TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(checked, dataFiltered.map((row) => row.id))
                  }
                />
                <TableBody>
                  {dataFiltered.map((row) => (
                      <SpeakerTableRow
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
                    emptyRows={emptyRows(0, table.rowsPerPage, dataFiltered.length)}
                  />
                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
            {loading && <TableLoadingOverlay minHeight={220} />}
          </Box>
          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={pagination?.totalItems || dataFiltered.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>
      </DashboardContent>
      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content={
          <>
            Are you sure you want to delete <strong>{table.selected.length}</strong> item(s)?
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
