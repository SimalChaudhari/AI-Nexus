import { useCallback, useEffect, useMemo, useState } from 'react';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { alpha, useTheme } from '@mui/material/styles';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { downloadOverallGrowthUsersCsv } from 'src/services/dashboard.service';

export const WEEKLY_METRIC_USER_CSV_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'firstname', label: 'First name' },
  { key: 'lastname', label: 'Last name' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'contactNumber', label: 'Contact number' },
  { key: 'company', label: 'Company' },
  { key: 'companyCode', label: 'Company code' },
  { key: 'status', label: 'Status' },
  { key: 'enrolledAt', label: 'Enrolled at' },
  { key: 'fluencyAt', label: 'Fluency at' },
  { key: 'badgeAt', label: 'Badge earned at' },
  { key: 'championAt', label: 'Champion at' },
  { key: 'isEnrolled', label: 'Is enrolled' },
  { key: 'isFluency', label: 'Is fluency' },
  { key: 'isBadgeEarner', label: 'Is badge earner' },
  { key: 'isChampion', label: 'Is champion' },
  { key: 'lastLoginAt', label: 'Last login' },
];

export const WEEKLY_METRIC_USER_CSV_DEFAULT_FIELDS = [
  'name',
  'email',
  'contactNumber',
  'company',
  'enrolledAt',
  'fluencyAt',
  'badgeAt',
  'championAt',
];

const SCOPE_OPTIONS = [
  { value: 'enrolled', label: 'Total enrolled users', hint: 'Registered platform learners.' },
  { value: 'fluency', label: 'Total fluency', hint: 'Has a certificate and completed less than 30 CPE hours.' },
  { value: 'badge', label: 'Digital badge earners', hint: 'Users who have received a digital badge.' },
  { value: 'champion', label: 'Champions', hint: 'Users who completed 30 CPE hours or more.' },
];

function formatYmd(value) {
  if (!value) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined;
}

export function WeeklyMetricsExportDialog({ open, onClose, from, to }) {
  const theme = useTheme();
  const [selectedFields, setSelectedFields] = useState(() => [...WEEKLY_METRIC_USER_CSV_DEFAULT_FIELDS]);
  const [metric, setMetric] = useState('enrolled');
  const [exporting, setExporting] = useState(false);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFromDate(from ? dayjs(from) : null);
    setToDate(to ? dayjs(to) : null);
  }, [from, open, to]);

  const allKeys = useMemo(() => WEEKLY_METRIC_USER_CSV_FIELDS.map((field) => field.key), []);
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
      await downloadOverallGrowthUsersCsv({
        metric,
        fields: selectedFields,
        from: hasDateRange ? fromYmd : undefined,
        to: hasDateRange ? toYmd : undefined,
      });
      toast.success(
        hasDateRange
          ? `User CSV downloaded for ${fromYmd || 'launch'} to ${toYmd || 'today'}`
          : 'All users CSV downloaded'
      );
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to download user CSV');
    } finally {
      setExporting(false);
    }
  }, [dateError, fromYmd, hasDateRange, metric, onClose, selectedFields, toYmd]);

  return (
    <Dialog
      open={open}
      onClose={exporting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { maxWidth: { sm: 640 } } } }}
    >
      <DialogTitle sx={{ py: 1.5, px: 2.5 }}>Download users CSV</DialogTitle>

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
              ? `Users will be exported from ${fromYmd || 'launch'} to ${toYmd || 'today'}.`
              : 'No date selected. All users will be exported by default.'}
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">1. Choose fields</Typography>
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
            {WEEKLY_METRIC_USER_CSV_FIELDS.map((field) => {
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

          <Divider />

          <Typography variant="subtitle2">2. Choose who to include</Typography>
          <RadioGroup value={metric} onChange={(event) => setMetric(event.target.value)}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 0.5,
              }}
            >
              {SCOPE_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  sx={{
                    m: 0,
                    mr: 0,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.75,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.grey[500], 0.16),
                    '& .MuiRadio-root': { p: 0.5 },
                  }}
                  control={<Radio size="small" />}
                  label={
                    <Typography variant="caption" sx={{ fontWeight: 600 }} title={option.hint}>
                      {option.label}
                    </Typography>
                  }
                />
              ))}
            </Box>
          </RadioGroup>
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
