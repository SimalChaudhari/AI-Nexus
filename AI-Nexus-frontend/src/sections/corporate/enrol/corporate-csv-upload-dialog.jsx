import { useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import {
  CORPORATE_STAFF_CSV_TEMPLATE_HEADERS,
  downloadCorporateStaffCsvTemplate,
  enrolCorporateStaffBulkCsv,
  validateCorporateStaffBulkCsv,
} from 'src/services/corporate.service';

import { CORP } from '../corporate-theme';
import { CorpBtn } from '../corporate-ui';

// ----------------------------------------------------------------------

const CSV_UPLOAD_INSTRUCTIONS =
  'Download the template, fill learner rows, then choose your CSV or Excel (.xlsx / .xls) file. Only the listed sheet fields are used — any extra columns are ignored. The system validates required fields, email format, duplicates, citizenship, and existing app / Salesforce emails before you can submit. Use Skip on error rows to enrol only the ready records.';

/** Template columns shown as required in the upload dialog. */
const CSV_TEMPLATE_REQUIRED_FIELDS = new Set([
  'First Name',
  'Last Name (Surname)',
  'Citizenship',
  'Corporate email address',
  'Organisation name',
  'Is the job function accounting related?',
]);

/** Optional columns — still inserted into Salesforce when filled. */
const CSV_TEMPLATE_OPTIONAL_FIELDS = new Set([
  'ID Type',
  'NRIC/ Fin/ Passport',
  'Nationality',
  'ISCA member/ Non-member',
  'Phone Number',
  'Organisation type',
  'Job function',
]);

/** Shown in the chip list but not marked required (*). */
const CSV_TEMPLATE_CONDITIONAL_FIELDS = new Set([
  'Membership of other accounting bodies (only if non ISCA member)',
]);

function formatApiErrorMessage(err, fallback) {
  const raw = err?.response?.data?.message ?? err?.message ?? fallback;
  const text = Array.isArray(raw) ? raw.filter(Boolean).join(', ') : String(raw || fallback);
  const trimmed = text.trim() || fallback;
  if (trimmed.length <= 180) return trimmed;
  return `${trimmed.slice(0, 177)}…`;
}

const SUBMIT_PROGRESS_STEPS = [
  { label: 'Submitting validated file…', value: 25 },
  { label: 'Creating learners in Salesforce…', value: 65 },
  { label: 'Saving local users & track records…', value: 90 },
];

// ----------------------------------------------------------------------

export function CorporateCsvUploadDialog({
  open,
  onClose,
  companyCode,
  onSuccess,
}) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validation, setValidation] = useState(null);
  const [skippedRows, setSkippedRows] = useState(() => new Set());
  const [progress, setProgress] = useState({ active: false, label: '', value: 0 });
  const [helpAnchorEl, setHelpAnchorEl] = useState(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setValidation(null);
      setValidating(false);
      setSubmitting(false);
      setSkippedRows(new Set());
      setProgress({ active: false, label: '', value: 0 });
      setHelpAnchorEl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  const errors = Array.isArray(validation?.errors) ? validation.errors : [];
  const rows = Array.isArray(validation?.rows) ? validation.rows : [];
  const fileLevelErrors = errors.filter((e) => e.type === 'file' || e.type === 'header');

  const readyRows = useMemo(
    () => rows.filter((row) => row.status === 'ok'),
    [rows],
  );
  const errorRows = useMemo(
    () => rows.filter((row) => row.status !== 'ok'),
    [rows],
  );
  const unskippedErrorRows = useMemo(
    () => errorRows.filter((row) => !skippedRows.has(row.row)),
    [errorRows, skippedRows],
  );
  const skippedErrorCount = errorRows.length - unskippedErrorRows.length;

  const canSubmit = Boolean(
    file
    && validation
    && !validating
    && !submitting
    && fileLevelErrors.length === 0
    && readyRows.length > 0
    && unskippedErrorRows.length === 0,
  );

  const runValidate = async (selectedFile) => {
    if (!selectedFile) return;
    setValidating(true);
    setValidation(null);
    setSkippedRows(new Set());
    try {
      const result = await validateCorporateStaffBulkCsv(
        selectedFile,
        companyCode || undefined,
      );
      setValidation(result || null);
      if (result?.valid) {
        toast.success(
          `CSV validated. ${result.summary?.validRows ?? result.rowCount ?? 0} row(s) ready to enrol.`,
        );
      } else {
        toast.warning(
          'Validation found errors. Fix them, or skip error rows to enrol the ready ones.',
        );
      }
    } catch (err) {
      setValidation({
        valid: false,
        fileName: selectedFile.name,
        rowCount: 0,
        errors: [{ type: 'file', message: formatApiErrorMessage(err, 'CSV validation failed') }],
        summary: {
          requiredColumnsOk: false,
          emailFormatErrors: 0,
          duplicateEmails: 0,
          citizenshipErrors: 0,
          alreadyInApp: 0,
          alreadyInSalesforce: 0,
          validRows: 0,
        },
      });
      toast.error(formatApiErrorMessage(err, 'CSV validation failed'));
    } finally {
      setValidating(false);
    }
  };

  const handleFileSelected = async (event) => {
    const selected = event.target.files?.[0] || null;
    event.target.value = '';
    if (!selected) return;
    if (!/\.(csv|xlsx|xls)$/i.test(selected.name || '')) {
      toast.error('Only .csv, .xlsx or .xls files are allowed');
      return;
    }
    if (selected.size > 1024 * 1024 * 1024) {
      toast.error('CSV file must be 1GB or smaller');
      return;
    }
    setFile(selected);
    await runValidate(selected);
  };

  const toggleSkipRow = (rowNumber) => {
    setSkippedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const skipAllErrors = () => {
    setSkippedRows(new Set(errorRows.map((row) => row.row)));
  };

  const clearSkipped = () => {
    setSkippedRows(new Set());
  };

  const handleSubmit = async () => {
    if (!canSubmit || !file) return;
    setSubmitting(true);
    setProgress({
      active: true,
      label: SUBMIT_PROGRESS_STEPS[0].label,
      value: SUBMIT_PROGRESS_STEPS[0].value,
    });
    let stepIndex = 0;
    const progressTimer = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, SUBMIT_PROGRESS_STEPS.length - 1);
      const step = SUBMIT_PROGRESS_STEPS[stepIndex];
      setProgress({ active: true, label: step.label, value: step.value });
    }, 2200);

    try {
      const excludeRows = errorRows.map((row) => row.row);
      const result = await enrolCorporateStaffBulkCsv(file, companyCode || undefined, {
        excludeRows,
      });
      setProgress({ active: true, label: 'Finishing…', value: 100 });
      onSuccess?.(result);
      onClose?.();
    } catch (err) {
      toast.error(formatApiErrorMessage(err, 'Failed to enrol learners from upload'));
    } finally {
      window.clearInterval(progressTimer);
      setSubmitting(false);
      window.setTimeout(() => {
        setProgress({ active: false, label: '', value: 0 });
      }, 400);
    }
  };

  const summary = validation?.summary || {};
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const hasResults = Boolean(validation) || validating || progress.active;
  const expanded = hasResults || Boolean(file);

  const headCellSx = {
    fontWeight: 800,
    fontSize: 12.5,
    color: CORP.navy,
    bgcolor: '#f1f5f9',
    borderBottom: `1px solid ${CORP.line}`,
    whiteSpace: 'nowrap',
    py: 1.25,
  };

  const bodyCellSx = {
    fontSize: 12.5,
    color: CORP.ink,
    borderBottom: `1px solid ${CORP.line}`,
    py: 1.1,
    verticalAlign: 'top',
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullScreen={fullScreen && expanded}
      fullWidth
      maxWidth={expanded ? 'xl' : 'sm'}
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: fullScreen && expanded ? 0 : 2,
          border: fullScreen && expanded ? 'none' : `1px solid ${CORP.line}`,
          m: fullScreen && expanded ? 0 : { xs: 1, sm: 2 },
          width: fullScreen && expanded
            ? '100%'
            : expanded
              ? { xs: 'calc(100% - 16px)', sm: '96vw', lg: '94vw' }
              : { xs: 'calc(100% - 24px)', sm: 520 },
          maxWidth: fullScreen && expanded ? '100%' : expanded ? 1400 : 520,
          height: fullScreen && expanded ? '100%' : expanded ? { xs: '92vh', md: '88vh' } : 'auto',
          maxHeight: fullScreen && expanded ? '100%' : expanded ? '92vh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          transition: theme.transitions.create(['width', 'max-width', 'height'], {
            duration: theme.transitions.duration.shorter,
          }),
        },
      }}
    >
      <DialogTitle
        sx={{
          color: CORP.navy,
          fontWeight: 800,
          pb: 1.25,
          pt: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 3 },
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              minWidth: 0,
              flex: '1 1 auto',
            }}
          >
            <Box component="span" sx={{ lineHeight: 1.3 }}>
              Upload CSV — bulk enrolment
            </Box>
            <IconButton
              aria-label="How to use CSV upload"
              size="small"
              onClick={(event) => setHelpAnchorEl(event.currentTarget)}
              sx={{ color: CORP.blue, flexShrink: 0 }}
            >
              <Iconify icon="solar:info-circle-bold" width={20} />
            </IconButton>
            <Popover
              open={Boolean(helpAnchorEl)}
              anchorEl={helpAnchorEl}
              onClose={() => setHelpAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              slotProps={{
                paper: {
                  sx: {
                    p: 2,
                    maxWidth: 420,
                    border: `1px solid ${CORP.line}`,
                    borderRadius: 1.5,
                  },
                },
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 13, color: CORP.navy, mb: 1 }}>
                How to upload
              </Typography>
              <Typography sx={{ fontSize: 13, color: CORP.ink, lineHeight: 1.55 }}>
                {CSV_UPLOAD_INSTRUCTIONS}
              </Typography>
            </Popover>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              flex: { xs: '1 1 100%', sm: '0 1 auto' },
            }}
          >
            <CorpBtn
              variant="ghost"
              onClick={downloadCorporateStaffCsvTemplate}
              disabled={submitting}
            >
              Download CSV template
            </CorpBtn>
            <CorpBtn
              variant="blue"
              onClick={() => fileInputRef.current?.click()}
              disabled={validating || submitting}
            >
              {validating ? 'Validating…' : file ? 'Choose another file' : 'Choose CSV / Excel'}
            </CorpBtn>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={handleFileSelected}
            />
          </Stack>
        </Box>
      </DialogTitle>
      <DialogContent
        dividers={expanded}
        sx={{
          pt: expanded ? 2 : 1.5,
          px: { xs: 1.5, sm: 3 },
          pb: expanded ? undefined : 2,
          flex: expanded ? 1 : 'none',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: expanded ? 'hidden' : 'visible',
        }}
      >
        {!expanded ? (
          <Box sx={{ flexShrink: 0 }}>
            <Typography sx={{ fontSize: 13, color: CORP.muted, lineHeight: 1.5, mb: 1.5 }}>
              Download the template or choose a CSV / Excel (.xlsx, .xls) file to start validation.
              Extra columns in your sheet are ignored.
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 13, color: CORP.navy, mb: 1 }}>
              Sheet fields ({CORPORATE_STAFF_CSV_TEMPLATE_HEADERS.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {CORPORATE_STAFF_CSV_TEMPLATE_HEADERS.map((field) => {
                const required = CSV_TEMPLATE_REQUIRED_FIELDS.has(field);
                const conditional = CSV_TEMPLATE_CONDITIONAL_FIELDS.has(field);
                const optional = CSV_TEMPLATE_OPTIONAL_FIELDS.has(field);
                return (
                  <Chip
                    key={field}
                    size="small"
                    label={
                      required
                        ? `${field} *`
                        : conditional
                          ? `${field} †`
                          : optional
                            ? `${field} (optional)`
                            : field
                    }
                    variant="outlined"
                    color={required ? 'primary' : 'default'}
                    sx={{
                      fontWeight: required || conditional ? 700 : 600,
                      height: 26,
                      maxWidth: '100%',
                      bgcolor: required ? 'rgba(25, 118, 210, 0.06)' : '#f8fafc',
                      '& .MuiChip-label': {
                        whiteSpace: 'normal',
                        lineHeight: 1.25,
                        py: 0.5,
                      },
                    }}
                  />
                );
              })}
            </Box>
            <Typography sx={{ fontSize: 11.5, color: CORP.muted, mt: 1 }}>
              * Required. Optional fields are sent to Salesforce only when filled.
              † Required only when ISCA member/ Non-member is Non-member.
              Citizenship must be Singapore Citizen or Singapore PR.
            </Typography>
          </Box>
        ) : null}

        {file ? (
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              color: CORP.ink,
              mb: 1.5,
              flexShrink: 0,
              wordBreak: 'break-word',
            }}
          >
            Selected: {file.name}
            {validation?.rowCount != null ? ` · ${validation.rowCount} data row(s)` : ''}
            {skippedErrorCount > 0 ? ` · ${skippedErrorCount} skipped` : ''}
          </Typography>
        ) : null}

        {validating ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              py: 6,
              flex: 1,
              minHeight: 180,
            }}
          >
            <CircularProgress size={36} />
            <Typography sx={{ fontSize: 13, color: CORP.muted, textAlign: 'center' }}>
              Validating emails, citizenship, and existing accounts…
            </Typography>
          </Box>
        ) : null}

        {progress.active ? (
          <Box sx={{ mb: 2, flexShrink: 0 }}>
            <Typography sx={{ color: CORP.navy, fontWeight: 700, mb: 1, fontSize: 14 }}>
              Enrolment in progress
            </Typography>
            <Typography sx={{ color: CORP.muted, mb: 1, fontSize: 13 }}>{progress.label}</Typography>
            <LinearProgress
              variant="determinate"
              value={progress.value}
              sx={{
                height: 10,
                borderRadius: 999,
                bgcolor: '#e8eef6',
                '& .MuiLinearProgress-bar': { bgcolor: CORP.blue, borderRadius: 999 },
              }}
            />
          </Box>
        ) : null}

        {validation && !validating ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {canSubmit ? (
              <Alert severity="success" sx={{ mb: 1.5, flexShrink: 0 }}>
                {readyRows.length} row(s) ready to enrol
                {skippedErrorCount > 0
                  ? ` (${skippedErrorCount} error row(s) will be skipped and not submitted).`
                  : '. Click Submit to enrol.'}
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 1.5, flexShrink: 0 }}>
                {fileLevelErrors.length
                  ? 'File / header issues must be fixed before submitting.'
                  : unskippedErrorRows.length
                    ? `Validation found ${unskippedErrorRows.length} error row(s). Fix them, or skip those rows to enrol the ${readyRows.length} ready record(s).`
                    : readyRows.length === 0
                      ? 'No ready rows to enrol.'
                      : 'Validation failed. Fix errors below before submitting.'}
              </Alert>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  md: 'repeat(6, minmax(0, 1fr))',
                },
                gap: 1,
                mb: 1.5,
                flexShrink: 0,
              }}
            >
              {[
                ['Columns', summary.requiredColumnsOk ? 'OK' : 'Failed'],
                ['Email format errors', summary.emailFormatErrors ?? 0],
                ['Duplicate emails', summary.duplicateEmails ?? 0],
                ['Citizenship errors', summary.citizenshipErrors ?? 0],
                ['Already in app', summary.alreadyInApp ?? 0],
                ['Already in Salesforce', summary.alreadyInSalesforce ?? 0],
              ].map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    px: { xs: 1, sm: 1.5 },
                    py: 1,
                    borderRadius: 1.5,
                    border: `1px solid ${CORP.line}`,
                    bgcolor: '#f8fafc',
                    minWidth: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: 10, sm: 11 },
                      color: CORP.muted,
                      fontWeight: 700,
                      lineHeight: 1.3,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: 13, sm: 14 },
                      fontWeight: 800,
                      color: CORP.navy,
                      mt: 0.25,
                    }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>

            {fileLevelErrors.length ? (
              <>
                <Divider sx={{ my: 1.5, flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: CORP.navy, mb: 1, flexShrink: 0 }}>
                  File / header issues
                </Typography>
                <Box
                  sx={{
                    maxHeight: 120,
                    overflow: 'auto',
                    border: `1px solid ${CORP.line}`,
                    borderRadius: 1.5,
                    bgcolor: '#fff',
                    mb: 1.5,
                    flexShrink: 0,
                  }}
                >
                  {fileLevelErrors.map((err, index) => (
                    <Box
                      key={`file-${index}`}
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderBottom:
                          index < fileLevelErrors.length - 1 ? `1px solid ${CORP.line}` : 'none',
                      }}
                    >
                      <Typography sx={{ fontSize: 12.5, color: CORP.ink, lineHeight: 1.45 }}>
                        {err.type === 'header' ? 'Header' : 'File'}: {err.message}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : null}

            {rows.length ? (
              <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                    mb: 1,
                    flexShrink: 0,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: 13, color: CORP.navy }}>
                    Email status ({rows.length})
                    {readyRows.length ? ` · ${readyRows.length} ready` : ''}
                    {skippedErrorCount ? ` · ${skippedErrorCount} skipped` : ''}
                  </Typography>
                  {errorRows.length ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={skipAllErrors}
                        disabled={submitting || skippedErrorCount === errorRows.length}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        Skip all errors
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={clearSkipped}
                        disabled={submitting || skippedErrorCount === 0}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        Clear skips
                      </Button>
                    </Stack>
                  ) : null}
                </Box>

                <TableContainer
                  sx={{
                    flex: 1,
                    minHeight: { xs: 220, sm: 300 },
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    border: `1px solid ${CORP.line}`,
                    borderRadius: 1.5,
                    bgcolor: '#fff',
                  }}
                >
                  <Table
                    size="small"
                    stickyHeader
                    sx={{
                      minWidth: 720,
                      tableLayout: 'fixed',
                      borderCollapse: 'separate',
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCellSx, width: 72, textAlign: 'center' }}>
                          Skip
                        </TableCell>
                        <TableCell sx={{ ...headCellSx, width: 64 }}>Row</TableCell>
                        <TableCell sx={{ ...headCellSx, width: '28%' }}>Email</TableCell>
                        <TableCell sx={{ ...headCellSx, width: 110 }}>Status</TableCell>
                        <TableCell sx={{ ...headCellSx, width: 'auto' }}>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const isOk = row.status === 'ok';
                        const isSkipped = skippedRows.has(row.row);
                        const detail =
                          Array.isArray(row.messages) && row.messages.length
                            ? row.messages.join(' · ')
                            : row.statusLabel || (isOk ? 'Ready to enrol' : 'Failed');
                        return (
                          <TableRow
                            key={`row-${row.row}-${row.email}`}
                            hover
                            sx={{
                              bgcolor: isSkipped
                                ? 'rgba(158, 158, 158, 0.08)'
                                : isOk
                                  ? 'transparent'
                                  : 'rgba(211, 47, 47, 0.04)',
                              opacity: isSkipped ? 0.72 : 1,
                              '&:last-of-type td': { borderBottom: 0 },
                            }}
                          >
                            <TableCell sx={{ ...bodyCellSx, textAlign: 'center', px: 0.5 }}>
                              {isOk ? (
                                <Typography sx={{ fontSize: 12, color: CORP.muted }}>—</Typography>
                              ) : (
                                <Checkbox
                                  size="small"
                                  checked={isSkipped}
                                  onChange={() => toggleSkipRow(row.row)}
                                  disabled={submitting}
                                  inputProps={{ 'aria-label': `Skip row ${Math.max(1, Number(row.row) - 1)}` }}
                                  sx={{ p: 0.5 }}
                                />
                              )}
                            </TableCell>
                            <TableCell sx={{ ...bodyCellSx, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {Math.max(1, Number(row.row) - 1)}
                            </TableCell>
                            <TableCell
                              sx={{
                                ...bodyCellSx,
                                fontWeight: 600,
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {row.email || '—'}
                            </TableCell>
                            <TableCell sx={{ ...bodyCellSx, whiteSpace: 'nowrap' }}>
                              <Chip
                                size="small"
                                label={isSkipped ? 'Skipped' : isOk ? 'Ready' : 'Error'}
                                color={isSkipped ? 'default' : isOk ? 'success' : 'error'}
                                variant="outlined"
                                sx={{ fontWeight: 700, height: 22 }}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                ...bodyCellSx,
                                lineHeight: 1.45,
                                wordBreak: 'break-word',
                                whiteSpace: 'normal',
                              }}
                            >
                              {isSkipped
                                ? 'Will not be submitted with this enrolment.'
                                : detail}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.75,
          gap: 1,
          flexShrink: 0,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          '& > :not(style)': {
            width: { xs: '100%', sm: 'auto' },
          },
        }}
      >
        <Button onClick={onClose} disabled={submitting} color="inherit">
          Cancel
        </Button>
        <CorpBtn
          variant="blue"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting
            ? 'Submitting…'
            : skippedErrorCount > 0
              ? `Submit ${readyRows.length} ready row(s)`
              : 'Submit enrolment'}
        </CorpBtn>
      </DialogActions>
    </Dialog>
  );
}
