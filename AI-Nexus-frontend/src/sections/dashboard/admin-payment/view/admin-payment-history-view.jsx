import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';

import { paths } from 'src/routes/paths';

import { useDebounce } from 'src/hooks/use-debounce';
import { useSetState } from 'src/hooks/use-set-state';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';
import { getMembershipPaymentHistory } from 'src/services/payment.service';

import { PaymentHistoryTableRow } from '../payment-history-table-row';
import { PaymentHistoryTableToolbar } from '../payment-history-table-toolbar';

const TABLE_HEAD = [
  { id: 'customer', label: 'Customer', width: 180 },
  { id: 'paymentRef', label: 'Payment ref', width: 150 },
  { id: 'status', label: 'Status', width: 100 },
  { id: 'pricing', label: 'Pricing / code', width: 130 },
  { id: 'amount', label: 'Amount', width: 130, align: 'right' },
  { id: 'createdAt', label: 'Created', width: 160 },
  { id: 'updatedAt', label: 'Updated', width: 160 },
  { id: 'paidAt', label: 'Paid', width: 160 },
  { id: 'actions', label: 'Action', width: 88, align: 'right' },
];

export function AdminPaymentHistoryView() {
  const table = useTable({ defaultCurrentPage: 0, defaultRowsPerPage: 10 });
  const filters = useSetState({
    name: '',
    status: 'all',
  });

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const debouncedSearch = useDebounce(filters.state.name, 400);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMembershipPaymentHistory({
        page: table.page + 1,
        limit: table.rowsPerPage,
        search: debouncedSearch.trim() || undefined,
        status: filters.state.status !== 'all' ? filters.state.status : undefined,
      });

      if (Array.isArray(result)) {
        setTableData(result);
        setTotalItems(result.length);
      } else {
        setTableData(Array.isArray(result?.data) ? result.data : []);
        setTotalItems(Number(result?.pagination?.totalItems) || 0);
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to load payment history');
      setTableData([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.state.status, table.page, table.rowsPerPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.state.status]);

  const notFound = !loading && !tableData.length;
  const denseHeight = table.dense ? 56 : 76;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Payment history"
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'Payment', href: paths.admin.payment.root },
          { name: 'History' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <PaymentHistoryTableToolbar filters={filters} onResetPage={table.onResetPage} />

        <Box sx={{ position: 'relative' }}>
          {loading ? <TableLoadingOverlay /> : null}

          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1180 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} rowCount={tableData.length} />

              <TableBody>
                {tableData.map((row) => (
                  <PaymentHistoryTableRow key={row.id} row={row} />
                ))}

                <TableEmptyRows
                  height={denseHeight}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, totalItems)}
                />

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={totalItems}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}
