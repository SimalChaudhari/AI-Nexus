import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/paths';

import { useBoolean } from 'src/hooks/use-boolean';
import { useDebounce } from 'src/hooks/use-debounce';
import { useSetState } from 'src/hooks/use-set-state';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  rowInPage,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';

import { fDateTime } from 'src/utils/format-time';
import { courseService } from 'src/services/course.service';
import { CourseCertificatesTableToolbar } from '../course-certificates-table-toolbar';
import { CourseCertificatesTableFiltersResult } from '../course-certificates-table-filters-result';

const TABLE_HEAD = [
  { id: 'certificateNo', label: 'Certificate No' },
  { id: 'learnerName', label: 'Learner' },
  { id: 'learnerEmail', label: 'Email', width: 240 },
  { id: 'courseTitle', label: 'Course' },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'completedAt', label: 'Completed At', width: 180 },
  { id: 'action', label: 'Action', width: 180 },
];

function applyFilter({ inputData, comparator, filters }) {
  const stabilizedThis = inputData.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  let data = stabilizedThis.map((el) => el[0]);

  const search = String(filters.search || '').trim().toLowerCase();
  if (search) {
    data = data.filter((row) => {
      const hay = [
        row.certificateNo,
        row.learnerName,
        row.learnerEmail,
        row.courseTitle,
      ]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return hay.includes(search);
    });
  }

  const userName = String(filters.userName || '').trim().toLowerCase();
  if (userName) {
    data = data.filter((row) => String(row.learnerName || '').toLowerCase().includes(userName));
  }

  const courseTitle = String(filters.courseTitle || '').trim().toLowerCase();
  if (courseTitle) {
    data = data.filter((row) => String(row.courseTitle || '').toLowerCase().includes(courseTitle));
  }

  return data;
}

export function CourseCertificatesView() {
  const table = useTable({ defaultCurrentPage: 0, defaultRowsPerPage: 10 });
  const filters = useSetState({ search: '', userName: '', courseTitle: '' });
  const confirm = useBoolean();

  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const debouncedSearch = useDebounce(filters.state.search, 500);

  const selectedRowsInPage = useMemo(
    () => rowInPage(tableData, 0, table.rowsPerPage),
    [table.rowsPerPage, tableData]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await courseService.getAdminCertificates({
        page: table.page + 1,
        limit: table.rowsPerPage || 10,
        q: debouncedSearch || undefined,
        userName: filters.state.userName || undefined,
        courseTitle: filters.state.courseTitle || undefined,
      });
      setTableData(result.data || []);
      setPagination(result.pagination || null);
    } catch (error) {
      toast.error(error?.message || 'Failed to load certificates');
      setTableData([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.state.courseTitle, filters.state.userName, table.page, table.rowsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dataFiltered = applyFilter({ inputData: tableData, comparator: getComparator('desc', 'completedAt'), filters: filters.state });

  const dataInPage = dataFiltered;
  const userOptions = useMemo(
    () =>
      [...new Set((tableData || []).map((row) => String(row.learnerName || '').trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [tableData]
  );
  const courseOptions = useMemo(
    () =>
      [...new Set((tableData || []).map((row) => String(row.courseTitle || '').trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [tableData]
  );
  const canReset =
    !!filters.state.search || !!filters.state.userName || !!filters.state.courseTitle;
  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await courseService.deleteAdminCertificate(id);
        toast.success('Certificate deleted');
        await loadData();
        table.onUpdatePageDeleteRow(dataInPage.length || 1);
      } catch (error) {
        toast.error(error?.message || 'Failed to delete certificate');
      }
    },
    [dataInPage.length, loadData, table]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      await Promise.all(table.selected.map((id) => courseService.deleteAdminCertificate(id)));
      toast.success('Certificates deleted');
      table.setSelected([]);
      await loadData();
      table.onUpdatePageDeleteRows({
        totalRowsInPage: selectedRowsInPage.length,
        totalRowsFiltered: dataFiltered.length,
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to delete certificates');
    }
  }, [dataFiltered.length, loadData, selectedRowsInPage.length, table]);

  const handleBlockToggle = useCallback(
    async (row) => {
      try {
        if (row.status === 'blocked') {
          await courseService.unblockAdminCertificate(row.id);
          toast.success('Certificate unblocked');
        } else {
          await courseService.blockAdminCertificate(row.id);
          toast.success('Certificate blocked');
        }
        await loadData();
      } catch (error) {
        toast.error(error?.message || 'Failed to update certificate status');
      }
    },
    [loadData]
  );

  return (
    <>
      <DashboardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: { xs: 2, md: 3 } }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Certificates
            </Typography>
          </Box>
          <Box
            sx={{
              width: { xs: 40, md: 48 },
              height: { xs: 40, md: 48 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1.5,
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            }}
          >
            <Iconify icon="solar:medal-ribbons-star-bold" width={24} sx={{ color: 'common.white' }} />
          </Box>
        </Stack>

        <CustomBreadcrumbs
          heading=""
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Course', href: paths.admin.course.list },
            { name: 'Certificates' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <CourseCertificatesTableToolbar
            filters={filters}
            onResetPage={table.onResetPage}
            userOptions={userOptions}
            courseOptions={courseOptions}
          />

          {canReset && (
            <CourseCertificatesTableFiltersResult
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
                  headLabel={TABLE_HEAD}
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
                  {dataInPage.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      selected={table.selected.includes(row.id)}
                      aria-checked={table.selected.includes(row.id)}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={table.selected.includes(row.id)}
                          onClick={() => table.onSelectRow(row.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Iconify
                            icon="solar:medal-ribbons-star-bold"
                            width={22}
                            sx={{ color: 'success.main' }}
                          />
                          <Typography variant="body2">{row.certificateNo || '—'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.learnerName || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Typography variant="body2" noWrap>
                          {row.learnerEmail || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" noWrap>
                          {row.courseTitle || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.status === 'blocked' ? 'Blocked' : 'Active'}
                          color={row.status === 'blocked' ? 'warning' : 'success'}
                          variant="soft"
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {row.completedAt ? fDateTime(row.completedAt) : '—'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ px: 0.5 }}>
                          <Tooltip title={row.status === 'blocked' ? 'Unblock' : 'Block'}>
                            <IconButton
                              color={row.status === 'blocked' ? 'success' : 'warning'}
                              onClick={() => handleBlockToggle(row)}
                            >
                              <Iconify
                                icon={
                                  row.status === 'blocked'
                                    ? 'solar:shield-check-bold'
                                    : 'solar:shield-cross-bold'
                                }
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton color="error" onClick={() => handleDeleteRow(row.id)}>
                              <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableEmptyRows
                    height={table.dense ? 56 : 76}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
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
            rowsPerPageOptions={[5, 10, 20, 30]}
          />
        </Card>
      </DashboardContent>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete Certificates"
        content={
          <>
            Are you sure you want to delete <strong>{table.selected.length}</strong> certificate(s)?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
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
