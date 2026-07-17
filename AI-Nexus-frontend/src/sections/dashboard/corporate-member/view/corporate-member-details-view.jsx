import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';
import {
  downloadCorporateBulkEnrolmentZip,
  getCorporateBulkEnrolmentUploads,
  getCorporateLearners,
  getCorporateOverview,
} from 'src/services/corporate.service';

// ----------------------------------------------------------------------

const LEARNER_TABLE_HEAD = [
  { id: 'name', label: 'Learner' },
  { id: 'department', label: 'Department', width: 140 },
  { id: 'role', label: 'Role', width: 120 },
  { id: 'status', label: 'Status', width: 110 },
  { id: 'lastActive', label: 'Last Active', width: 120 },
  { id: 'cert', label: 'Certificate', width: 100 },
];

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function InfoRow({ label, value }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 0.75 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 120, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}

function MiniStat({ label, value }) {
  return (
    <Box sx={{ textAlign: 'center', px: 1.5 }}>
      <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Box>
  );
}

function statusColor(status) {
  if (status === 'Completed') return 'success';
  if (status === 'At Risk') return 'error';
  if (status === 'In Progress') return 'info';
  return 'default';
}

// ----------------------------------------------------------------------

export function CorporateMemberDetailsView({ user, loading, error }) {
  const learnerTable = useTable({ defaultCurrentPage: 0, defaultRowsPerPage: 5 });
  const zipTable = useTable({ defaultCurrentPage: 0, defaultRowsPerPage: 10 });

  const [overview, setOverview] = useState(null);
  const [learners, setLearners] = useState([]);
  const [learnerTotal, setLearnerTotal] = useState(0);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [uploadsTotal, setUploadsTotal] = useState(0);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const companyCode = String(user?.companyCode || '').trim();
  const fullName = user?.name || `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || '—';
  const accountStatusColor =
    (user?.status === 'Active' && 'success') ||
    (user?.status === 'Banned' && 'error') ||
    'warning';

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const metrics = useMemo(
    () => ({
      totalLearners: Number(overview?.metrics?.totalLearners) || learnerTotal || 0,
      completed: Number(overview?.metrics?.completed) || 0,
      atRisk: Number(overview?.metrics?.atRisk) || 0,
      certificatesReady: Number(overview?.metrics?.certificatesReady) || 0,
      zipFiles: uploadsTotal,
    }),
    [learnerTotal, overview, uploadsTotal]
  );

  const loadOverviewAndLearners = useCallback(async () => {
    if (!companyCode) {
      setOverview(null);
      setLearners([]);
      setLearnerTotal(0);
      return;
    }

    setLearnersLoading(true);
    try {
      const [overviewResult, learnersResult] = await Promise.all([
        getCorporateOverview(companyCode),
        getCorporateLearners({
          companyCode,
          page: learnerTable.page + 1,
          limit: learnerTable.rowsPerPage,
        }),
      ]);

      setOverview(overviewResult || null);
      setLearners(Array.isArray(learnersResult?.data) ? learnersResult.data : []);
      setLearnerTotal(Number(learnersResult?.pagination?.totalItems) || 0);
    } catch (err) {
      setOverview(null);
      setLearners([]);
      setLearnerTotal(0);
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to load company users',
      );
    } finally {
      setLearnersLoading(false);
    }
  }, [companyCode, learnerTable.page, learnerTable.rowsPerPage]);

  const loadUploads = useCallback(async () => {
    if (!companyCode) {
      setUploads([]);
      setUploadsTotal(0);
      return;
    }

    setUploadsLoading(true);
    try {
      const uploadsResult = await getCorporateBulkEnrolmentUploads({
        companyCode,
        page: zipTable.page + 1,
        limit: zipTable.rowsPerPage,
      });
      setUploads(Array.isArray(uploadsResult?.data) ? uploadsResult.data : []);
      setUploadsTotal(Number(uploadsResult?.pagination?.totalItems) || 0);
    } catch (err) {
      setUploads([]);
      setUploadsTotal(0);
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to load ZIP files',
      );
    } finally {
      setUploadsLoading(false);
    }
  }, [companyCode, zipTable.page, zipTable.rowsPerPage]);

  const loadCompanyContext = useCallback(async () => {
    await Promise.all([loadOverviewAndLearners(), loadUploads()]);
  }, [loadOverviewAndLearners, loadUploads]);

  useEffect(() => {
    loadOverviewAndLearners();
  }, [loadOverviewAndLearners]);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  const handleDownload = async (row) => {
    if (!row?.id || downloadingId) return;
    setDownloadingId(row.id);
    try {
      await downloadCorporateBulkEnrolmentZip(row.id, {
        fileName: row.originalFileName,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to download ZIP file');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !user) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Corporate member not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.corporateMember.list}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Corporate member details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Corporate Members', href: paths.admin.corporateMember.list },
          { name: fullName },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.corporateMember.list}
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back
          </Button>
        }
        sx={{ mb: 2 }}
      />

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <Avatar src={user.avatarUrl || undefined} sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
            {initials}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
              <Typography variant="subtitle1">{fullName}</Typography>
              <Chip size="small" color="info" label={user.role || 'Corporate'} />
              <Chip size="small" color={accountStatusColor} label={user.status || '—'} />
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {user.email || '—'}
              {companyCode ? ` · ${companyCode}` : ''}
            </Typography>
          </Box>

          <Stack direction="row" divider={<Divider orientation="vertical" flexItem />} spacing={0}>
            <MiniStat label="Users" value={metrics.totalLearners} />
            <MiniStat label="Completed" value={metrics.completed} />
            <MiniStat label="At risk" value={metrics.atRisk} />
            <MiniStat label="Certs" value={metrics.certificatesReady} />
            <MiniStat label="ZIPs" value={metrics.zipFiles} />
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Grid container spacing={{ xs: 0, md: 3 }}>
          <Grid xs={12} md={6}>
            <InfoRow label="Username" value={user.username} />
            <InfoRow label="Contact" value={user.contactNumber || user.phoneNumber} />
            <InfoRow label="Company code" value={user.companyCode} />
          </Grid>
          <Grid xs={12} md={6}>
            <InfoRow
              label="Registered"
              value={user.createdAt ? new Date(user.createdAt).toLocaleString() : null}
            />
            <InfoRow label="Email verified" value={user.isVerified ? 'Yes' : 'No'} />
            <InfoRow label="Auth provider" value={user.authProvider || 'LOCAL'} />
          </Grid>
        </Grid>
      </Card>

      <Card sx={{ mb: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5, borderBottom: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}` }}
        >
          <Typography variant="subtitle2">
            Company users ({metrics.totalLearners})
          </Typography>
          <Button
            size="small"
            variant="text"
            startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
            onClick={loadCompanyContext}
            disabled={!companyCode || learnersLoading}
          >
            Refresh
          </Button>
        </Stack>

        {!companyCode ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
            No company code linked.
          </Typography>
        ) : (
          <Box sx={{ position: 'relative' }}>
            {learnersLoading ? <TableLoadingOverlay minHeight={120} /> : null}

            <Scrollbar>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHeadCustom headLabel={LEARNER_TABLE_HEAD} />

                <TableBody>
                  {learners.map((row) => (
                    <TableRow key={row.userId || row.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.name || '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {row.email || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.department || '—'}</TableCell>
                      <TableCell>{row.role || '—'}</TableCell>
                      <TableCell>
                        <Label variant="soft" color={statusColor(row.status)}>
                          {row.status || '—'}
                        </Label>
                      </TableCell>
                      <TableCell>{row.lastActive || '—'}</TableCell>
                      <TableCell>
                        <Label variant="soft" color={row.cert ? 'success' : 'default'}>
                          {row.cert ? 'Yes' : 'No'}
                        </Label>
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableEmptyRows
                    height={48}
                    emptyRows={emptyRows(learnerTable.page, learnerTable.rowsPerPage, learnerTotal)}
                  />

                  <TableNoData notFound={!learnersLoading && learners.length === 0} />
                </TableBody>
              </Table>
            </Scrollbar>

            {learnerTotal > learnerTable.rowsPerPage ? (
              <TablePaginationCustom
                page={learnerTable.page}
                dense
                count={learnerTotal}
                rowsPerPage={learnerTable.rowsPerPage}
                onPageChange={learnerTable.onChangePage}
                onRowsPerPageChange={learnerTable.onChangeRowsPerPage}
              />
            ) : null}
          </Box>
        )}
      </Card>

      <Card>
        <Typography
          variant="subtitle2"
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
          }}
        >
          Bulk enrolment ZIP files ({uploadsTotal})
        </Typography>

        {!companyCode ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
            No company code linked.
          </Typography>
        ) : uploadsLoading && uploads.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
            Loading…
          </Typography>
        ) : uploads.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
            No ZIP files uploaded yet.
          </Typography>
        ) : (
          <>
            <Box sx={{ position: 'relative' }}>
              {uploadsLoading ? <TableLoadingOverlay minHeight={80} /> : null}

              <Stack divider={<Divider />} sx={{ px: 2 }}>
                {uploads.map((file) => (
                  <Stack
                    key={file.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                    sx={{ py: 1.25 }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                        {file.originalFileName || 'bulk-enrolment.zip'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatBytes(file.sizeBytes)}
                        {file.createdAt ? ` · ${new Date(file.createdAt).toLocaleString()}` : ''}
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="solar:download-bold" width={16} />}
                      disabled={Boolean(downloadingId)}
                      onClick={() => handleDownload(file)}
                      sx={{ flexShrink: 0 }}
                    >
                      {downloadingId === file.id ? 'Downloading…' : 'Download'}
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {uploadsTotal > zipTable.rowsPerPage ? (
              <TablePaginationCustom
                page={zipTable.page}
                dense
                count={uploadsTotal}
                rowsPerPage={zipTable.rowsPerPage}
                onPageChange={zipTable.onChangePage}
                onRowsPerPageChange={zipTable.onChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            ) : null}
          </>
        )}
      </Card>
    </DashboardContent>
  );
}
