import { useCallback, useMemo, useState } from 'react';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { alpha, useTheme } from '@mui/material/styles';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { userService } from 'src/services/user.service';

export const HR_EXPORT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'firstname', label: 'First name' },
  { key: 'lastname', label: 'Last name' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'contactNumber', label: 'Contact number' },
  { key: 'company', label: 'Company' },
  { key: 'companyCode', label: 'Company code' },
  { key: 'status', label: 'Status' },
  { key: 'isVerified', label: 'Email verified' },
  { key: 'authProvider', label: 'OAuth / Auth' },
  { key: 'createdAt', label: 'Registered' },
  { key: 'lastLoginAt', label: 'Last login' },
];

export const HR_EXPORT_DEFAULT_FIELDS = [
  'name',
  'email',
  'contactNumber',
  'company',
  'companyCode',
  'status',
  'createdAt',
];

function formatYmd(value) {
  if (!value) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined;
}

export function CorporateMemberExportDialog({ open, onClose, search }) {
  const theme = useTheme();
  const [selectedFields, setSelectedFields] = useState(() => [...HR_EXPORT_DEFAULT_FIELDS]);
  const [exporting, setExporting] = useState(false);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const allKeys = useMemo(() => HR_EXPORT_FIELDS.map((field) => field.key), []);
  const allSelected = selectedFields.length === allKeys.length;

  const handleToggle = useCallback((key) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedFields((prev) => (prev.length === allKeys.length ? [] : [...allKeys]));
  }, [allKeys]);

  const dateError = Boolean(fromDate && toDate && dayjs(toDate).isBefore(dayjs(fromDate), 'day'));
  const fromYmd = formatYmd(fromDate);
  const toYmd = formatYmd(toDate);
  const hasDateRange = Boolean(fromYmd || toYmd) && !dateError;

  const handleExport = useCallback(async () => {
    if (!selectedFields.length) {
      toast.error('Select at least one field to download.');
      return;
    }
    if (dateError) {
      toast.error('To date must be after From date.');
      return;
    }

    setExporting(true);
    try {
      await userService.exportUsersCsv({
        role: 'Corporate',
        search: search || undefined,
        fields: selectedFields.join(','),
        from: hasDateRange ? fromYmd : undefined,
        to: hasDateRange ? toYmd : undefined,
      });
      toast.success(
        hasDateRange
          ? `HR users CSV downloaded for ${fromYmd || 'launch'} to ${toYmd || 'today'}`
          : 'HR users CSV downloaded'
      );
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to download HR users CSV');
    } finally {
      setExporting(false);
    }
  }, [dateError, fromYmd, hasDateRange, onClose, search, selectedFields, toYmd]);

  return (
    <Dialog
      open={open}
      onClose={exporting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { maxWidth: { sm: 640 } } } }}
    >
      <DialogTitle sx={{ py: 1.5, px: 2.5 }}>Export HR users</DialogTitle>

      <DialogContent dividers sx={{ py: 1.5, px: 2.5 }}>
        <Stack spacing={1.25}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <DatePicker
              label="From"
              value={fromDate}
              onChange={setFromDate}
              maxDate={toDate || undefined}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
            <DatePicker
              label="To"
              value={toDate}
              onChange={setToDate}
              minDate={fromDate || undefined}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  error: dateError,
                  helperText: dateError ? 'To date must be after From date' : null,
                },
              }}
            />
            <Button
              color="inherit"
              size="small"
              disabled={!fromDate && !toDate}
              onClick={() => {
                setFromDate(null);
                setToDate(null);
              }}
              sx={{ fontWeight: 700, flexShrink: 0, height: 36 }}
            >
              Clear
            </Button>
          </Stack>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {hasDateRange
              ? `HR users registered from ${fromYmd || 'launch'} to ${toYmd || 'today'} will be exported.`
              : 'No date selected. All HR users will be exported by default.'}
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">Choose fields</Typography>
            <Button size="small" onClick={handleToggleAll} sx={{ minWidth: 0 }}>
              {allSelected ? 'Clear all' : 'Select all'}
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 0.75,
            }}
          >
            {HR_EXPORT_FIELDS.map((field) => {
              const checked = selectedFields.includes(field.key);
              return (
                <FormControlLabel
                  key={field.key}
                  sx={{
                    m: 0,
                    minWidth: 0,
                    mr: 0,
                    px: 0.75,
                    py: 0,
                    borderRadius: 0.75,
                    border: '1px solid',
                    borderColor: checked
                      ? alpha(theme.palette.primary.main, 0.4)
                      : alpha(theme.palette.grey[500], 0.16),
                    bgcolor: checked ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    '& .MuiCheckbox-root': { p: 0.5 },
                    '& .MuiFormControlLabel-label': { minWidth: 0 },
                  }}
                  control={
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={() => handleToggle(field.key)}
                    />
                  }
                  label={
                    <Typography variant="caption" noWrap title={field.label}>
                      {field.label}
                    </Typography>
                  }
                />
              );
            })}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.25 }}>
        <Button onClick={onClose} disabled={exporting} color="inherit" size="small">
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleExport}
          disabled={exporting || !selectedFields.length}
          startIcon={
            exporting ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <Iconify icon="solar:download-bold" width={16} />
            )
          }
        >
          {exporting ? 'Downloading...' : 'Download CSV'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
