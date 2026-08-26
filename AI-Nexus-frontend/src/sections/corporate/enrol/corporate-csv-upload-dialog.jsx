import { useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
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
  getCorporateStaffBulkCsvProgress,
  validateCorporateStaffBulkCsv,
} from 'src/services/corporate.service';
import { uuidv4 } from 'src/utils/uuidv4';

import { CORP } from '../corporate-theme';
import { CorpBtn } from '../corporate-ui';

// ----------------------------------------------------------------------

const CSV_UPLOAD_INSTRUCTIONS =
  'Download the template, fill learner rows, then choose your CSV or Excel (.xlsx / .xls) file. AI maps messy headers (for example "First Name -" or Corporate email) and checks citizenship, ID type, and member/non-member values. Extra columns are ignored. The system then validates required fields, email format, duplicates, citizenship, and existing app / Salesforce emails before you can submit. Use Skip on error rows to enrol only the ready records.';

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

const PROGRESS_POLL_MS = 700;

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
  /** When set, useEffect polls backend for accurate row % until cleared. */
  const [progressJob, setProgressJob] = useState(null);
  const [progress, setProgress] = useState({
    active: false,
    phase: '',
    label: '',
    value: 0,
    current: null,
    total: null,
  });
  const [helpAnchorEl, setHelpAnchorEl] = useState(null);

  // Accurate live progress: poll backend while a validate/enrol job is active.
  useEffect(() => {
    const jobId = String(progressJob?.jobId || '').trim();
    const phase = progressJob?.phase || '';
    if (!jobId) return undefined;

    let cancelled = false;

    const poll = async () => {
      try {
        const snapshot = await getCorporateStaffBulkCsvProgress(jobId);
        if (cancelled || !snapshot || typeof snapshot !== 'object') return;
        const percent = Number(snapshot.percent);
        setProgress((prev) => ({
          active: true,
          phase: snapshot.phase || phase || prev.phase,
          label: String(snapshot.label || prev.label || ''),
          value: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : prev.value,
          current: snapshot.current != null ? Number(snapshot.current) : prev.current,
          total: snapshot.total != null ? Number(snapshot.total) : prev.total,
        }));
      } catch {
        // Ignore transient poll errors while the main request is still running.
      }
    };

    void poll();
    const timer = window.setInterval(poll, PROGRESS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [progressJob]);

  useEffect(() => {
    if (!open) {
      setProgressJob(null);
      setFile(null);
      setValidation(null);
      setValidating(false);
      setSubmitting(false);
      setSkippedRows(new Set());
      setProgress({
        active: false,
        phase: '',
        label: '',
        value: 0,
        current: null,
        total: null,
      });
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
    const progressJobId = uuidv4();
    setValidating(true);
    setValidation(null);
    setSkippedRows(new Set());
    setProgress({
      active: true,
      phase: 'validate',
      label: 'Starting validation…',
      value: 0,
      current: null,
      total: null,
    });
    setProgressJob({ jobId: progressJobId, phase: 'validate' });
    try {
      const result = await validateCorporateStaffBulkCsv(
        selectedFile,
        companyCode || undefined,
        {
          progressJobId,
          onUploadProgress: (uploadPercent) => {
            // File transfer only — row % starts after the server begins processing.
            setProgress((prev) => {
              if (prev.current != null && prev.current > 0) return prev;
              return {
                ...prev,
                active: true,
                phase: 'validate',
                label:
                  uploadPercent < 100
                    ? `Uploading file… ${uploadPercent}%`
                    : 'Starting validation…',
                value: 0,
                current: 0,
                total: prev.total,
              };
            });
          },
        },
      );
      setProgress((prev) => ({
        ...prev,
        active: true,
        phase: 'validate',
        label: 'Validation complete',
        value: 100,
      }));
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
          nricFormatErrors: 0,
          duplicateNrics: 0,
          citizenshipErrors: 0,
          alreadyInApp: 0,
          alreadyInSalesforce: 0,
          validRows: 0,
        },
      });
      toast.error(formatApiErrorMessage(err, 'CSV validation failed'));
    } finally {
      setProgressJob(null);
      setValidating(false);
      window.setTimeout(() => {
        setProgress({
          active: false,
          phase: '',
          label: '',
          value: 0,
          current: null,
          total: null,
        });
      }, 500);
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
    const progressJobId = uuidv4();
    setSubmitting(true);
    setProgress({
      active: true,
      phase: 'enrol',
      label: 'Starting enrolment…',
      value: 0,
      current: null,
      total: null,
    });
    setProgressJob({ jobId: progressJobId, phase: 'enrol' });

    try {
      const excludeRows = errorRows.map((row) => row.row);
      const result = await enrolCorporateStaffBulkCsv(file, companyCode || undefined, {
        excludeRows,
        progressJobId,
        onUploadProgress: (uploadPercent) => {
          setProgress((prev) => {
            if (prev.current != null && prev.current > 0) return prev;
            return {
              ...prev,
              active: true,
              phase: 'enrol',
              label:
                uploadPercent < 100
                  ? `Uploading file… ${uploadPercent}%`
                  : 'Starting enrolment…',
              value: 0,
              current: 0,
              total: prev.total,
            };
          });
        },
      });
      setProgress((prev) => ({
        ...prev,
        active: true,
        phase: 'enrol',
        label: 'Enrolment complete',
        value: 100,
      }));
      onSuccess?.(result);
      onClose?.();
    } catch (err) {
      toast.error(formatApiErrorMessage(err, 'Failed to enrol learners from upload'));
    } finally {
      setProgressJob(null);
      setSubmitting(false);
      window.setTimeout(() => {
        setProgress({
          active: false,
          phase: '',
          label: '',
          value: 0,
          current: null,
          total: null,
        });
      }, 400);
    }
  };

  const summary = validation?.summary || {};
  const validationFooterMessage = !validation || validating
    ? ''
    : canSubmit
      ? skippedErrorCount > 0
        ? `${readyRows.length} ready · ${skippedErrorCount} skipped`
        : `${readyRows.length} row(s) ready to enrol`
      : fileLevelErrors.length
        ? 'Fix file / header issues before submitting.'
        : unskippedErrorRows.length
          ? `${unskippedErrorRows.length} error row(s) · ${readyRows.length} ready — skip errors to enrol the ready ones`
          : readyRows.length === 0
            ? 'No ready rows to enrol.'
            : 'Validation failed.';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const hasResults = Boolean(validation) || validating || progress.active;
  const expanded = hasResults || Boolean(file);
  const progressTitle =
    progress.phase === 'validate' ? 'Validation in progress' : 'Enrolment in progress';
  const progressDetail =
    progress.current != null && progress.total != null && progress.total > 0
      ? `${progress.current} of ${progress.total} rows`
      : null;

  const headCellSx = {
    fontWeight: 800,
    fontSize: 12.5,
    color: CORP.navy,
    bgcolor: '#f1f5f9',
    borderBottom: `1px solid ${CORP.line}`,
    whiteSpace: 'nowrap',
    py: 1,
  };

  const bodyCellSx = {
    fontSize: 13,
    color: CORP.ink,
    borderBottom: `1px solid ${CORP.line}`,
    py: 0.9,
    verticalAlign: 'middle',
  };

  const summaryRows = [
    ['Columns', summary.requiredColumnsOk ? 'OK' : 'Failed'],
    ['Email format errors', summary.emailFormatErrors ?? 0],
    ['Duplicate emails', summary.duplicateEmails ?? 0],
    ['NRIC format errors', summary.nricFormatErrors ?? 0],
    ['Duplicate NRICs', summary.duplicateNrics ?? 0],
    ['Citizenship errors', summary.citizenshipErrors ?? 0],
    ['Already in app', summary.alreadyInApp ?? 0],
    ['Already in Salesforce', summary.alreadyInSalesforce ?? 0],
  ];

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
          borderRadius: fullScreen && expanded ? 0 : { xs: 1.5, sm: 2 },
          border: fullScreen && expanded ? 'none' : `1px solid ${CORP.line}`,
          m: fullScreen && expanded ? 0 : { xs: 0.75, sm: 2 },
          width: fullScreen && expanded
            ? '100%'
            : expanded
              ? { xs: 'calc(100% - 12px)', sm: '96vw', lg: '94vw' }
              : { xs: 'calc(100% - 16px)', sm: 520 },
          maxWidth: fullScreen && expanded
            ? '100%'
            : expanded
              ? { xs: '100%', sm: 1400 }
              : { xs: '100%', sm: 520 },
          height: fullScreen && expanded
            ? '100%'
            : expanded
              ? { xs: '92dvh', sm: '94vh', md: '92vh' }
              : 'auto',
          maxHeight: fullScreen && expanded
            ? '100%'
            : expanded
              ? { xs: '92dvh', sm: '94vh' }
              : '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
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
          fontSize: { xs: 16, sm: 20 },
          pb: { xs: 1, sm: 1.25 },
          pt: { xs: 1.25, sm: 2 },
          px: { xs: 1.5, sm: 3 },
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
              alignItems: 'stretch',
              justifyContent: { xs: 'stretch', sm: 'flex-end' },
              flex: { xs: '1 1 100%', sm: '0 1 auto' },
              '& > *': { width: { xs: '100%', sm: 'auto' } },
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
          pt: expanded ? { xs: 1, sm: 1.25 } : 1.5,
          px: { xs: 1.25, sm: 2.5 },
          pb: expanded ? { xs: 1, sm: 1.5 } : 2,
          flex: expanded ? 1 : 'none',
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: expanded ? { xs: 'auto', md: 'hidden' } : 'visible',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {!expanded ? (
          <Box sx={{ flexShrink: 0 }}>
            <Typography sx={{ fontSize: 13, color: CORP.muted, lineHeight: 1.5, mb: 1.5 }}>
              Download the template or choose a CSV / Excel (.xlsx, .xls) file. AI maps messy
              headers and checks citizenship, ID type, and member status before validation.
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
              Citizenship must be Singapore Citizen, Singapore PR, or Foreigner.
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

        {progress.active ? (
          <Box
            sx={{
              mb: 2,
              flexShrink: 0,
              p: 2,
              borderRadius: 1.5,
              border: `1px solid ${CORP.line}`,
              bgcolor: '#f8fafc',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 1.5,
                mb: 0.75,
              }}
            >
              <Typography sx={{ color: CORP.navy, fontWeight: 800, fontSize: 14 }}>
                {progressTitle}
              </Typography>
              <Typography
                sx={{
                  color: CORP.blue,
                  fontWeight: 800,
                  fontSize: 18,
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                {Math.round(progress.value)}%
              </Typography>
            </Box>
            <Typography sx={{ color: CORP.muted, mb: 1.25, fontSize: 13, lineHeight: 1.45 }}>
              {progress.label}
            </Typography>
            {progressDetail ? (
              <Typography
                sx={{
                  color: CORP.navy,
                  fontWeight: 800,
                  fontSize: 15,
                  mb: 1.25,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {progressDetail}
              </Typography>
            ) : null}
            <LinearProgress
              variant="determinate"
              value={progress.value}
              sx={{
                height: 12,
                borderRadius: 999,
                bgcolor: '#e8eef6',
                '& .MuiLinearProgress-bar': {
                  bgcolor: CORP.blue,
                  borderRadius: 999,
                  transition: 'transform 0.35s ease',
                },
              }}
            />
            <Typography sx={{ color: CORP.muted, mt: 1, fontSize: 12 }}>
              Please keep this window open until it finishes.
            </Typography>
          </Box>
        ) : null}

        {validating && !progress.active ? (
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

        {validation && !validating ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              width: '100%',
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 0.75, flexShrink: 0 }}
            >
              <Chip
                size="small"
                color={validation.aiHeaderMapped ? 'primary' : 'default'}
                label={
                  validation.aiHeaderMapped ? 'AI mapped columns' : 'Built-in column mapping'
                }
                sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
              />
              <Chip
                size="small"
                color={validation.aiUsed ? 'primary' : 'warning'}
                label={
                  validation.aiUsed ? 'AI verified values' : 'Built-in value mapping only'
                }
                sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
              />
            </Stack>

            {Array.isArray(validation.headerMappings) && validation.headerMappings.length ? (
              <Box sx={{ mb: 0.75, flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 11.5, color: CORP.navy, mb: 0.5 }}>
                  Column mapping
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {validation.headerMappings.map((item) => (
                    <Chip
                      key={item.field}
                      size="small"
                      variant="outlined"
                      color={item.source === 'ai' ? 'primary' : 'default'}
                      label={`${item.header || '(blank)'} → ${item.label} (${item.source === 'ai' ? 'AI' : 'rules'})`}
                      sx={{
                        fontWeight: 600,
                        height: 22,
                        maxWidth: '100%',
                        fontSize: 11,
                        '& .MuiChip-label': {
                          px: 0.75,
                          py: 0,
                          fontSize: 11,
                          lineHeight: 1.2,
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            ) : null}

            {isMobile ? (
              <Box
                sx={{
                  mb: 1,
                  flexShrink: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 0.75,
                }}
              >
                {summaryRows.map(([label, value]) => {
                  const isIssue = label !== 'Columns' && Number(value) > 0;
                  const columnsFailed = label === 'Columns' && value === 'Failed';
                  return (
                    <Box
                      key={label}
                      sx={{
                        px: 1,
                        py: 0.75,
                        borderRadius: 1,
                        border: `1px solid ${CORP.line}`,
                        bgcolor: '#fff',
                        minWidth: 0,
                      }}
                    >
                      <Typography sx={{ fontSize: 10.5, color: CORP.muted, fontWeight: 700, lineHeight: 1.25 }}>
                        {label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: isIssue || columnsFailed ? '#b91c1c' : CORP.navy,
                          mt: 0.25,
                        }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            ) : (
            <TableContainer
              sx={{
                mb: 1,
                flexShrink: 0,
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                border: `1px solid ${CORP.line}`,
                borderRadius: 1,
                bgcolor: '#fff',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <Table size="small" sx={{ minWidth: 640, tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    {summaryRows.map(([label]) => (
                      <TableCell
                        key={label}
                        sx={{
                          ...headCellSx,
                          fontSize: 11,
                          whiteSpace: 'normal',
                          lineHeight: 1.25,
                          py: 0.6,
                          px: 0.75,
                        }}
                      >
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    {summaryRows.map(([label, value]) => {
                      const isIssue = label !== 'Columns' && Number(value) > 0;
                      const columnsFailed = label === 'Columns' && value === 'Failed';
                      return (
                        <TableCell
                          key={label}
                          sx={{
                            ...bodyCellSx,
                            fontWeight: 800,
                            fontSize: 13,
                            py: 0.65,
                            px: 0.75,
                            color: isIssue || columnsFailed ? '#b91c1c' : CORP.navy,
                          }}
                        >
                          {value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            )}

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
              <Box
                sx={{
                  flex: { xs: 'none', md: 1 },
                  minHeight: { xs: 280, md: 0 },
                  minWidth: 0,
                  width: '100%',
                  maxWidth: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
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
                  <Typography sx={{ fontWeight: 800, fontSize: 14, color: CORP.navy }}>
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
                    minHeight: { xs: 280, md: 0 },
                    maxHeight: { xs: '62dvh', md: 'none' },
                    minWidth: 0,
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    border: `1px solid ${CORP.line}`,
                    borderRadius: 1.5,
                    bgcolor: '#fff',
                    '& .MuiTableCell-stickyHeader': {
                      zIndex: 2,
                      bgcolor: '#f1f5f9',
                    },
                  }}
                >
                  <Table
                    size={isMobile ? 'small' : 'medium'}
                    stickyHeader
                    sx={{
                      minWidth: { xs: 640, sm: 860 },
                      tableLayout: 'fixed',
                      borderCollapse: 'separate',
                      '& tbody tr:last-of-type td': {
                        borderBottom: 0,
                        pb: 2,
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCellSx, width: { xs: 56, sm: 80 }, textAlign: 'center' }}>
                          Skip
                        </TableCell>
                        <TableCell sx={{ ...headCellSx, width: { xs: 52, sm: 72 } }}>Row</TableCell>
                        <TableCell sx={{ ...headCellSx, width: { xs: '34%', sm: '26%' } }}>Email</TableCell>
                        <TableCell sx={{ ...headCellSx, width: { xs: 88, sm: 120 } }}>Status</TableCell>
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
                        const aiNotes =
                          Array.isArray(row.aiNotes) && row.aiNotes.length
                            ? row.aiNotes.join(' ')
                            : '';
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
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 72,
                                  px: 1,
                                  py: 0.35,
                                  borderRadius: 1,
                                  fontWeight: 800,
                                  fontSize: 12,
                                  lineHeight: 1.2,
                                  color: isSkipped
                                    ? '#475569'
                                    : isOk
                                      ? '#166534'
                                      : '#b91c1c',
                                  bgcolor: isSkipped
                                    ? '#f1f5f9'
                                    : isOk
                                      ? '#dcfce7'
                                      : '#fee2e2',
                                  border: `1px solid ${
                                    isSkipped
                                      ? CORP.line
                                      : isOk
                                        ? '#86efac'
                                        : '#fecaca'
                                  }`,
                                }}
                              >
                                {isSkipped ? 'Skipped' : isOk ? 'Ready' : 'Error'}
                              </Box>
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
                                : (
                                  <>
                                    {detail}
                                    {aiNotes ? (
                                      <Typography
                                        component="span"
                                        sx={{ display: 'block', mt: 0.5, color: CORP.muted, fontSize: 11.5 }}
                                      >
                                        AI: {aiNotes}
                                      </Typography>
                                    ) : null}
                                  </>
                                )}
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
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1, sm: 1.25 },
          pb: { xs: 'max(12px, env(safe-area-inset-bottom))', sm: 1.25 },
          gap: 1,
          flexShrink: 0,
          flexWrap: 'wrap',
          alignItems: 'stretch',
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          '& > :not(style)': {
            width: { xs: '100%', sm: 'auto' },
          },
        }}
      >
        {validationFooterMessage ? (
          <Typography
            sx={{
              mr: { sm: 'auto' },
              fontSize: 12,
              lineHeight: 1.35,
              fontWeight: 600,
              color: canSubmit ? '#166534' : '#b45309',
              width: { xs: '100%', sm: 'auto' },
              flex: { sm: '1 1 auto' },
              minWidth: 0,
            }}
          >
            {validationFooterMessage}
          </Typography>
        ) : null}
        <Button onClick={onClose} disabled={submitting} color="inherit">
          Cancel
        </Button>
        <CorpBtn
          variant="blue"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting
            ? `Submitting… ${Math.round(progress.value)}%`
            : skippedErrorCount > 0
              ? `Submit ${readyRows.length} ready row(s)`
              : 'Submit enrolment'}
        </CorpBtn>
      </DialogActions>
    </Dialog>
  );
}
