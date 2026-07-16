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
  emptyRows, TableNoData, getComparator, TableEmptyRows, TableHeadCustom,
  TableSelectedAction, TablePaginationCustom, TableLoadingOverlay,
} from 'src/components/table';
import { fetchPrograms, deleteProgram } from 'src/store/slices/programSlice';
import { ProgramTableRow } from '../program-table-row';
import { ProgramTableToolbar } from '../program-table-toolbar';
import { ProgramTableFiltersResult } from '../program-table-filters-result';
import {
  PROGRAM_LIST_DEFAULTS, PROGRAM_LIST_FILTER_DEFAULTS, PROGRAM_LIST_QUERY_MAP, PROGRAM_LIST_TABLE_HEAD,
} from '../constants';

export function ProgramListView() {
  const dispatch = useDispatch();
  const { programs: tableData, loading, pagination } = useSelector((state) => state.programs);
  const { table, filters, query } = useAdminTableQueryState({
    defaultPage: PROGRAM_LIST_DEFAULTS.page,
    defaultRowsPerPage: PROGRAM_LIST_DEFAULTS.rowsPerPage,
    filterDefaults: PROGRAM_LIST_FILTER_DEFAULTS,
    queryMap: PROGRAM_LIST_QUERY_MAP,
  });
  const router = useRouter();
  const confirm = useBoolean();
  const debouncedSearch = useDebounce(query.name, 500);
  const fetchQuery = useMemo(() => ({ page: query.page, limit: query.limit, search: debouncedSearch }), [query.page, query.limit, debouncedSearch]);

  useEffect(() => { dispatch(fetchPrograms(fetchQuery)); }, [dispatch, fetchQuery]);

  const dataFiltered = [...tableData].sort(getComparator(table.order, table.orderBy));
  const notFound = !loading && !dataFiltered.length;
  const { refreshAfterDelete } = useAdminTableDeleteRecovery({ table, fetchAction: fetchPrograms, query: fetchQuery });

  const handleDeleteRow = useCallback(async (id) => {
    try {
      await dispatch(deleteProgram(id)).unwrap();
      toast.success('Deleted');
      await refreshAfterDelete();
    } catch (e) { toast.error(e || 'Delete failed'); }
  }, [dispatch, refreshAfterDelete]);

  const handleDeleteRows = useCallback(async () => {
    try {
      await Promise.all(table.selected.map((id) => dispatch(deleteProgram(id)).unwrap()));
      table.setSelected([]);
      await refreshAfterDelete();
    } catch (e) { toast.error(e || 'Delete failed'); }
  }, [dispatch, refreshAfterDelete, table]);

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Programs"
          links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Course', href: paths.admin.course.list }, { name: 'Program' }]}
          action={<Button component={RouterLink} href={paths.admin.program.new} variant="contained" startIcon={<Iconify icon="mingcute:add-line" />}>New program</Button>}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Card>
          <ProgramTableToolbar filters={filters} onResetPage={table.onResetPage} />
          {filters.state.name && (
            <ProgramTableFiltersResult filters={filters} totalResults={pagination?.totalItems || dataFiltered.length} onResetPage={table.onResetPage} sx={{ px: 2.5, pb: 2 }} />
          )}
          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              numSelected={table.selected.length}
              rowCount={dataFiltered.length}
              onSelectAllRows={(checked) => table.onSelectAllRows(checked, dataFiltered.map((r) => r.id))}
              action={<Tooltip title="Delete"><IconButton onClick={confirm.onTrue}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton></Tooltip>}
            />
            <Scrollbar>
              <Table sx={{ minWidth: 960 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={PROGRAM_LIST_TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) => table.onSelectAllRows(checked, dataFiltered.map((r) => r.id))}
                />
                <TableBody>
                  {dataFiltered.map((row) => (
                    <ProgramTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onDeleteRow={() => handleDeleteRow(row.id)}
                      onEditRow={() => router.push(paths.admin.program.edit(row.id))}
                    />
                  ))}
                  <TableEmptyRows emptyRows={emptyRows(0, table.rowsPerPage, dataFiltered.length)} />
                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
            {loading && <TableLoadingOverlay minHeight={220} />}
          </Box>
          <TablePaginationCustom
            page={table.page}
            count={pagination?.totalItems || dataFiltered.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>
      </DashboardContent>
      <ConfirmDialog open={confirm.value} onClose={confirm.onFalse} title="Delete" content={`Delete ${table.selected.length} programs?`}
        action={<Button color="error" variant="contained" onClick={() => { handleDeleteRows(); confirm.onFalse(); }}>Delete</Button>} />
    </>
  );
}
