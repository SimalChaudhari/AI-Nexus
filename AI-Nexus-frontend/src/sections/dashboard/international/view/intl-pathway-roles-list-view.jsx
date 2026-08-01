import { useCallback, useEffect, useState } from 'react';

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
import { useSetState } from 'src/hooks/use-set-state';

import { varAlpha } from 'src/theme/styles';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';

import { intlPathwayService } from 'src/services/intl-pathway.service';

import { IntlPathwayRoleTableRow } from '../intl-pathway-role-table-row';
import { IntlPathwayRoleTableToolbar } from '../intl-pathway-role-table-toolbar';
import { IntlPathwayRoleTableFiltersResult } from '../intl-pathway-role-table-filters-result';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'deleted', label: 'Deleted' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Role' },
  { id: 'blurb', label: 'Blurb' },
  { id: 'scores', label: 'Modules scored', width: 140 },
  { id: 'deleted', label: 'Status', width: 110 },
  { id: '', label: 'Action', width: 88 },
];

function applyFilter({ inputData, comparator, filters }) {
  const { name, status } = filters;
  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  let result = stabilizedThis.map((el) => el[0]);

  if (name) {
    const q = name.toLowerCase();
    result = result.filter(
      (item) =>
        String(item.name || '')
          .toLowerCase()
          .includes(q) ||
        String(item.blurb || '')
          .toLowerCase()
          .includes(q)
    );
  }

  if (status === 'active') result = result.filter((item) => !item.deleted);
  if (status === 'deleted') result = result.filter((item) => !!item.deleted);

  return result;
}

// ----------------------------------------------------------------------

export function IntlPathwayRolesListView() {
  const router = useRouter();
  const table = useTable({ defaultOrderBy: 'sortOrder' });
  const confirm = useBoolean();
  const filters = useSetState({ name: '', status: 'all' });

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await intlPathwayService.getRoles();
      setTableData(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.message || 'Failed to load pathway roles');
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: filters.state,
  });

  const dataInPage = dataFiltered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const canReset = !!filters.state.name || filters.state.status !== 'all';
  const notFound = (!dataFiltered.length && canReset) || (!loading && !dataFiltered.length);

  const handleFilterStatus = useCallback(
    (_event, newValue) => {
      table.onResetPage();
      filters.setState({ status: newValue });
    },
    [filters, table]
  );

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await intlPathwayService.deleteRole(id);
        toast.success('Delete success!');
        table.onUpdatePageDeleteRow(dataInPage.length);
        await load();
      } catch (error) {
        toast.error(error?.message || 'Failed to delete role');
      }
    },
    [dataInPage.length, load, table]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      await Promise.all(table.selected.map((id) => intlPathwayService.deleteRole(id)));
      toast.success('Delete success!');
      table.onUpdatePageDeleteRows({
        totalRowsInPage: dataInPage.length,
        totalRowsFiltered: dataFiltered.length,
      });
      table.setSelected([]);
      await load();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete roles');
    }
  }, [dataFiltered.length, dataInPage.length, load, table]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.international.roles.edit(id));
    },
    [router]
  );

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.admin.root },
            { name: 'International' },
            { name: 'Pathway roles' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.admin.international.roles.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New role
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
            {STATUS_OPTIONS.map((tab) => (
              <Tab
                key={tab.value}
                iconPosition="end"
                value={tab.value}
                label={tab.label}
                icon={
                  <Label
                    variant={
                      tab.value === 'all' || tab.value === filters.state.status ? 'filled' : 'soft'
                    }
                    color={
                      (tab.value === 'active' && 'success') ||
                      (tab.value === 'deleted' && 'error') ||
                      'default'
                    }
                  >
                    {tab.value === 'all'
                      ? tableData.length
                      : tableData.filter((item) =>
                          tab.value === 'active' ? !item.deleted : !!item.deleted
                        ).length}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <IntlPathwayRoleTableToolbar filters={filters} onResetPage={table.onResetPage} />

          {canReset && (
            <IntlPathwayRoleTableFiltersResult
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
                    <IntlPathwayRoleTableRow
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

            {loading && <TableLoadingOverlay minHeight={220} />}
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
            Are you sure want to delete <strong>{table.selected.length}</strong> items?
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
