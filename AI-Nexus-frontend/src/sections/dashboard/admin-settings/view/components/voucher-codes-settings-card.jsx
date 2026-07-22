import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { alpha } from '@mui/material/styles';
import dayjs from 'dayjs';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import {
  createVoucherCode,
  deleteVoucherCode,
  listVoucherCodes,
  updateVoucherCode,
} from 'src/services/affiliate.service';

const FIXED_REFERRAL_PATH = '/auth/sign-up?membershipOutcome=paid-signup&ref=';

const EMPTY_FORM = {
  code: '',
  label: '',
  isActive: true,
  maxRedemptions: '',
  expiresAt: null,
};

function formatExpireDate(value) {
  if (!value) return 'No expiry';
  const date = dayjs(value);
  return date.isValid() ? date.format('DD MMM YYYY') : '—';
}

function formatUserLimit(row) {
  const used = Number(row.redemptionCount) || 0;
  if (row.maxRedemptions == null || row.maxRedemptions === '') {
    return `${used} / Unlimited`;
  }
  return `${used} / ${row.maxRedemptions}`;
}

function isExpiredRow(row) {
  if (!row?.expiresAt) return false;
  return dayjs(row.expiresAt).isBefore(dayjs());
}

function resolveWebsiteBaseUrl(configured) {
  const fromSettings = String(configured || '').trim().replace(/\/$/, '');
  if (fromSettings) return fromSettings;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).replace(/\/$/, '');
  }
  return '';
}

function buildFullReferralLink(websiteBaseUrl, code) {
  const base = resolveWebsiteBaseUrl(websiteBaseUrl);
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return '';
  if (!base) return `${FIXED_REFERRAL_PATH}${normalizedCode}`;
  return `${base}${FIXED_REFERRAL_PATH}${normalizedCode}`;
}

