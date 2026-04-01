import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import MenuList from '@mui/material/MenuList';

import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { LoadingScreen } from 'src/components/loading-screen';
import { toast } from 'src/components/snackbar';
import { TableHeadCustom, TableNoData, TablePaginationCustom, useTable, rowInPage } from 'src/components/table';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover, usePopover } from 'src/components/custom-popover';
import { promptCatalogService } from 'src/services/prompt-catalog.service';

const PROVIDER_OPTIONS = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
];

const defaultNewRow = {
  providers: ['chatgpt'],
  category: '',
  sectionTitle: '',
  sectionOrder: 0,
  itemOrder: 0,
  useCase: '',
  prompt: '',
  isActive: true,
};

const TABLE_HEAD = [
  { id: 'providers', label: 'Providers', width: 230 },
  { id: 'sectionTitle', label: 'Section', minWidth: 220 },
  { id: 'useCase', label: 'Use Case', minWidth: 240 },
  { id: 'prompt', label: 'Prompt', minWidth: 360 },
  { id: 'isActive', label: 'Active', width: 110 },
  { id: 'action', label: 'Action', width: 120 },
];

export function PromptCatalogAdminView() {
  const table = useTable({ defaultOrderBy: 'sectionOrder' });
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [newRow, setNewRow] = useState(defaultNewRow);
  const popover = usePopover();

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
        (r.category || r.packId || '').toLowerCase().includes(q) ||
        (r.sectionTitle || '').toLowerCase().includes(q) ||
        (r.useCase || '').toLowerCase().includes(q) ||
        (r.prompt || '').toLowerCase().includes(q) ||
        providersText.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const pagedRows = rowInPage(filteredRows, table.page, table.rowsPerPage);

  const saveRow = async (row) => {
    try {
      setSavingId(row.id);
      await promptCatalogService.updateRow(row.id, {
        providers: row.providerValues || (row.providers || []).map((provider) => provider?.value).filter(Boolean),
        category: row.category ?? null,
        sectionTitle: row.sectionTitle,
        sectionOrder: Number(row.sectionOrder || 0),
        itemOrder: Number(row.itemOrder || 0),
        useCase: row.useCase,
        prompt: row.prompt,
        isActive: !!row.isActive,
      });
      toast.success('Row updated');
      await loadRows();
    } catch (error) {
      toast.error(error?.message || 'Update failed');
    } finally {
      setSavingId(null);
    }
  };

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

  const handleOpenEdit = (row) => {
    setSelectedRow({
      ...row,
      providers: row.providerValues || (row.providers || []).map((provider) => provider?.value).filter(Boolean),
    });
    setEditDialogOpen(true);
  };

  const createRow = async () => {
    if (!newRow.sectionTitle || !newRow.useCase || !newRow.prompt) {
      toast.error('Section title, use case and prompt are required');
      return;
    }
    if (!newRow.providers?.length) {
      toast.error('Please select at least one provider');
      return;
    }
    try {
      setCreating(true);
      await promptCatalogService.createRow({
        providers: newRow.providers,
        category: newRow.category?.trim() || null,
        sectionTitle: newRow.sectionTitle,
        sectionOrder: Number(newRow.sectionOrder || 0),
        itemOrder: Number(newRow.itemOrder || 0),
        useCase: newRow.useCase,
        prompt: newRow.prompt,
        isActive: true,
      });
      toast.success('Row created');
      setNewRow(defaultNewRow);
      setCreateDialogOpen(false);
      await loadRows();
    } catch (error) {
      toast.error(error?.message || 'Create failed');
    } finally {
      setCreating(false);
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
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Prompt
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Card>
          <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', md: 'center' }}
              justifyContent="flex-end"
            >
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
                {pagedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ minWidth: 150 }}>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        {(row.providers || []).map((provider) => (
                          <Chip
                            key={`${row.id}-${provider?.value || provider?.label}`}
                            size="small"
                            icon={provider?.icon ? <Iconify icon={provider.icon} width={14} /> : undefined}
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
                    <TableCell sx={{ minWidth: 200 }}>
                      <Typography variant="body2">{row.sectionTitle}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Tooltip title={row.useCase || ''} placement="top-start">
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 220, cursor: 'help' }}
                        >
                          {row.useCase}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ minWidth: 320 }}>
                      <Tooltip title={row.prompt || ''} placement="top-start">
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 340, cursor: 'help' }}
                        >
                          {row.prompt}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ minWidth: 90 }}>
                      <Chip
                        size="small"
                        color={row.isActive ? 'success' : 'default'}
                        label={row.isActive ? 'Yes' : 'No'}
                        variant={row.isActive ? 'soft' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Actions">
                        <IconButton
                          color={popover.open && selectedRow?.id === row.id ? 'inherit' : 'default'}
                          onClick={(e) => {
                            setSelectedRow(row);
                            popover.onOpen(e);
                          }}
                        >
                          <Iconify icon="eva:more-vertical-fill" />
                        </IconButton>
                      </Tooltip>
                      {deletingId === row.id ? (
                        <LoadingButton size="small" loading sx={{ ml: 0.5 }} />
                      ) : null}
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
      </Stack>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              setViewDialogOpen(true);
              popover.onClose();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedRow) handleOpenEdit(selectedRow);
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

      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>View Prompt</DialogTitle>
        <DialogContent>
          {selectedRow ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                {(selectedRow.providers || []).map((provider) => (
                  <Chip
                    key={`view-${selectedRow.id}-${provider?.value || provider}`}
                    size="small"
                    icon={provider?.icon ? <Iconify icon={provider.icon} width={14} /> : undefined}
                    label={provider?.label || provider?.value || provider}
                    variant="outlined"
                  />
                ))}
              </Stack>
              <TextField size="small" label="Category" value={selectedRow.category || selectedRow.packId || ''} InputProps={{ readOnly: true }} />
              <TextField
                size="small"
                label="Section Title"
                value={selectedRow.sectionTitle || ''}
                InputProps={{ readOnly: true }}
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label="Section Order"
                  value={selectedRow.sectionOrder ?? ''}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Item Order"
                  value={selectedRow.itemOrder ?? ''}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
              </Stack>
              <TextField
                size="small"
                label="Active"
                value={selectedRow.isActive ? 'Yes' : 'No'}
                InputProps={{ readOnly: true }}
              />
              <TextField
                size="small"
                label="Use Case"
                value={selectedRow.useCase || ''}
                multiline
                minRows={3}
                InputProps={{ readOnly: true }}
              />
              <TextField
                size="small"
                label="Prompt"
                value={selectedRow.prompt || ''}
                multiline
                minRows={6}
                InputProps={{ readOnly: true }}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => !savingId && setEditDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Edit Prompt</DialogTitle>
        <DialogContent>
          {selectedRow ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Select
                size="small"
                multiple
                value={selectedRow.providers || []}
                onChange={(e) => setSelectedRow((p) => ({ ...p, providers: e.target.value }))}
                renderValue={(selected) =>
                  PROVIDER_OPTIONS.filter((opt) => selected.includes(opt.value))
                    .map((opt) => opt.label)
                    .join(', ')
                }
              >
                {PROVIDER_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label="Category (Optional)"
                  value={selectedRow.category || ''}
                  onChange={(e) => setSelectedRow((p) => ({ ...p, category: e.target.value }))}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Section Title"
                  value={selectedRow.sectionTitle}
                  onChange={(e) => setSelectedRow((p) => ({ ...p, sectionTitle: e.target.value }))}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label="Section Order"
                  type="number"
                  value={selectedRow.sectionOrder}
                  onChange={(e) => setSelectedRow((p) => ({ ...p, sectionOrder: e.target.value }))}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Item Order"
                  type="number"
                  value={selectedRow.itemOrder}
                  onChange={(e) => setSelectedRow((p) => ({ ...p, itemOrder: e.target.value }))}
                  fullWidth
                />
              </Stack>
              <Select
                size="small"
                value={selectedRow.isActive ? 'yes' : 'no'}
                onChange={(e) => setSelectedRow((p) => ({ ...p, isActive: e.target.value === 'yes' }))}
              >
                <MenuItem value="yes">Active</MenuItem>
                <MenuItem value="no">Inactive</MenuItem>
              </Select>
              <TextField
                fullWidth
                size="small"
                label="Use Case"
                value={selectedRow.useCase}
                onChange={(e) => setSelectedRow((p) => ({ ...p, useCase: e.target.value }))}
              />
              <TextField
                fullWidth
                size="small"
                label="Prompt"
                multiline
                minRows={4}
                value={selectedRow.prompt}
                onChange={(e) => setSelectedRow((p) => ({ ...p, prompt: e.target.value }))}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setEditDialogOpen(false)} disabled={!!savingId}>
            Cancel
          </Button>
          <LoadingButton
            loading={!!savingId}
            variant="contained"
            onClick={async () => {
              if (!selectedRow) return;
              await saveRow(selectedRow);
              setEditDialogOpen(false);
            }}
          >
            Save Changes
          </LoadingButton>
        </DialogActions>
      </Dialog>

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
          <LoadingButton
            loading={!!deletingId}
            variant="contained"
            color="error"
            onClick={async () => {
              if (!selectedRow?.id) return;
              await removeRow(selectedRow.id);
              setDeleteConfirmOpen(false);
              setSelectedRow(null);
            }}
          >
            Delete
          </LoadingButton>
        }
      />

      <Dialog open={createDialogOpen} onClose={() => !creating && setCreateDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create Prompt</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Select
              size="small"
              multiple
              value={newRow.providers}
              onChange={(e) => setNewRow((p) => ({ ...p, providers: e.target.value }))}
              renderValue={(selected) =>
                PROVIDER_OPTIONS.filter((opt) => selected.includes(opt.value))
                  .map((opt) => opt.label)
                  .join(', ')
              }
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                label="Category (Optional)"
                value={newRow.category}
                onChange={(e) => setNewRow((p) => ({ ...p, category: e.target.value }))}
                fullWidth
              />
              <TextField
                size="small"
                label="Section Title"
                value={newRow.sectionTitle}
                onChange={(e) => setNewRow((p) => ({ ...p, sectionTitle: e.target.value }))}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                label="Section Order"
                type="number"
                value={newRow.sectionOrder}
                onChange={(e) => setNewRow((p) => ({ ...p, sectionOrder: e.target.value }))}
                fullWidth
              />
              <TextField
                size="small"
                label="Item Order"
                type="number"
                value={newRow.itemOrder}
                onChange={(e) => setNewRow((p) => ({ ...p, itemOrder: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              fullWidth
              size="small"
              label="Use Case"
              value={newRow.useCase}
              onChange={(e) => setNewRow((p) => ({ ...p, useCase: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Prompt"
              multiline
              minRows={4}
              value={newRow.prompt}
              onChange={(e) => setNewRow((p) => ({ ...p, prompt: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <LoadingButton loading={creating} variant="contained" onClick={createRow}>
            Create Prompt
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
