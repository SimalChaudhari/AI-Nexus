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
import { EmptyContent } from 'src/components/empty-content';
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

import { fetchCoursesList, deleteCourse } from 'src/store/slices/courseSlice';
import { CourseTableRow } from '../course-table-row';
import { CourseTableToolbar } from '../course-table-toolbar';
import { CourseTableFiltersResult } from '../course-table-filters-result';
import {
  COURSE_LEVEL_OPTIONS,
  COURSE_LIST_DEFAULTS,
  COURSE_LIST_FILTER_DEFAULTS,
  COURSE_LIST_QUERY_MAP,
  COURSE_LIST_TABLE_HEAD,
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

export function CourseListView() {
  const dispatch = useDispatch();
  const { courses: tableData, loading, pagination } = useSelector((state) => state.courses);
  const { table, filters, query } = useAdminTableQueryState({
    defaultPage: COURSE_LIST_DEFAULTS.page,
    defaultRowsPerPage: COURSE_LIST_DEFAULTS.rowsPerPage,
    filterDefaults: COURSE_LIST_FILTER_DEFAULTS,
    queryMap: COURSE_LIST_QUERY_MAP,
  });
  const router = useRouter();
  const confirm = useBoolean();
  const group = useMemo(() => {
    const normalizedLevel = query.level ? query.level.toLowerCase().trim() : '';
    const isFoundationLike =
      normalizedLevel.includes('foundation') ||
      normalizedLevel.includes('beginner') ||
      normalizedLevel === 'basic';
    const isWorkflowLike = normalizedLevel.includes('workflow') || normalizedLevel.includes('intermediate');
    const isBuilderLike =
      normalizedLevel.includes('builder') ||
      normalizedLevel.includes('advanced') ||
      normalizedLevel === 'advance';

    return isFoundationLike
      ? 'basic'
      : isBuilderLike
        ? 'advance'
        : isWorkflowLike
          ? 'intermediate'
          : normalizedLevel || undefined;
  }, [query.level]);
  const freeOrPaid = useMemo(
    () =>
      query.type === 'free'
        ? false
        : query.type === 'paid'
          ? true
          : undefined,
    [query.type]
  );
  const debouncedSearch = useDebounce(query.name, 1000);
  const coursesQueryForFetch = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      group,
      freeOrPaid,
      search: debouncedSearch,
    }),
    [debouncedSearch, freeOrPaid, group, query.limit, query.page]
  );

  useEffect(() => {
    dispatch(fetchCoursesList(coursesQueryForFetch));
  }, [dispatch, coursesQueryForFetch]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
  });
  const levelOptions = useMemo(() => {
    const options = [...COURSE_LEVEL_OPTIONS];
    if (filters.state.level && !options.includes(filters.state.level)) {
      options.push(filters.state.level);
    }

    return options;
  }, [filters.state.level]);
  const typeOptions = useMemo(() => {
    const hasFree = (tableData || []).some((course) => !course?.freeOrPaid);
    const hasPaid = (tableData || []).some((course) => Boolean(course?.freeOrPaid));

    const next = [{ value: '', label: 'All' }];
    if (hasFree || filters.state.type === 'free') next.push({ value: 'free', label: 'AI Fluency' });
    if (hasPaid || filters.state.type === 'paid') next.push({ value: 'paid', label: 'Paid' });
    return next;
  }, [filters.state.type, tableData]);

  const canReset =
    !!filters.state.name ||
    !!filters.state.level ||
    !!filters.state.type;

  const notFound = !loading && !dataFiltered.length;

  const { refreshAfterDelete } = useAdminTableDeleteRecovery({
    table,
    fetchAction: fetchCoursesList,
    query: coursesQueryForFetch,
  });

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await dispatch(deleteCourse(id)).unwrap();
        toast.success('Delete success!');
        await refreshAfterDelete();
      } catch (error) {
        toast.error(error || 'Failed to delete course');
      }
    },
    [dispatch, refreshAfterDelete]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      await Promise.all(table.selected.map((id) => dispatch(deleteCourse(id)).unwrap()));
      toast.success('Deleted successfully');
      table.setSelected([]);
      await refreshAfterDelete();
    } catch (error) {
      toast.error(error || 'Failed to delete');
    }
  }, [dispatch, refreshAfterDelete, table]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.course.edit(id));
    },
    [router]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="List"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Course', href: paths.admin.course.list },
          { name: 'List' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.course.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New course
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CourseTableToolbar
          filters={filters}
          onResetPage={table.onResetPage}
          options={{
            levels: levelOptions,
            types: typeOptions,
          }}
        />

        {canReset && (
          <CourseTableFiltersResult
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
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1320 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={COURSE_LIST_TABLE_HEAD}
                rowCount={dataFiltered.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(checked, dataFiltered.map((row) => row.id))
                }
              />
              <TableBody>
                {dataFiltered.map((row) => (
                  <CourseTableRow
                    key={row.id}
                    row={{
                      ...row,
                      categoryTitle: row?.category?.title || '',
                    }}
                    selected={table.selected.includes(row.id)}
                    onSelectRow={() => table.onSelectRow(row.id)}
                    onDeleteRow={() => handleDeleteRow(row.id)}
                    onEditRow={() => handleEditRow(row.id)}
                  />
                ))}
                <TableEmptyRows
                  height={table.dense ? 56 : 76}
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
          count={pagination?.totalItems || dataFiltered.length || 0}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 30]}
        />
      </Card>
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
    </DashboardContent>
  );
}

