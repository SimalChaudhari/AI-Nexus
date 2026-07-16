import { useEffect, useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';

import { useDebounce } from 'src/hooks/use-debounce';
import { useAdminTableQueryState } from 'src/hooks/use-admin-table-query-state';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { TableNoData, TableHeadCustom, TablePaginationCustom, TableLoadingOverlay } from 'src/components/table';

import { promptCatalogService } from 'src/services/prompt-catalog.service';
import { htmlToPlain } from '../prompt-table-row';
import { PromptTableToolbar } from '../prompt-table-toolbar';
import { PromptTableFiltersResult } from '../prompt-table-filters-result';
import {
  PROMPT_LIST_DEFAULTS,
  PROMPT_LIST_FILTER_DEFAULTS,
  PROMPT_LIST_QUERY_MAP,
  PROMPT_CATEGORY_TABLE_HEAD,
  PROMPT_PROVIDER_LABEL,
  PROMPT_PROVIDER_LABEL_COLOR,
} from '../constants';

const NONE_PROVIDER = '__none__';

function providerDisplayLabel(providerId) {
  if (providerId === NONE_PROVIDER) {
    return '—';
  }
  return PROMPT_PROVIDER_LABEL[providerId] || String(providerId).toUpperCase();
}

const PROVIDER_ROW_ORDER = ['chatgpt', 'claude', 'gemini'];

function sortProviderIds(ids) {
  return [...ids].sort((a, b) => {
    const ia = PROVIDER_ROW_ORDER.indexOf(a);
    const ib = PROVIDER_ROW_ORDER.indexOf(b);
    if (ia >= 0 || ib >= 0) {
      if (ia < 0) return 1;
      if (ib < 0) return -1;
      return ia - ib;
    }
    return providerDisplayLabel(a).localeCompare(providerDisplayLabel(b));
  });
}

// ----------------------------------------------------------------------

export function PromptListView() {
  const router = useRouter();
  const { table, filters, query } = useAdminTableQueryState({
    defaultPage: PROMPT_LIST_DEFAULTS.page,
    defaultRowsPerPage: PROMPT_LIST_DEFAULTS.rowsPerPage,
    filterDefaults: PROMPT_LIST_FILTER_DEFAULTS,
    queryMap: PROMPT_LIST_QUERY_MAP,
    useTableProps: { defaultOrderBy: 'sectionOrder', defaultOrder: 'asc' },
  });
  const [categoryRows, setCategoryRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const debouncedSearch = useDebounce(filters.state.name, 500);
  const categoryQuery = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      search: debouncedSearch,
    }),
    [debouncedSearch, query.limit, query.page]
  );

  const loadCategories = useCallback(
    async (params = categoryQuery) => {
      try {
        setLoading(true);
        const result = await promptCatalogService.getAdminCategoryGroups(params);
        setCategoryRows(result.data || []);
        setPagination(result.pagination || null);
      } catch (error) {
        toast.error(error?.message || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    },
    [categoryQuery]
  );

  useEffect(() => {
    loadCategories(categoryQuery);
  }, [categoryQuery, loadCategories]);

  const canReset = !!filters.state.name;
  const showTableLoader = loading;
  const notFoundMaster = !loading && !categoryRows.length;

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await promptCatalogService.syncAdminPrompts();
      toast.success(result?.message || 'Prompts synced successfully');
      await loadCategories(categoryQuery);
    } catch (error) {
      toast.error(error?.message || 'Failed to sync prompts');
    } finally {
      setSyncing(false);
    }
  };

  const goToCategoryPrompts = useCallback(
    (cat, sectionLabelPlain) => {
      const qs = new URLSearchParams({ categoryKey: cat.categoryKey });
      if (sectionLabelPlain) {
        qs.set('label', sectionLabelPlain);
      }
      router.push(`${paths.admin.prompt.items}?${qs.toString()}`);
    },
    [router]
  );

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Categories"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Prompts', href: paths.admin.prompt.list },
            { name: 'Categories' },
          ]}
          action={
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => router.push(paths.admin.prompt.new)}
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
              totalResults={pagination?.totalItems || categoryRows.length}
              onResetPage={table.onResetPage}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <Box sx={{ position: 'relative' }}>
            <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Providers & category
              </Typography>
              <Typography variant="caption" color="text.disabled" display="block">
                Five categories per page from the server. Click a row to open prompts for that category.
              </Typography>
            </Box>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 480 }}>
                <TableHeadCustom headLabel={PROMPT_CATEGORY_TABLE_HEAD} rowCount={0} numSelected={0} />
                <TableBody>
                  {categoryRows.map((cat) => {
                    const sectionLabelPlain =
                      htmlToPlain(cat.sampleSectionTitle) ||
                      (cat.categoryKey === '__uncategorized__' ? 'Uncategorized' : cat.categoryKey);
                    const providerIdsSorted = sortProviderIds(
                      Array.isArray(cat.providerIds) && cat.providerIds.length ? cat.providerIds : [NONE_PROVIDER]
                    );
                    return (
                      <TableRow
                        key={cat.categoryKey}
                        hover
                        onClick={() => goToCategoryPrompts(cat, sectionLabelPlain)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            useFlexGap
                            sx={{ flexWrap: 'nowrap', overflowX: 'auto', py: 0.25, maxWidth: 1 }}
                          >
                            {providerIdsSorted.map((providerId) => (
                              <Label
                                key={`${cat.categoryKey}-${providerId}`}
                                variant="soft"
                                color={
                                  providerId === NONE_PROVIDER
                                    ? 'default'
                                    : PROMPT_PROVIDER_LABEL_COLOR[providerId] || 'default'
                                }
                                sx={{ fontWeight: 600, flexShrink: 0 }}
                              >
                                {providerDisplayLabel(providerId)}
                              </Label>
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={sectionLabelPlain}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 480 }}>
                              {sectionLabelPlain}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableNoData notFound={notFoundMaster} />
                </TableBody>
              </Table>
            </Scrollbar>
            {showTableLoader && <TableLoadingOverlay minHeight={220} />}
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={pagination?.totalItems ?? categoryRows.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 30]}
          />
        </Card>
      </DashboardContent>
    </>
  );
}
