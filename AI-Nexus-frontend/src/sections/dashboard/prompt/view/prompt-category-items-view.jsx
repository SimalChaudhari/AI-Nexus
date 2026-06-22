import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';

import { useBoolean } from 'src/hooks/use-boolean';
import { useDebounce } from 'src/hooks/use-debounce';
import { useAdminTableQueryState } from 'src/hooks/use-admin-table-query-state';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  emptyRows,
  getComparator,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';

import { promptCatalogService } from 'src/services/prompt-catalog.service';
import { PromptTableRow } from '../prompt-table-row';
import { PromptTableToolbar } from '../prompt-table-toolbar';
import { PromptTableFiltersResult } from '../prompt-table-filters-result';
import {
  PROMPT_LIST_FILTER_DEFAULTS,
  PROMPT_LIST_QUERY_MAP,
  PROMPT_ITEMS_PAGE_DEFAULTS,
  PROMPT_DETAIL_TABLE_HEAD,
  PROMPT_ADMIN_ROW_SORT_IDS,
} from '../constants';

// ----------------------------------------------------------------------

export function PromptCategoryItemsView() {
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const categoryKey = searchParams.get('categoryKey')?.trim() || '';
  const categoryLabel = searchParams.get('label')?.trim() || '';

  const { table, filters, query } = useAdminTableQueryState({
    defaultPage: PROMPT_ITEMS_PAGE_DEFAULTS.page,
    defaultRowsPerPage: PROMPT_ITEMS_PAGE_DEFAULTS.rowsPerPage,
    filterDefaults: PROMPT_LIST_FILTER_DEFAULTS,
    queryMap: PROMPT_LIST_QUERY_MAP,
    useTableProps: { defaultOrderBy: 'sectionOrder', defaultOrder: 'asc' },
  });
  const bulkConfirm = useBoolean();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const debouncedSearch = useDebounce(filters.state.name, 500);

  const promptQueryForFetch = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      search: debouncedSearch,
      categoryKey,
    }),
    [categoryKey, debouncedSearch, query.limit, query.page]
  );

  const loadRows = useCallback(
    async (params = promptQueryForFetch) => {
      if (!params.categoryKey) return;
      try {
        setLoading(true);
        const result = await promptCatalogService.getAdminPromptItems(params);
        setRows(result.data || []);
        setPagination(result.pagination || null);
      } catch (error) {
        toast.error(error?.message || 'Failed to load prompts');
      } finally {
        setLoading(false);
      }
    },
    [promptQueryForFetch]
  );

  useEffect(() => {
    if (!categoryKey) {
      router.replace(paths.admin.prompt.list);
    }
  }, [categoryKey, router]);

  useEffect(() => {
    if (!categoryKey) return;
    loadRows(promptQueryForFetch);
  }, [categoryKey, loadRows, promptQueryForFetch]);

  const dataSorted = useMemo(() => {
    const orderByKey = PROMPT_ADMIN_ROW_SORT_IDS.has(table.orderBy) ? table.orderBy : 'sectionOrder';
    const cmp = getComparator(table.order, orderByKey);
    const tieBreak = (a, b) => {
      const so = (Number(a.sectionOrder) || 0) - (Number(b.sectionOrder) || 0);
      if (so !== 0) return so;
      return (Number(a.itemOrder) || 0) - (Number(b.itemOrder) || 0);
    };
    return [...rows].sort((a, b) => {
      const c = cmp(a, b);
      if (c !== 0) return c;
      return tieBreak(a, b);
    });
  }, [rows, table.order, table.orderBy]);

  const canReset = !!filters.state.name;
  const showTableLoader = loading;
  const notFound = !loading && !dataSorted.length;

  const headingTitle =
    categoryLabel ||
    (categoryKey === '__uncategorized__' ? 'Uncategorized' : categoryKey) ||
    'Prompts';

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await promptCatalogService.syncAdminPrompts();
      toast.success(result?.message || 'Prompts synced successfully');
      await loadRows(promptQueryForFetch);
    } catch (error) {
      toast.error(error?.message || 'Failed to sync prompts');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        await promptCatalogService.deleteAdminPromptItem(id);
        toast.success('Prompt deleted successfully');
        await loadRows(promptQueryForFetch);
      } catch (error) {
        toast.error(error?.message || 'Failed to delete prompt');
      }
    },
    [loadRows, promptQueryForFetch]
  );

  const handleDeleteRows = useCallback(async () => {
    if (!table.selected.length) return;
    try {
      const selectedIds = [...table.selected];
      await Promise.all(selectedIds.map((id) => promptCatalogService.deleteAdminPromptItem(id)));
      toast.success('Delete success!');
      table.setSelected([]);
      await loadRows(promptQueryForFetch);
    } catch (error) {
      toast.error(error?.message || 'Failed to delete prompts');
    }
  }, [loadRows, promptQueryForFetch, table]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.admin.prompt.edit(id));
    },
    [router]
  );

  const onDetailSort = useCallback(
    (id) => {
      if (id === 'action') return;
      table.onSort(id);
    },
    [table]
  );

  if (!categoryKey) {
    return null;
  }

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading={headingTitle}
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Prompts', href: paths.admin.prompt.list },
            { name: 'Categories', href: paths.admin.prompt.list },
            { name: headingTitle },
          ]}
          action={
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => router.push(paths.admin.prompt.list)}
                startIcon={<Iconify icon="eva:arrow-back-fill" />}
              >
                Categories
              </Button>
              <Button
                variant="outlined"
                onClick={() =>
                  router.push(paths.admin.prompt.newInCategory(categoryKey, headingTitle))
                }
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                Add prompt
              </Button>
              <Button
                variant="contained"
                onClick={handleSync}
                disabled={syncing}
                startIcon={
                  syncing ? <CircularProgress size={16} color="inherit" /> : <Iconify icon="solar:restart-bold" />
                }
              >
                Sync Prompts
              </Button>
            </Stack>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <PromptTableToolbar filters={filters} onResetPage={table.onResetPage} />

          {canReset && (
            <PromptTableFiltersResult
              filters={filters}
              totalResults={pagination?.totalItems || dataSorted.length}
              onResetPage={table.onResetPage}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={dataSorted.length}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  dataSorted.map((row) => row.id)
                )
              }
              action={
                <Tooltip title="Delete">
                  <IconButton color="primary" onClick={bulkConfirm.onTrue}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Tooltip>
              }
            />

            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 720 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={PROMPT_DETAIL_TABLE_HEAD}
                  rowCount={dataSorted.length}
                  numSelected={table.selected.length}
                  onSort={onDetailSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      dataSorted.map((row) => row.id)
                    )
                  }
                />
                <TableBody>
                  {dataSorted.map((row) => (
                    <PromptTableRow
                      key={row.id}
                      row={row}
                      hideProviders
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onViewRow={() => router.push(paths.admin.prompt.details(row.id))}
                      onEditRow={() => handleEditRow(row.id)}
                      onDeleteRow={() => handleDeleteRow(row.id)}
                    />
                  ))}
                  <TableEmptyRows
                    height={table.dense ? 56 : 56 + 20}
                    emptyRows={emptyRows(0, table.rowsPerPage, dataSorted.length)}
                  />
                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
            {showTableLoader && <TableLoadingOverlay minHeight={220} />}
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={pagination?.totalItems ?? dataSorted.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 30, 50]}
          />
        </Card>
      </DashboardContent>

      <ConfirmDialog
        open={bulkConfirm.value}
        onClose={bulkConfirm.onFalse}
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
              bulkConfirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}