export function VoucherCodesSettingsCard({ websiteBaseUrl = '' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listVoucherCodes();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.message || 'Could not load promo codes');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [rows]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      code: String(row.code || '').toUpperCase(),
      label: row.label || '',
      isActive: row.isActive !== false,
      maxRedemptions:
        row.maxRedemptions != null && row.maxRedemptions !== ''
          ? String(row.maxRedemptions)
          : '',
      expiresAt: row.expiresAt ? dayjs(row.expiresAt) : null,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    const code = String(form.code || '').trim().toUpperCase();
    if (!code) {
      toast.error('Promo code is required');
      return;
    }
    if (!/^[A-Z0-9_-]{2,64}$/.test(code)) {
      toast.error('Code may only use letters, numbers, underscore or hyphen (2–64 chars)');
      return;
    }

    setSaving(true);
    try {
      const maxRaw = String(form.maxRedemptions ?? '').trim();
      let maxRedemptions = null;
      if (maxRaw) {
        const parsed = Number(maxRaw);
        if (!Number.isInteger(parsed) || parsed < 1) {
          toast.error('User limit must be a whole number of at least 1, or leave blank for unlimited');
          setSaving(false);
          return;
        }
        maxRedemptions = parsed;
      }

      let expiresAt = null;
      if (form.expiresAt) {
        const date = dayjs(form.expiresAt);
        if (!date.isValid()) {
          toast.error('Expire date is invalid');
          setSaving(false);
          return;
        }
        expiresAt = date.endOf('day').toISOString();
      }

      const payload = {
        code,
        label: String(form.label || '').trim() || undefined,
        isActive: form.isActive !== false,
        maxRedemptions,
        expiresAt,
      };
      if (editingId) {
        await updateVoucherCode(editingId, payload);
        toast.success('Promo code updated');
      } else {
        await createVoucherCode(payload);
        toast.success('Promo code created');
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadRows();
    } catch (error) {
      toast.error(error?.message || 'Could not save promo code');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteVoucherCode(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.code}`);
      setDeleteTarget(null);
      await loadRows();
    } catch (error) {
      toast.error(error?.message || 'Could not delete promo code');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = async (code) => {
    const link = buildFullReferralLink(websiteBaseUrl, code);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Full link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6">Promo voucher codes</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Managed in the <strong>voucher_codes</strong> table. Create, edit, or delete codes here.
              Each row includes the paid membership signup link.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
            onClick={openCreate}
            sx={{ flexShrink: 0 }}
          >
            Add code
          </Button>
        </Stack>

        <Divider />

        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Stack>
        ) : sortedRows.length === 0 ? (
          <Box
            sx={(theme) => ({
              py: 4,
              px: 2,
              textAlign: 'center',
              borderRadius: 2,
              border: `1px dashed ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.grey[500], 0.04),
            })}
          >
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              No promo codes yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a code to save it in the database and generate a shareable signup link.
            </Typography>
          </Box>
        ) : (
          <TableContainer
            sx={(theme) => ({
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            })}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell>User limit</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Signup link</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRows.map((row) => {
                  const link = buildFullReferralLink(websiteBaseUrl, row.code);
                  const expired = isExpiredRow(row);
                  const limitReached =
                    row.maxRedemptions != null
                    && Number(row.redemptionCount || 0) >= Number(row.maxRedemptions);
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {row.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {row.label || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatUserLimit(row)}
                        </Typography>
                        {limitReached ? (
                          <Typography variant="caption" color="warning.main">
                            Limit reached
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={expired ? 'error.main' : 'text.secondary'}
                        >
                          {formatExpireDate(row.expiresAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={
                            !row.isActive || expired || limitReached ? 'default' : 'success'
                          }
                          variant="soft"
                          label={
                            expired
                              ? 'Expired'
                              : limitReached
                                ? 'Limit full'
                                : row.isActive
                                  ? 'Active'
                                  : 'Inactive'
                          }
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            title={link}
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            }}
                          >
                            {link}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleCopyLink(row.code)}
                            aria-label={`Copy link for ${row.code}`}
                          >
                            <Iconify icon="solar:copy-bold" width={16} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(row)}
                            aria-label={`Edit ${row.code}`}
                          >
                            <Iconify icon="solar:pen-bold" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(row)}
                            aria-label={`Delete ${row.code}`}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit promo code' : 'Add promo code'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Code"
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
              }
              helperText="Letters, numbers, underscore or hyphen"
              inputProps={{
                style: { letterSpacing: '0.04em', fontWeight: 700 },
              }}
            />
            <TextField
              fullWidth
              label="Label (optional)"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              helperText="Internal note, e.g. Summer partner promo"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="User limit"
                value={form.maxRedemptions}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxRedemptions: event.target.value }))
                }
                helperText="Max users who can use this code. Blank = unlimited."
                inputProps={{ min: 1, step: 1 }}
              />
              <DatePicker
                label="Expire date"
                value={form.expiresAt}
                onChange={(value) => setForm((prev) => ({ ...prev, expiresAt: value }))}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'Leave empty for no expiry.',
                  },
                  field: { clearable: true },
                }}
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive !== false}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
              }
              label="Active"
            />
            {form.code ? (
              <TextField
                fullWidth
                size="small"
                label="Signup link preview"
                value={buildFullReferralLink(websiteBaseUrl, form.code)}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => handleCopyLink(form.code)}
                        aria-label="Copy preview link"
                      >
                        <Iconify icon="solar:copy-bold" width={18} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <LoadingButton variant="contained" loading={saving} onClick={handleSave}>
            {editingId ? 'Save changes' : 'Create code'}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete promo code?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This permanently removes <strong>{deleteTarget?.code}</strong> from{' '}
            <strong>voucher_codes</strong>. Signup links using this code will stop working.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <LoadingButton
            color="error"
            variant="contained"
            loading={deleting}
            onClick={handleConfirmDelete}
          >
            Delete
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
