import { useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { userService } from 'src/services/user.service';

// ----------------------------------------------------------------------

function formatApiError(err, fallback) {
  const raw = err?.response?.data?.message ?? err?.message ?? fallback;
  const text = Array.isArray(raw) ? raw.filter(Boolean).join(', ') : String(raw || fallback);
  return text.trim() || fallback;
}

function maskIdNumber(value) {
  const normalized = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!normalized) return '—';
  if (normalized.length >= 5) return `${normalized[0]}****${normalized.slice(-4)}`;
  return '****';
}

export function UserBulkEnrolmentView() {
  const fileInputRef = useRef(null);
  const [companyCode, setCompanyCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [file, setFile] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [applyResult, setApplyResult] = useState(null);

  const rows = preview?.rows || [];
  const canPreview = Boolean(file && companyCode.trim() && companyName.trim());
  const canApply = Boolean(preview?.rows?.length) && !previewing && !applying;

  const summaryChips = useMemo(() => {
    if (!preview) return [];
    return [
      { label: `${preview.total || 0} learners`, color: 'default' },
      { label: `${preview.willInsert || 0} insert`, color: 'success' },
      { label: `${preview.willUpdate || 0} update`, color: 'info' },
      {
        label: preview.aiHeaderMapped ? 'AI mapped columns' : 'Built-in column mapping',
        color: preview.aiHeaderMapped ? 'primary' : 'default',
      },
      {
        label: preview.aiUsed ? 'AI verified values' : 'Built-in value mapping only',
        color: preview.aiUsed ? 'primary' : 'warning',
      },
    ];
  }, [preview]);

  const handlePickFile = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setPreview(null);
    setApplyResult(null);
  };

  const handlePreview = async () => {
    if (!canPreview) {
      toast.error('Enter company code, company name, and choose an Excel file.');
      return;
    }
    setPreviewing(true);
    setApplyResult(null);
    try {
      const data = await userService.previewBulkEnrolment({
        file,
        companyCode: companyCode.trim(),
        companyName: companyName.trim(),
      });
      setPreview(data);
      toast.success(`Mapped ${data?.total || 0} learner rows.`);
    } catch (err) {
      toast.error(formatApiError(err, 'Could not preview the Excel file.'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!canApply) return;
    setApplying(true);
    try {
      const data = await userService.applyBulkEnrolment({
        companyCode: preview.companyCode || companyCode.trim(),
        companyName: preview.companyName || companyName.trim(),
        rows: preview.rows,
      });
      setApplyResult(data);
      setConfirmOpen(false);
      toast.success(
        `Saved ${data?.inserted || 0} new users and updated ${data?.updated || 0} existing users.`,
      );
    } catch (err) {
      toast.error(formatApiError(err, 'Could not apply enrolment.'));
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Bulk enrolment"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'User', href: paths.admin.user.list },
            { name: 'Bulk enrolment' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Stack spacing={3}>
          <Card>
            <CardHeader
              title="Upload enrolment Excel"
              subheader="Same ISCA bulk enrolment columns as the corporate template. Existing users keep filled values; empty fields and company details are filled in. New users are inserted as verified OAuth users."
            />
            <CardContent>
              <Stack spacing={2.5}>
                <Alert severity="info">
                  AI first maps messy Excel headers (for example &quot;First Name -&quot; to First
                  name, or Corporate email to Email), then checks each row&apos;s category, country,
                  ID type, and account type. If AI is unavailable, built-in header and value mapping
                  is used.
                </Alert>

                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                  }}
                >
                  <TextField
                    label="Company code"
                    value={companyCode}
                    onChange={(event) => setCompanyCode(event.target.value)}
                    placeholder="e.g. 1000110582"
                    required
                  />
                  <TextField
                    label="Company name"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="e.g. AEM HOLDINGS LTD."
                    required
                  />
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                  <input
                    ref={fileInputRef}
                    hidden
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handlePickFile}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<Iconify icon="solar:upload-bold" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Excel
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {file ? file.name : 'No file selected'}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    variant="contained"
                    disabled={!canPreview || previewing}
                    onClick={handlePreview}
                    startIcon={
                      previewing ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Iconify icon="solar:eye-bold" />
                      )
                    }
                  >
                    {previewing ? 'Mapping & verifying…' : 'Preview & verify with AI'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {preview ? (
            <Card>
              <CardHeader
                title="Preview"
                subheader="Review mapped rows, then apply to create missing users and fill empty fields on existing ones."
                action={
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!canApply}
                    onClick={() => setConfirmOpen(true)}
                    startIcon={<Iconify icon="solar:check-circle-bold" />}
                  >
                    Apply enrolment
                  </Button>
                }
              />
              <CardContent>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {summaryChips.map((chip) => (
                    <Chip key={chip.label} label={chip.label} color={chip.color} size="small" />
                  ))}
                </Stack>

                {preview.headerMappings?.length ? (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Excel column mapping
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {preview.headerMappings.map((item) => (
                        <Chip
                          key={item.field}
                          size="small"
                          variant="outlined"
                          color={item.source === 'ai' ? 'primary' : 'default'}
                          label={`${item.header || '(blank)'} → ${item.label} (${item.source === 'ai' ? 'AI' : 'rules'})`}
                        />
                      ))}
                    </Stack>
                  </Box>
                ) : null}

                {applyResult ? (
                  <Alert
                    severity={applyResult.failed ? 'warning' : 'success'}
                    sx={{ mb: 2 }}
                  >
                    Inserted {applyResult.inserted || 0}, updated {applyResult.updated || 0}
                    {applyResult.failed
                      ? `, failed ${applyResult.failed}.`
                      : '.'}
                  </Alert>
                ) : null}

                <TableContainer>
                  <Scrollbar>
                    <Table size="small" sx={{ minWidth: 960 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Email</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Country</TableCell>
                          <TableCell>Account type</TableCell>
                          <TableCell>ID</TableCell>
                          <TableCell>Action</TableCell>
                          <TableCell>AI notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.email} hover>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>
                              {[row.firstname, row.lastname].filter(Boolean).join(' ')}
                            </TableCell>
                            <TableCell>{row.eligibility}</TableCell>
                            <TableCell>{row.countryOfResidence}</TableCell>
                            <TableCell>{row.accountType || '—'}</TableCell>
                            <TableCell>
                              {row.idType || '—'}
                              {row.idNumber ? ` · ${maskIdNumber(row.idNumber)}` : ''}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={row.action === 'insert' ? 'Insert' : 'Update'}
                                color={row.action === 'insert' ? 'success' : 'info'}
                              />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 280 }}>
                              <Typography variant="caption" color="text.secondary">
                                {(row.aiNotes || []).join(' ')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Scrollbar>
                </TableContainer>
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      </DashboardContent>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Apply bulk enrolment?"
        content={`This will insert ${preview?.willInsert || 0} new users and fill missing fields on ${preview?.willUpdate || 0} existing users for ${companyName.trim() || 'this company'}.`}
        action={
          <Button variant="contained" disabled={applying} onClick={handleApply}>
            {applying ? 'Saving…' : 'Apply'}
          </Button>
        }
      />
    </>
  );
}
