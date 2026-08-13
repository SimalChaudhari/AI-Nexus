import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

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
import { userService } from 'src/services/user.service';

import { CorporateMemberTableRow } from '../corporate-member-table-row';
import { CorporateMemberTableToolbar } from '../corporate-member-table-toolbar';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name', label: 'Corporate Member' },
  { id: 'company', label: 'Company Name', width: 200 },
  { id: 'companyCode', label: 'Company Code', width: 160 },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'createdAt', label: 'Registered', width: 140 },
  { id: 'action', label: 'Action', width: 88 },
];

// ----------------------------------------------------------------------

export function CorporateMemberListView() {
  const router = useRouter();
  const table = useTable({ defaultCurrentPage: 0, defaultRowsPerPage: 10 });
  const filters = useSetState({ name: '' });

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const debouncedSearch = useDebounce(filters.state.name, 400);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await userService.getAllUsers({
        page: table.page + 1,
        limit: table.rowsPerPage,
        search: debouncedSearch.trim() || undefined,
        role: 'Corporate',
      });

      if (Array.isArray(result)) {
        setTableData(result);
        setTotalItems(result.length);
      } else {
        setTableData(Array.isArray(result?.data) ? result.data : []);
        setTotalItems(Number(result?.pagination?.totalItems) || 0);
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to load corporate members',
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, table.page, table.rowsPerPage]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const notFound = !loading && !tableData.length;
  const denseHeight = table.dense ? 56 : 76;

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.admin.corporateMember.details(id));
    },
    [router]
  );

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.corporateMember.edit(id));
    },
    [router]
  );

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await userService.deleteUser(id);
        toast.success('Delete success!');
        await loadMembers();
      } catch (err) {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to delete corporate member');
      }
    },
    [loadMembers]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="List"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Corporate Members', href: paths.admin.corporateMember.list },
          { name: 'List' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CorporateMemberTableToolbar filters={filters} onResetPage={table.onResetPage} />

        <Box sx={{ position: 'relative' }}>
          {loading ? <TableLoadingOverlay /> : null}

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
                  <CorporateMemberTableRow
                    key={row.id}
                    row={row}
                    selected={table.selected.includes(row.id)}
                    onSelectRow={() => table.onSelectRow(row.id)}
                    onViewRow={() => handleViewRow(row.id)}
                    onEditRow={() => handleEditRow(row.id)}
                    onDeleteRow={() => handleDeleteRow(row.id)}
                  />
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
