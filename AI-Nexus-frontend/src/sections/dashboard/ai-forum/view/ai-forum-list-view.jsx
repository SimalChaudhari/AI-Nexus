import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';

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
import {
  fetchAiForumPosts,
  deleteAiForumPost,
  aiForumPostCreatedFromSocket,
  aiForumPostUpdatedFromSocket,
  aiForumPostDeletedFromSocket,
} from 'src/store/slices/aiForumSlice';
import { aiForumService, transformAiForumPost } from 'src/services/ai-forum.service';
import { useAiForumListSocket } from 'src/hooks/use-ai-forum-list-socket';
import { AiForumTableRow } from '../ai-forum-table-row';
import { AiForumTableToolbar } from '../ai-forum-table-toolbar';
import { AiForumTableFiltersResult } from '../ai-forum-table-filters-result';

const TABLE_HEAD = [
  { id: 'title', label: 'Title' },
  { id: 'viewCount', label: 'Views', width: 120 },
  { id: 'action', label: 'Action', width: 88 },
];

function applyFilter({ inputData, comparator, filters }) {
  const { name } = filters;
  const stabilizedThis = inputData.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  inputData = stabilizedThis.map((el) => el[0]);
  if (name) {
    const q = name.toLowerCase();
    inputData = inputData.filter((post) => {
      const descPlain = htmlToPlainText(post.description || '');
      return post.title?.toLowerCase().indexOf(q) !== -1 || descPlain.toLowerCase().indexOf(q) !== -1;
    });
  }
  return inputData;
}

export function AiForumListView() {
  const dispatch = useDispatch();
  const { posts: tableData, loading } = useSelector((state) => state.aiForum);
  const table = useTable();
  const router = useRouter();
  const confirm = useBoolean();
  const [deleting, setDeleting] = useState(false);
  const filters = useSetState({ name: '' });

  useEffect(() => {
    dispatch(fetchAiForumPosts());
  }, [dispatch]);

  useAiForumListSocket(
    {
      onAiForumPostCreated: (post) => {
        dispatch(aiForumPostCreatedFromSocket(transformAiForumPost(post)));
      },
      onAiForumPostUpdated: (post) => {
        dispatch(aiForumPostUpdatedFromSocket(transformAiForumPost(post)));
      },
      onAiForumPostDeleted: (payload) => {
        dispatch(aiForumPostDeletedFromSocket(payload?.postId));
      },
    },
    { enabled: true }
  );

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: filters.state,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);
  const canReset = !!filters.state.name;
  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await dispatch(deleteAiForumPost(id)).unwrap();
        toast.success('Delete success!');
        table.onUpdatePageDeleteRow(dataInPage.length);
      } catch (error) {
        toast.error(error || 'Failed to delete post');
      }
    },
    [dataInPage.length, dispatch, table]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      setDeleting(true);
      const deletePromises = table.selected.map((id) => dispatch(deleteAiForumPost(id)).unwrap());
      await Promise.all(deletePromises);
      toast.success('Delete success!');
      table.onUpdatePageDeleteRows({
        totalRowsInPage: dataInPage.length,
        totalRowsFiltered: dataFiltered.length,
      });
      confirm.onFalse();
    } catch (error) {
      toast.error(error || 'Failed to delete posts');
    } finally {
      setDeleting(false);
    }
  }, [dataFiltered.length, dataInPage.length, dispatch, table, confirm]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.aiForum.edit(id));
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
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'AI Forum', href: paths.admin.aiForum.list },
            { name: 'List' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.admin.aiForum.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New post
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <AiForumTableToolbar filters={filters} onResetPage={table.onResetPage} />

          {canReset && (
            <AiForumTableFiltersResult
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
                    table.onSelectAllRows(checked, dataFiltered.map((row) => row.id))
                  }
                />

                <TableBody>
                  {dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => (
                      <AiForumTableRow
                        key={row.id}
                        row={row}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        onEditRow={() => handleEditRow(row.id)}
                      />
                    ))}

                  <TableEmptyRows
                    height={table.dense ? 52 : 72}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                  />

                  {notFound && <TableNoData notFound={notFound} />}
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          <TablePaginationCustom
            count={dataFiltered.length}
            page={table.page}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            dense={table.dense}
            onChangeDense={table.onChangeDense}
          />
        </Card>
      </DashboardContent>

      <ConfirmDialog
        open={confirm.value}
        onClose={deleting ? () => {} : confirm.onFalse}
        title="Delete"
        content={
          <>
            Are you sure want to delete <strong> {table.selected.length} </strong> items?
          </>
        }
        action={
          <LoadingButton
            variant="contained"
            color="error"
            onClick={handleDeleteRows}
            loading={deleting}
            startIcon={!deleting ? <Iconify icon="solar:trash-bin-trash-bold" /> : null}
          >
            Delete
          </LoadingButton>
        }
      />
    </>
  );
}


