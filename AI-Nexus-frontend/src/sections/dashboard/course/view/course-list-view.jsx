import { useCallback, useEffect } from 'react';
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

import { useSetState } from 'src/hooks/use-set-state';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { LoadingScreen } from 'src/components/loading-screen';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  rowInPage,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { htmlToPlainText } from 'src/utils/html-plain-text';
import { fetchCourses, deleteCourse } from 'src/store/slices/courseSlice';
import { CourseTableRow } from '../course-table-row';
import { CourseTableToolbar } from '../course-table-toolbar';
import { CourseTableFiltersResult } from '../course-table-filters-result';

// ----------------------------------------------------------------------

const LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const TABLE_HEAD = [
  { id: 'title', label: 'Course' },
  { id: 'level', label: 'Level', width: 140 },
  { id: 'type', label: 'Type', width: 120 },
  { id: 'isBundle', label: 'Bundle', width: 168 },
  { id: 'action', label: 'Action', width: 88 },
];
const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

function applyFilter({ inputData, comparator, filters }) {
  const { name, level, type } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  let filtered = stabilizedThis.map((el) => el[0]);

  if (name) {
    const q = name.toLowerCase();
    filtered = filtered.filter((course) => {
      const descPlain = htmlToPlainText(course.description || '');
      return course.title.toLowerCase().indexOf(q) !== -1 || descPlain.toLowerCase().indexOf(q) !== -1;
    });
  }

  if (level) {
    filtered = filtered.filter((course) => course.level === level);
  }

  if (type) {
    if (type === 'free') filtered = filtered.filter((course) => !course.freeOrPaid);
    if (type === 'paid') filtered = filtered.filter((course) => !!course.freeOrPaid);
  }

  return filtered;
}

// ----------------------------------------------------------------------

export function CourseListView() {
  const dispatch = useDispatch();
  const { courses: tableData, loading, deleting, pagination } = useSelector((state) => state.courses);
  const table = useTable({ defaultRowsPerPage: 10 });
  const router = useRouter();

  const filters = useSetState({ name: '', level: '', type: '' });

  useEffect(() => {
    const normalizedLevel = filters.state.level ? filters.state.level.toLowerCase() : '';
    const group =
      normalizedLevel === 'beginner'
        ? 'basic'
        : normalizedLevel === 'advanced'
          ? 'advance'
          : normalizedLevel || undefined;

    const query = {
      page: table.page + 1,
      limit: table.rowsPerPage,
      group,
      search: filters.state.name || undefined,
      freeOrPaid:
        filters.state.type === 'free'
          ? false
          : filters.state.type === 'paid'
            ? true
            : undefined,
    };
    dispatch(fetchCourses(query));
  }, [dispatch, table.page, table.rowsPerPage, filters.state.level, filters.state.name, filters.state.type]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: filters.state,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset =
    !!filters.state.name ||
    !!filters.state.level ||
    !!filters.state.type;

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        const normalizedLevel = filters.state.level ? filters.state.level.toLowerCase() : '';
        const group =
          normalizedLevel === 'beginner'
            ? 'basic'
            : normalizedLevel === 'advanced'
              ? 'advance'
              : normalizedLevel || undefined;

        await dispatch(deleteCourse(id)).unwrap();
        toast.success('Delete success!');
        dispatch(fetchCourses({
          page: table.page + 1,
          limit: table.rowsPerPage,
          group,
          search: filters.state.name || undefined,
          freeOrPaid:
            filters.state.type === 'free'
              ? false
              : filters.state.type === 'paid'
                ? true
                : undefined,
        }));
      } catch (error) {
        toast.error(error || 'Failed to delete course');
      }
    },
    [dispatch, table.page, table.rowsPerPage, filters.state.level, filters.state.name, filters.state.type]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      await Promise.all(table.selected.map((id) => dispatch(deleteCourse(id)).unwrap()));
      toast.success('Deleted successfully');
      table.onUpdatePageDeleteRows({
        totalRowsInPage: dataInPage.length,
        totalRowsFiltered: dataFiltered.length,
      });
    } catch (error) {
      toast.error(error || 'Failed to delete');
    }
  }, [dataFiltered.length, dataInPage.length, dispatch, table]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.course.edit(id));
    },
    [router]
  );

  if (loading) {
    return <LoadingScreen />;
  }

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
            levels: LEVEL_OPTIONS,
            types: TYPE_OPTIONS,
          }}
        />

        {canReset && (
          <CourseTableFiltersResult
            filters={filters}
            totalResults={dataFiltered.length}
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
                <IconButton color="primary" onClick={handleDeleteRows}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            }
          />
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1120 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={TABLE_HEAD}
                rowCount={dataFiltered.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(checked, dataFiltered.map((row) => row.id))
                }
              />
              <TableBody>
                {dataInPage.map((row) => (
                  <CourseTableRow
                    key={row.id}
                    row={row}
                    selected={table.selected.includes(row.id)}
                    onSelectRow={() => table.onSelectRow(row.id)}
                    onDeleteRow={() => handleDeleteRow(row.id)}
                    onEditRow={() => handleEditRow(row.id)}
                  />
                ))}
                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                />
                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
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
    </DashboardContent>
  );
}

