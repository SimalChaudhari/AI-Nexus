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

import { useBoolean } from 'src/hooks/use-boolean';
import { useSetState } from 'src/hooks/use-set-state';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { LoadingScreen } from 'src/components/loading-screen';
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
} from 'src/components/table';

import { htmlToPlainText } from 'src/utils/html-plain-text';
import { fetchWorkflows, deleteWorkflow } from 'src/store/slices/workflowSlice';
import { fetchLabels } from 'src/store/slices/labelSlice';
import { fetchTags } from 'src/store/slices/tagSlice';
import { WorkflowTableRow } from '../workflow-table-row';
import { WorkflowTableToolbar } from '../workflow-table-toolbar';
import { WorkflowTableFiltersResult } from '../workflow-table-filters-result';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'title', label: 'Title' },
  { id: 'label', label: 'Label', width: 120 },
  { id: 'tags', label: 'Tags', width: 200 },
  { id: 'action', label: 'Action', width: 88 },
];

// ----------------------------------------------------------------------

export function WorkflowListView() {
  const dispatch = useDispatch();
  const { workflows: tableData, loading } = useSelector((state) => state.workflows);
  const { labels } = useSelector((state) => state.labels);
  const { tags } = useSelector((state) => state.tags);
  const table = useTable();
  const router = useRouter();
  const confirm = useBoolean();

  const filters = useSetState({ name: '', labelIds: [], tagIds: [] });

  // Fetch workflows, labels, and tags from Redux store
  useEffect(() => {
    dispatch(fetchWorkflows());
    dispatch(fetchLabels());
    dispatch(fetchTags());
  }, [dispatch]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: filters.state,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset = !!filters.state.name || (filters.state.labelIds && filters.state.labelIds.length > 0) || (filters.state.tagIds && filters.state.tagIds.length > 0);

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await dispatch(deleteWorkflow(id)).unwrap();
        toast.success('Delete success!');
        table.onUpdatePageDeleteRow(dataInPage.length);
      } catch (error) {
        toast.error(error || 'Failed to delete AI resource');
      }
    },
    [dataInPage.length, dispatch, table]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      const deletePromises = table.selected.map((id) => dispatch(deleteWorkflow(id)).unwrap());
      await Promise.all(deletePromises);
      toast.success('Delete success!');
      table.onUpdatePageDeleteRows({
        totalRowsInPage: dataInPage.length,
        totalRowsFiltered: dataFiltered.length,
      });
    } catch (error) {
      toast.error(error || 'Failed to delete AI resources');
    }
  }, [dataFiltered.length, dataInPage.length, dispatch, table]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.workflow.edit(id));
    },
    [router]
  );

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="AI resources"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'AI Resource', href: paths.admin.workflow.list },
            { name: 'List' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.admin.workflow.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New AI resource
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <WorkflowTableToolbar filters={filters} labels={labels} tags={tags} onResetPage={table.onResetPage} />

          {canReset && (
            <WorkflowTableFiltersResult
              filters={filters}
              labels={labels}
              tags={tags}
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
                  {dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => (
                      <WorkflowTableRow
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

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, filters }) {
  const { name, labelIds, tagIds } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  // Filter by name (title + plain description)
  if (name) {
    const q = name.toLowerCase();
    inputData = inputData.filter((workflow) => {
      const descPlain = htmlToPlainText(workflow.description || '');
      return (
        (workflow.title || '').toLowerCase().indexOf(q) !== -1 ||
        descPlain.toLowerCase().indexOf(q) !== -1
      );
    });
  }

  // Filter by labels
  if (labelIds && labelIds.length > 0) {
    inputData = inputData.filter((workflow) => {
      const workflowLabelId = workflow.label?.id || workflow.labelId;
      return workflowLabelId && labelIds.includes(workflowLabelId);
    });
  }

  // Filter by tags
  if (tagIds && tagIds.length > 0) {
    inputData = inputData.filter((workflow) => {
      const workflowTagIds = workflow.tags?.map((tag) => tag.id) || workflow.tagIds || [];
      return tagIds.some((tagId) => workflowTagIds.includes(tagId));
    });
  }

  return inputData;
}

