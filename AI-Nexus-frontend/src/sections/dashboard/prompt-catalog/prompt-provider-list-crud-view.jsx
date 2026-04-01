import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CustomPopover, usePopover } from 'src/components/custom-popover';
import { TableHeadCustom, TableNoData, TablePaginationCustom, useTable, rowInPage } from 'src/components/table';
import { promptCatalogService } from 'src/services/prompt-catalog.service';

const TABLE_HEAD = [
  { id: 'provider', label: 'Provider', width: 120 },
  { id: 'title', label: 'Title', minWidth: 180 },
  { id: 'color', label: 'Color', width: 90 },
  { id: 'bgColor', label: 'BG Color', width: 90 },
  { id: 'icon', label: 'Icon', width: 90 },
  { id: 'redirectUrl', label: 'Redirect URL', minWidth: 220 },
  { id: 'detailTitle', label: 'Detail Title', minWidth: 180 },
  { id: 'action', label: 'Action', width: 88 },
];

export function PromptProviderListView() {
  const table = useTable();
  const router = useRouter();
  const popover = usePopover();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await promptCatalogService.getAdminProviderProfiles();
      setRows(data);
    } catch (error) {
      toast.error(error?.message || 'Failed to load provider profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) =>
      [p.provider, p.title, p.color, p.bgColor, p.icon, p.redirectUrl, p.detailTitle]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const pagedRows = rowInPage(filteredRows, table.page, table.rowsPerPage);

  const deleteRow = async (id) => {
    try {
      setDeletingId(id);
      await promptCatalogService.deleteProviderProfile(id);
      toast.success('Provider deleted');
      await loadRows();
    } catch (error) {
      toast.error(error?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Provider Profiles"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: 'Provider' },
        ]}
        action={
          <Button component={RouterLink} href={paths.admin.promptCatalog.providerNew} variant="contained" startIcon={<Iconify icon="mingcute:add-line" />}>
            Create Provider
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="flex-end">
            <TextField
              size="small"
              placeholder="Search provider, title, icon..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                table.onResetPage();
              }}
              sx={{ width: { xs: '100%', md: 360 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Box>

        <Scrollbar>
          <Table sx={{ minWidth: 960 }}>
            <TableHeadCustom headLabel={TABLE_HEAD} />
            <TableBody>
              {pagedRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.provider}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: 0.75,
                        border: '1px solid',
                        borderColor: 'divider',
                        background: row.color || '#10a37f',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: 0.75,
                        border: '1px solid',
                        borderColor: 'divider',
                        background: row.bgColor || row.color || '#10a37f',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Iconify icon={row.icon || 'solar:chat-round-dots-bold-duotone'} width={20} />
                  </TableCell>
                  <TableCell>{row.redirectUrl || '-'}</TableCell>
                  <TableCell>{row.detailTitle}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color={popover.open && selectedRow?.id === row.id ? 'inherit' : 'default'}
                      onClick={(e) => {
                        setSelectedRow(row);
                        popover.onOpen(e);
                      }}
                    >
                      <Iconify icon="eva:more-vertical-fill" />
                    </IconButton>
                    {deletingId === row.id ? <LoadingButton size="small" loading sx={{ ml: 0.5 }} /> : null}
                  </TableCell>
                </TableRow>
              ))}
              <TableNoData notFound={!filteredRows.length} />
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          page={table.page}
          count={filteredRows.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          dense={table.dense}
          onChangeDense={table.onChangeDense}
        />
      </Card>

      <CustomPopover open={popover.open} anchorEl={popover.anchorEl} onClose={popover.onClose} slotProps={{ arrow: { placement: 'right-top' } }}>
        <MenuList>
          <MenuItem
            onClick={() => {
              if (selectedRow?.id) router.push(paths.admin.promptCatalog.providerDetails(selectedRow.id));
              popover.onClose();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedRow?.id) router.push(paths.admin.promptCatalog.providerEdit(selectedRow.id));
              popover.onClose();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>
          <MenuItem
            sx={{ color: 'error.main' }}
            onClick={() => {
              setDeleteConfirmOpen(true);
              popover.onClose();
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => !deletingId && setDeleteConfirmOpen(false)}
        title="Delete Provider"
        content="Are you sure want to delete?"
        action={
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!selectedRow?.id) return;
              await deleteRow(selectedRow.id);
              setDeleteConfirmOpen(false);
            }}
          >
            Delete
          </Button>
        }
      />
    </DashboardContent>
  );
}

