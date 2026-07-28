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
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import QRCode from 'qrcode';

import { useDebounce } from 'src/hooks/use-debounce';
import { useSetState } from 'src/hooks/use-set-state';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';
import {
  deleteCompanyEnrollmentInvite,
  listCompanyEnrollmentInvites,
  updateCompanyEnrollmentInvite,
} from 'src/services/company-enrollment.service';

dayjs.extend(duration);

const EMPTY_FORM = {
  companyCode: '',
  label: '',
  isActive: true,
  maxEnrollment: '0',
  qrValidTill: null,
};

function resolveWebsiteBaseUrl(configured) {
  const fromSettings = String(configured || '').trim().replace(/\/$/, '');
  if (fromSettings) return fromSettings;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).replace(/\/$/, '');
  }
  return '';
}

function buildSignupLink(websiteBaseUrl, companyCode) {
  const base = resolveWebsiteBaseUrl(websiteBaseUrl);
  const code = String(companyCode || '').trim().toUpperCase();
  if (!code) return '';
  const path = `/auth/sign-up?membershipOutcome=paid-signup&companyCode=${encodeURIComponent(code)}&viaQr=1`;
  return base ? `${base}${path}` : path;
}

function formatQuota(row) {
  const enrolled = Number(row.enrolledCount) || 0;
  if (!row.maxEnrollment || Number(row.maxEnrollment) <= 0) {
    return `${enrolled} / Unlimited`;
  }
  return `${enrolled} / ${row.maxEnrollment}`;
}

function formatRemaining(row) {
  if (!row.maxEnrollment || Number(row.maxEnrollment) <= 0) return 'Unlimited';
  if (row.remainingSeats == null) {
    return Math.max(0, Number(row.maxEnrollment) - Number(row.enrolledCount || 0));
  }
  return row.remainingSeats;
}

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return useMemo(() => {
    if (!target) {
      return { label: 'No expiry', expired: false, ms: null };
    }
    const end = dayjs(target);
    if (!end.isValid()) {
      return { label: '—', expired: false, ms: null };
    }
    const ms = end.valueOf() - now;
    if (ms <= 0) {
      return { label: 'Expired', expired: true, ms: 0 };
    }
    const d = dayjs.duration(ms);
    const days = Math.floor(d.asDays());
    const hours = d.hours();
    const minutes = d.minutes();
    const seconds = d.seconds();
    if (days > 0) {
      return {
        label: `${days}d ${hours}h ${minutes}m ${seconds}s`,
        expired: false,
        ms,
      };
    }
    return {
      label: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      expired: false,
      ms,
    };
  }, [target, now]);
}

function useQrDataUrl(link) {
  const [dataUrl, setDataUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!link) {
      setDataUrl('');
      return undefined;
    }
    setLoading(true);
    QRCode.toDataURL(link, { width: 240, margin: 1 })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [link]);

  return { dataUrl, loading };
}

