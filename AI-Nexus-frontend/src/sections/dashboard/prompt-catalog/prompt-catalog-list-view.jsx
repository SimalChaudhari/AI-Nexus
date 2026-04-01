import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { LoadingScreen } from 'src/components/loading-screen';
import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover, usePopover } from 'src/components/custom-popover';
import { TableHeadCustom, TableNoData, TablePaginationCustom, useTable, rowInPage } from 'src/components/table';
import { promptCatalogService } from 'src/services/prompt-catalog.service';

const TABLE_HEAD = [
  { id: 'sno', label: 'S.No', width: 80 },
  { id: 'providers', label: 'Providers', width: 300 },
  { id: 'sectionTitle', label: 'Section', minWidth: 220 },
  { id: 'useCase', label: 'Use Case', minWidth: 240 },
  { id: 'prompt', label: 'Prompt', minWidth: 300 },
  { id: 'isActive', label: 'Active', width: 110 },
  { id: 'action', label: 'Action', width: 88 },
];

const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function PromptCatalogListView() {
  const table = useTable({ defaultOrderBy: 'sectionOrder' });
  const router = useRouter();
  const popover = usePopover();

  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await promptCatalogService.getAdminRows();
      setRows(data);
    } catch (error) {
      toast.error(error?.message || 'Failed to load prompt catalog');
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
    return rows.filter((r) => {
      const providersText = (r.providers || [])
        .map((provider) => provider?.label || provider?.value || '')
        .join(' ');
      return (
        (r.packId || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q) ||
        (r.sectionTitle || '').toLowerCase().includes(q) ||
        (r.useCase || '').toLowerCase().includes(q) ||
        (r.prompt || '').toLowerCase().includes(q) ||
        providersText.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const pagedRows = rowInPage(filteredRows, table.page, table.rowsPerPage);

  const removeRow = async (id) => {
    try {
      setDeletingId(id);
      await promptCatalogService.deleteRow(id);
      toast.success('Row deleted');
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
        heading="Prompt Catalog"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: 'Prompt Catalog' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.promptCatalog.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Create Prompt
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="flex-end">
            <TextField
              size="small"
              placeholder="Search section, use case..."
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
          <Table sx={{ minWidth: 1200 }}>
            <TableHeadCustom headLabel={TABLE_HEAD} />
            <TableBody>
              {pagedRows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Typography variant="body2">{table.page * table.rowsPerPage + index + 1}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                      {(row.providers || []).map((provider) => (
                        <Chip
                          key={`${row.id}-${provider?.value || provider?.label}`}
                          size="small"
                          icon={
                            <Iconify
                              icon={provider?.icon || 'solar:cpu-bolt-bold-duotone'}
                              width={14}
                            />
                          }
                          label={provider?.label || provider?.value || '-'}
                          sx={{
                            bgcolor: provider?.bgColor || 'grey.200',
                            color: provider?.color || 'text.primary',
                            borderColor: provider?.color || 'transparent',
                            '& .MuiChip-icon': {
                              color: provider?.color || 'inherit',
                            },
                          }}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.sectionTitle}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap>
                      {stripHtml(row.useCase)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 340 }}>
                    <Typography variant="body2" noWrap>
                      {stripHtml(row.prompt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select size="small" value={row.isActive ? 'yes' : 'no'} disabled>
                      <MenuItem value="yes">Yes</MenuItem>
                      <MenuItem value="no">No</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
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

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              if (selectedRow?.id) router.push(paths.admin.promptCatalog.details(selectedRow.id));
              popover.onClose();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedRow?.id) router.push(paths.admin.promptCatalog.edit(selectedRow.id));
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
        onClose={() => {
          if (!deletingId) setDeleteConfirmOpen(false);
        }}
        title="Delete Prompt"
        content={
          <>
            Are you sure you want to delete this prompt entry?
            <br />
            <strong>{selectedRow?.sectionTitle || ''}</strong>
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!selectedRow?.id) return;
              await removeRow(selectedRow.id);
              setDeleteConfirmOpen(false);
            }}
            disabled={!!deletingId}
          >
            Delete
          </Button>
        }
      />
    </DashboardContent>
  );
}

