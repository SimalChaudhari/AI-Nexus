import { useCallback, useEffect, useState } from 'react';
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
import { fetchSpeakers, deleteSpeaker } from 'src/store/slices/speakerSlice';
import { getSpeakerReviews } from 'src/services/review.service';
import { SpeakerTableRow } from '../speaker-table-row';
import { SpeakerTableToolbar } from '../speaker-table-toolbar';
import { SpeakerTableFiltersResult } from '../speaker-table-filters-result';

const TABLE_HEAD = [
  { id: 'name', label: 'Name' },
  { id: 'review', label: 'Review', width: 140 },
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
  let result = stabilizedThis.map((el) => el[0]);
  if (name) {
    const q = name.toLowerCase();
    result = result.filter((row) => {
      const aboutPlain = htmlToPlainText(row.about || '');
      return (
        (row.name && row.name.toLowerCase().indexOf(q) !== -1) ||
        aboutPlain.toLowerCase().indexOf(q) !== -1
      );
    });
  }
  return result;
}

export function SpeakerListView() {
  const dispatch = useDispatch();
  const { speakers: tableData, loading } = useSelector((state) => state.speakers);
  const [reviewStats, setReviewStats] = useState({});
  const table = useTable();
  const router = useRouter();
  const confirm = useBoolean();
  const filters = useSetState({ name: '' });

  useEffect(() => {
    dispatch(fetchSpeakers());
  }, [dispatch]);

  useEffect(() => {
    if (!tableData || tableData.length === 0) {
      setReviewStats({});
      return undefined;
    }
    let cancelled = false;
    Promise.all(
      tableData.map(async (speaker) => {
        const reviews = await getSpeakerReviews(speaker.id).catch(() => []);
        const count = Array.isArray(reviews) ? reviews.length : 0;
        const sum = (reviews || []).reduce((acc, r) => acc + Number(r.rating || 0), 0);
        const average = count > 0 ? Math.min(5, Math.max(0, sum / count)) : 0;
        return { id: speaker.id, count, average };
      })
    ).then((results) => {
      if (cancelled) return;
      const next = {};
      results.forEach((r) => {
        next[r.id] = { count: r.count, average: r.average };
      });
      setReviewStats(next);
    });
    return () => { cancelled = true; };
  }, [tableData]);

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
        await dispatch(deleteSpeaker(id)).unwrap();
        toast.success('Deleted successfully');
        table.onUpdatePageDeleteRow(dataInPage.length);
      } catch (error) {
        toast.error(error || 'Failed to delete');
      }
    },
    [dataInPage.length, dispatch, table]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      await Promise.all(table.selected.map((id) => dispatch(deleteSpeaker(id)).unwrap()));
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
      router.push(paths.admin.speaker.edit(id));
    },
    [router]
  );

  if (loading) return <LoadingScreen />;

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Speakers"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Speaker', href: paths.admin.speaker.list },
            { name: 'List' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.admin.speaker.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New speaker
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Card>
          <SpeakerTableToolbar filters={filters} onResetPage={table.onResetPage} />
          {canReset && (
            <SpeakerTableFiltersResult
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
                      <SpeakerTableRow
                        key={row.id}
                        row={row}
                        reviewStat={reviewStats[row.id]}
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
            Are you sure you want to delete <strong>{table.selected.length}</strong> item(s)?
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