function QrPreviewDialog({ open, row, websiteBaseUrl, onClose }) {
  const link = row ? buildSignupLink(websiteBaseUrl, row.companyCode) : '';
  const countdown = useCountdown(row?.qrValidTill);
  const { dataUrl, loading } = useQrDataUrl(link);

  if (!row) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const statusLabel = countdown.expired
    ? 'Expired'
    : row.isActive === false
      ? 'Inactive'
      : 'Active';
  const statusColor = countdown.expired || row.isActive === false ? '#b91c1c' : '#059669';
  const statusBg = countdown.expired || row.isActive === false ? '#fee2e2' : '#dcfce7';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          overflow: 'hidden',
          borderRadius: 2.5,
          boxShadow: '0 22px 56px rgba(6, 24, 51, 0.18)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: 2.5,
          py: 2,
          background: 'linear-gradient(135deg, #061833 0%, #0a397d 55%, #0a6aad 100%)',
          color: '#fff',
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.72)',
                mb: 0.5,
              }}
            >
              Official enrollment QR
            </Typography>
            <Typography variant="h6" noWrap sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              {row.companyCode}
            </Typography>
            {row.label && row.label !== row.companyCode ? (
              <Typography sx={{ mt: 0.35, fontSize: 13, color: 'rgba(215,232,255,0.92)' }} noWrap>
                {row.label}
              </Typography>
            ) : null}
          </Box>
          <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
            <IconButton
              size="small"
              title="Copy link"
              onClick={handleCopyLink}
              sx={{
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.12)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
              }}
            >
              <Iconify icon="solar:copy-bold" width={18} />
            </IconButton>
            <IconButton
              size="small"
              title="Close"
              onClick={onClose}
              sx={{
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.12)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
              }}
            >
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 2.5 }}>
        <Stack spacing={2.25} alignItems="center">
          <Box
            sx={{
              position: 'relative',
              p: 1.5,
              borderRadius: 2,
              bgcolor: '#fff',
              border: '1px solid #dfe7f1',
              boxShadow: '0 10px 28px rgba(6,24,51,0.08)',
              '@keyframes qrPulse': {
                '0%, 100%': { boxShadow: '0 0 0 0 rgba(13, 95, 255, 0.28)' },
                '50%': { boxShadow: '0 0 0 8px rgba(13, 95, 255, 0)' },
              },
              animation: countdown.expired ? 'none' : 'qrPulse 2.4s ease-out infinite',
            }}
          >
            {loading ? (
              <Box sx={{ width: 220, height: 220, display: 'grid', placeItems: 'center' }}>
                <CircularProgress size={28} />
              </Box>
            ) : dataUrl ? (
              <Box
                component="img"
                src={dataUrl}
                alt={`QR for ${row.companyCode}`}
                sx={{ width: 220, height: 220, display: 'block' }}
              />
            ) : (
              <Box sx={{ width: 220, height: 220, display: 'grid', placeItems: 'center' }}>
                <Typography variant="body2" color="error">
                  Could not generate QR
                </Typography>
              </Box>
            )}
          </Box>

          <Chip
            size="small"
            label={statusLabel}
            sx={{
              fontWeight: 700,
              bgcolor: statusBg,
              color: statusColor,
              height: 26,
            }}
          />

          <Box
            sx={{
              width: 1,
              textAlign: 'center',
              py: 1.5,
              px: 2,
              borderRadius: 2,
              bgcolor: '#f4f7fb',
              border: '1px solid #e8eef6',
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#63748a',
              }}
            >
              Valid till
            </Typography>
            <Typography sx={{ mt: 0.5, fontWeight: 700, color: '#102033' }}>
              {row.qrValidTill
                ? dayjs(row.qrValidTill).format('DD MMM YYYY — hh:mm A')
                : 'No expiry'}
            </Typography>
            <Typography
              sx={{
                mt: 0.75,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                color: countdown.expired ? '#dc2626' : '#0d5fff',
              }}
            >
              {countdown.label}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
            }}
          >
            {[
              {
                label: 'Quota',
                value: row.isUnlimited || !row.maxEnrollment ? 'Unlimited' : row.maxEnrollment,
              },
              { label: 'Enrolled', value: Number(row.enrolledCount) || 0 },
              { label: 'Remaining', value: formatRemaining(row) },
            ].map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  textAlign: 'center',
                  py: 1.25,
                  px: 0.75,
                  borderRadius: 1.5,
                  bgcolor: '#fff',
                  border: '1px solid #dfe7f1',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: '#63748a',
                  }}
                >
                  {stat.label}
                </Typography>
                <Typography sx={{ mt: 0.35, fontWeight: 800, color: '#061833', fontSize: 15 }}>
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export function CompanyEnrollmentSettingsCard({ websiteBaseUrl = '' }) {
  const table = useTable({ defaultCurrentPage: 0, defaultRowsPerPage: 10 });
  const filters = useSetState({ search: '' });
  const debouncedSearch = useDebounce(filters.state.search, 400);

  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [qrRow, setQrRow] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCompanyEnrollmentInvites({
        page: table.page + 1,
        limit: table.rowsPerPage,
        search: debouncedSearch.trim() || undefined,
      });
      setRows(Array.isArray(result?.data) ? result.data : []);
      setTotalItems(Number(result?.pagination?.totalItems) || 0);
    } catch (error) {
      toast.error(error?.message || 'Could not load company enrollment invites');
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, table.page, table.rowsPerPage]);

  useEffect(() => {
    loadRows();
    const timer = setInterval(loadRows, 15000);
    return () => clearInterval(timer);
  }, [loadRows]);

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleFilterSearch = useCallback(
    (event) => {
      table.onResetPage();
      filters.setState({ search: event.target.value });
    },
    [filters, table]
  );

  const handleClearSearch = useCallback(() => {
    table.onResetPage();
    filters.setState({ search: '' });
  }, [filters, table]);

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      companyCode: String(row.companyCode || '').toUpperCase(),
      label: row.label || '',
      isActive: row.isActive !== false,
      maxEnrollment:
        row.maxEnrollment != null && row.maxEnrollment !== ''
          ? String(row.maxEnrollment)
          : '0',
      qrValidTill: row.qrValidTill ? dayjs(row.qrValidTill) : null,
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
    if (!editingId) {
      toast.error('Select an existing company QR to edit');
      return;
    }

    setSaving(true);
    try {
      const maxRaw = String(form.maxEnrollment ?? '0').trim();
      const maxEnrollment = maxRaw === '' ? 0 : Number(maxRaw);
      if (!Number.isInteger(maxEnrollment) || maxEnrollment < 0) {
        toast.error('Maximum enrollment must be 0 or a whole number (0 = unlimited)');
        setSaving(false);
        return;
      }

      let qrValidTill = null;
      if (form.qrValidTill) {
        const date = dayjs(form.qrValidTill);
        if (!date.isValid()) {
          toast.error('Valid till date is invalid');
          setSaving(false);
          return;
        }
        qrValidTill = date.toISOString();
      }

      // Company code / label are auto-generated — only quota, expiry & active can change.
      await updateCompanyEnrollmentInvite(editingId, {
        isActive: form.isActive !== false,
        maxEnrollment,
        qrValidTill,
      });
      toast.success('Company enrollment updated');
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadRows();
    } catch (error) {
      toast.error(error?.message || 'Could not save company enrollment');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteCompanyEnrollmentInvite(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.companyCode}`);
      setDeleteTarget(null);
      await loadRows();
    } catch (error) {
      toast.error(error?.message || 'Could not delete invite');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = async (code) => {
    const link = buildSignupLink(websiteBaseUrl, code);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Signup link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const notFound = !loading && !rows.length;
  const denseHeight = table.dense ? 52 : 72;

  return (
    <Card>
      <Stack spacing={2} sx={{ p: 3, pb: 0 }}>
        <Box>
          <Typography variant="h6">Company QR enrollment</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Company codes are auto-generated. Edit Valid Till and seat caps (0 = unlimited).
            Counts refresh automatically.
          </Typography>
        </Box>

        <TextField
          fullWidth
          value={filters.state.search}
          onChange={handleFilterSearch}
          placeholder="Search company code or label..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: filters.state.search ? (
              <InputAdornment position="end">
                <IconButton size="small" edge="end" onClick={handleClearSearch} aria-label="Clear search">
                  <Iconify icon="mingcute:close-line" width={18} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ maxWidth: { md: 420 } }}
        />
      </Stack>

      <Divider sx={{ mt: 2.5 }} />

      <Box sx={{ position: 'relative' }}>
        {loading ? <TableLoadingOverlay /> : null}

        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell>Company code</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>Quota / Enrolled</TableCell>
                <TableCell>Remaining</TableCell>
                <TableCell>Valid till</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{row.companyCode}</Typography>
                  </TableCell>
                  <TableCell>{row.label || '—'}</TableCell>
                  <TableCell>{formatQuota(row)}</TableCell>
                  <TableCell>{formatRemaining(row)}</TableCell>
                  <TableCell>
                    {row.qrValidTill
                      ? dayjs(row.qrValidTill).format('DD MMM YYYY HH:mm')
                      : 'No expiry'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.75}>
                      <Chip
                        size="small"
                        label={row.isActive === false ? 'Inactive' : 'Active'}
                        color={row.isActive === false ? 'default' : 'success'}
                        variant="soft"
                      />
                      {row.qrExpired ? (
                        <Chip size="small" label="QR expired" color="error" variant="soft" />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Show QR" onClick={() => setQrRow(row)}>
                      <Iconify icon="solar:qr-code-bold" width={18} />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Copy link"
                      onClick={() => handleCopyLink(row.companyCode)}
                    >
                      <Iconify icon="solar:copy-bold" width={18} />
                    </IconButton>
                    <IconButton size="small" title="Edit" onClick={() => openEdit(row)}>
                      <Iconify icon="solar:pen-bold" width={18} />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      title="Delete"
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              <TableEmptyRows
                height={denseHeight}
                emptyRows={emptyRows(table.page, table.rowsPerPage, totalItems)}
              />

              <TableNoData notFound={notFound} />
            </TableBody>
          </Table>
        </Scrollbar>
      </Box>

      <TablePaginationCustom
        page={table.page}
        dense={table.dense}
        count={totalItems}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        onChangeDense={table.onChangeDense}
        onRowsPerPageChange={table.onChangeRowsPerPage}
      />

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit company QR</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Company code"
              value={form.companyCode}
              disabled
              fullWidth
              helperText="Auto-generated — cannot be changed"
            />
            <TextField
              label="Label"
              value={form.label}
              disabled
              fullWidth
              helperText="Auto-generated — cannot be changed"
            />
            <TextField
              label="Maximum enrollment"
              type="number"
              value={form.maxEnrollment}
              onChange={(e) => setForm((prev) => ({ ...prev, maxEnrollment: e.target.value }))}
              fullWidth
              helperText="0 = unlimited seats"
              inputProps={{ min: 0, step: 1 }}
            />
            <DateTimePicker
              label="QR valid till"
              value={form.qrValidTill}
              onChange={(value) => setForm((prev) => ({ ...prev, qrValidTill: value }))}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'After this time, QR scans cannot enroll',
                },
                field: { clearable: true },
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive !== false}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <LoadingButton variant="contained" loading={saving} onClick={handleSave}>
            Save
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete company QR?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove enrollment invite for <strong>{deleteTarget?.companyCode}</strong>? Existing
            enrolled users are not deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <LoadingButton color="error" loading={deleting} onClick={handleConfirmDelete}>
            Delete
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <QrPreviewDialog
        open={Boolean(qrRow)}
        row={qrRow}
        websiteBaseUrl={websiteBaseUrl}
        onClose={() => setQrRow(null)}
      />
    </Card>
  );
}
