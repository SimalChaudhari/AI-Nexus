import { useState, useCallback, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';
import { useSetState } from 'src/hooks/use-set-state';

import { fIsAfter, fIsBetween } from 'src/utils/format-time';

import { varAlpha } from 'src/theme/styles';
import { DashboardContent } from 'src/layouts/dashboard';
import { ORDER_STATUS_OPTIONS } from 'src/_mock';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import {
  getOrders,
  deleteOrderById,
  deleteOrdersByIds,
  downloadOrderReceiptPdf,
} from 'src/services/order.service';
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
} from 'src/components/table';

import { OrderTableRow } from '../order-table-row';
import { OrderTableToolbar } from '../order-table-toolbar';
import { OrderTableFiltersResult } from '../order-table-filters-result';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [{ value: 'all', label: 'All' }, ...ORDER_STATUS_OPTIONS];

const TABLE_HEAD = [
  { id: 'orderNumber', label: 'Order', width: 88 },
  { id: 'name', label: 'Customer' },
  { id: 'createdAt', label: 'Date', width: 140 },
  {
    id: 'totalQuantity',
    label: 'Items',
    width: 120,
    align: 'center',
  },
  { id: 'totalAmount', label: 'Price', width: 140 },
  { id: 'status', label: 'Status', width: 110 },
  { id: '', width: 88 },
];

// ----------------------------------------------------------------------

function mapOrderToRow(apiOrder) {
  const items = apiOrder.items || [];
  const totalQuantity = items.length
    ? items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)
    : (apiOrder.courseIds || []).length;
  return {
    id: apiOrder.id,
    orderNumber: apiOrder.orderNumber || `#${(apiOrder.id || '').slice(0, 8)}`,
    customer: {
      name: apiOrder.user?.name ?? '—',
      email: apiOrder.user?.email ?? '—',
      avatarUrl: apiOrder.user?.avatarUrl ?? null,
    },
    createdAt: apiOrder.createdAtMs || apiOrder.createdAtUtc || apiOrder.createdAt,
    totalQuantity,
    subtotal: Number(apiOrder.totalAmount) || 0,
    totalAmount: Number(apiOrder.totalAmount) || 0,
    currency: apiOrder.currency || 'SGD',
    status: apiOrder.status || 'completed',
    items: items.length
      ? items.map((i, idx) => ({
          id: i.id || `item-${idx}`,
          name: i.name || 'Course',
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1,
          sku: i.id,
          coverUrl: null,
        }))
      : (apiOrder.courseIds || []).map((cid, idx) => ({
          id: cid,
          name: 'Course',
          price: 0,
          quantity: 1,
          sku: cid,
          coverUrl: null,
        })),
  };
}

export function OrderListView() {
  const table = useTable({ defaultOrderBy: 'orderNumber' });

  const router = useRouter();

  const confirm = useBoolean();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getOrders()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setTableData(list.map(mapOrderToRow));
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          toast.error(err?.response?.data?.message || err?.message || 'Failed to load orders');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filters = useSetState({
    name: '',
    status: 'all',
    startDate: null,
    endDate: null,
  });

  const dateError = fIsAfter(filters.state.startDate, filters.state.endDate);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: filters.state,
    dateError,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset =
    !!filters.state.name ||
    filters.state.status !== 'all' ||
    (!!filters.state.startDate && !!filters.state.endDate);

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await deleteOrderById(id);
        const deleteRow = tableData.filter((row) => row.id !== id);
        setTableData(deleteRow);
        toast.success('Delete success!');
        table.onUpdatePageDeleteRow(dataInPage.length);
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || err?.message || 'Failed to delete order');
      }
    },
    [dataInPage.length, table, tableData]
  );

  const handleDeleteRows = useCallback(() => {
    const run = async () => {
      try {
        await deleteOrdersByIds(table.selected);
        const deleteRows = tableData.filter((row) => !table.selected.includes(row.id));
        setTableData(deleteRows);
        toast.success('Delete success!');
        table.onUpdatePageDeleteRows({
          totalRowsInPage: dataInPage.length,
          totalRowsFiltered: dataFiltered.length,
        });
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || err?.message || 'Failed to delete orders');
      }
    };
    run();
  }, [dataFiltered.length, dataInPage.length, table, tableData]);

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.admin.order.details(id));
    },
    [router]
  );

  const handleDownloadReceipt = useCallback(async (row) => {
    try {
      const blob = await downloadOrderReceiptPdf(row.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${String(row.orderNumber || row.id).replace('#', '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to download receipt');
    }
  }, []);

  const handleFilterStatus = useCallback(
    (event, newValue) => {
      table.onResetPage();
      filters.setState({ status: newValue });
    },
    [filters, table]
  );

  if (loading) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs heading="Orders" links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Order', href: paths.admin.order.root }, { name: 'List' }]} sx={{ mb: { xs: 3, md: 5 } }} />
        <Card>
          <Scrollbar sx={{ minHeight: 444 }}>
            <Table sx={{ minWidth: 960 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} />
              <TableBody>
                {[...Array(6)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell padding="checkbox">
                      <Skeleton variant="rounded" width={20} height={20} />
                    </TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={220} /></TableCell>
                    <TableCell><Skeleton width={130} /></TableCell>
                    <TableCell align="center"><Skeleton width={30} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell><Skeleton width={90} /></TableCell>
                    <TableCell><Skeleton width={70} /></TableCell>
                    <TableCell align="right"><Skeleton width={24} sx={{ ml: 'auto' }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>
        </Card>
      </DashboardContent>
    );
  }

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Orders"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Order', href: paths.admin.order.root },
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
                      (tab.value === 'completed' && 'success') ||
                      (tab.value === 'pending' && 'warning') ||
                      (tab.value === 'cancelled' && 'error') ||
                      'default'
                    }
                  >
                    {['completed', 'pending', 'cancelled', 'refunded'].includes(tab.value)
                      ? tableData.filter((row) => row.status === tab.value).length
                      : tableData.length}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <OrderTableToolbar
            filters={filters}
            onResetPage={table.onResetPage}
            dateError={dateError}
          />

          {canReset && (
            <OrderTableFiltersResult
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

            <Scrollbar sx={{ minHeight: 444 }}>
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
                  {dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => (
                      <OrderTableRow
                        key={row.id}
                        row={row}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        onViewRow={() => handleViewRow(row.id)}
                        onDownloadReceipt={() => handleDownloadReceipt(row)}
                      />
                    ))}

                  <TableEmptyRows
                    height={table.dense ? 56 : 56 + 20}
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
            count={dataFiltered.length}
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

function applyFilter({ inputData, comparator, filters, dateError }) {
  const { status, name, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter(
      (order) =>
        order.orderNumber.toLowerCase().indexOf(name.toLowerCase()) !== -1 ||
        order.customer.name.toLowerCase().indexOf(name.toLowerCase()) !== -1 ||
        order.customer.email.toLowerCase().indexOf(name.toLowerCase()) !== -1
    );
  }

  if (status !== 'all') {
    inputData = inputData.filter((order) => order.status === status);
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((order) => fIsBetween(order.createdAt, startDate, endDate));
    }
  }

  return inputData;
}
