import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';

import { paths } from 'src/routes/paths';

import { useBoolean } from 'src/hooks/use-boolean';
import { useDebounce } from 'src/hooks/use-debounce';
import { useSetState } from 'src/hooks/use-set-state';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';

import { fDateTime } from 'src/utils/format-time';
import { courseService } from 'src/services/course.service';
import { appSettingsService } from 'src/services/app-settings.service';
import { CourseCertificatesTableToolbar } from '../course-certificates-table-toolbar';
import { CourseCertificatesTableFiltersResult } from '../course-certificates-table-filters-result';

const TABLE_HEAD = [
  { id: 'certificateNo', label: 'Certificate No' },
  { id: 'learnerName', label: 'Learner' },
  { id: 'learnerEmail', label: 'Email', width: 220 },
  { id: 'courseTitle', label: 'Course' },
  { id: 'status', label: 'Status', width: 200 },
  { id: 'completedAt', label: 'Completed At', width: 170 },
  { id: 'action', label: 'Action', width: 140 },
];

function applyFilter({ inputData, comparator, filters }) {
  const stabilizedThis = inputData.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  let data = stabilizedThis.map((el) => el[0]);

  const search = String(filters.search || '').trim().toLowerCase();
  if (search) {
    data = data.filter((row) => {
      const hay = [
        row.certificateNo,
        row.learnerName,
        row.learnerEmail,
        row.courseTitle,
      ]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return hay.includes(search);
    });
  }

  const userName = String(filters.userName || '').trim().toLowerCase();
  if (userName) {
    data = data.filter((row) => String(row.learnerName || '').toLowerCase().includes(userName));
  }

  const courseTitle = String(filters.courseTitle || '').trim().toLowerCase();
  if (courseTitle) {
    data = data.filter((row) => String(row.courseTitle || '').toLowerCase().includes(courseTitle));
  }

  return data;
}

function StatusChips({ row }) {
  const certBlocked = Boolean(row.certificateBlocked);
  const badgeBlocked = Boolean(row.badgeBlocked);

  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      <Chip
        size="small"
        label={certBlocked ? 'Cert blocked' : 'Certificate'}
        color={certBlocked ? 'warning' : 'success'}
        variant="soft"
      />
      <Chip
        size="small"
        label={badgeBlocked ? 'Badge blocked' : 'Badge'}
        color={badgeBlocked ? 'warning' : 'info'}
        variant="soft"
      />
    </Stack>
  );
}

export function CourseCertificatesView() {
  const table = useTable({ defaultCurrentPage: 0, defaultRowsPerPage: 10 });
  const filters = useSetState({ search: '', userName: '', courseTitle: '' });
  const confirm = useBoolean();
  const sfBackfillConfirm = useBoolean();

  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [targetRow, setTargetRow] = useState(null);
  const [dialogMode, setDialogMode] = useState('block'); // block | unblock
  const [blockCertificate, setBlockCertificate] = useState(true);
  const [blockBadge, setBlockBadge] = useState(true);
  const [hideAllCertificates, setHideAllCertificates] = useState(false);
  const [hideAllBadges, setHideAllBadges] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(true);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [sfBackfillLoading, setSfBackfillLoading] = useState(false);
  const [sfBackfillSummary, setSfBackfillSummary] = useState(null);
  const debouncedSearch = useDebounce(filters.state.search, 500);

  const loadVisibility = useCallback(async () => {
    try {
      setVisibilityLoading(true);
      const data = await appSettingsService.getCredentialVisibility();
      setHideAllCertificates(Boolean(data.hideAllCertificates));
      setHideAllBadges(Boolean(data.hideAllBadges));
    } catch (error) {
      toast.error(error?.message || 'Failed to load visibility settings');
    } finally {
      setVisibilityLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisibility();
  }, [loadVisibility]);

  const handleGlobalToggle = useCallback(
    async (field, nextValue) => {
      const previous = {
        hideAllCertificates,
        hideAllBadges,
      };
      const payload =
        field === 'hideAllCertificates'
          ? { hideAllCertificates: nextValue }
          : { hideAllBadges: nextValue };

      if (field === 'hideAllCertificates') setHideAllCertificates(nextValue);
      else setHideAllBadges(nextValue);

      setVisibilitySaving(true);
      try {
        const data = await appSettingsService.updateCredentialVisibility(payload);
        setHideAllCertificates(Boolean(data.hideAllCertificates));
        setHideAllBadges(Boolean(data.hideAllBadges));
        toast.success(
          field === 'hideAllCertificates'
            ? nextValue
              ? 'All certificates are now hidden from learners'
              : 'Certificates are visible to learners again'
            : nextValue
              ? 'All digital badges are now hidden from learners'
              : 'Digital badges are visible to learners again'
        );
      } catch (error) {
        setHideAllCertificates(previous.hideAllCertificates);
        setHideAllBadges(previous.hideAllBadges);
        toast.error(error?.message || 'Failed to update visibility');
      } finally {
        setVisibilitySaving(false);
      }
    },
    [hideAllBadges, hideAllCertificates]
  );

  const handleSalesforceBackfill = useCallback(async ({ dryRun = false } = {}) => {
    setSfBackfillLoading(true);
    try {
      const data = await courseService.backfillSalesforceBadges({ dryRun });
      setSfBackfillSummary(data || null);
      if (dryRun) {
        toast.success(
          `Dry run: ${Number(data?.eligible) || 0} learner(s) eligible for Salesforce badge sync`
        );
      } else {
        toast.success(
          `Salesforce sync done — created: ${Number(data?.created) || 0}, already exists: ${Number(data?.alreadyExists) || 0}, failed: ${Number(data?.failed) || 0}`
        );
      }
      sfBackfillConfirm.onFalse();
    } catch (error) {
      toast.error(error?.message || 'Failed to sync Salesforce badges');
    } finally {
      setSfBackfillLoading(false);
    }
  }, [sfBackfillConfirm]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await courseService.getAdminCertificates({
        page: table.page + 1,
        limit: table.rowsPerPage || 10,
        q: debouncedSearch || undefined,
        userName: filters.state.userName || undefined,
        courseTitle: filters.state.courseTitle || undefined,
      });
      setTableData(result.data || []);
      setPagination(result.pagination || null);
    } catch (error) {
      toast.error(error?.message || 'Failed to load certificates');
      setTableData([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.state.courseTitle, filters.state.userName, table.page, table.rowsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator('desc', 'completedAt'),
    filters: filters.state,
  });

  const dataInPage = dataFiltered;
  const userOptions = useMemo(
    () =>
      [...new Set((tableData || []).map((row) => String(row.learnerName || '').trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [tableData]
  );
  const courseOptions = useMemo(
    () =>
      [...new Set((tableData || []).map((row) => String(row.courseTitle || '').trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [tableData]
  );
  const canReset =
    !!filters.state.search || !!filters.state.userName || !!filters.state.courseTitle;
  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const openBlockDialog = useCallback(
    (row) => {
      setTargetRow(row);
      setDialogMode('block');
      setBlockCertificate(true);
      setBlockBadge(true);
      confirm.onTrue();
    },
    [confirm]
  );

  const openUnblockDialog = useCallback(
    (row) => {
      setTargetRow(row);
      setDialogMode('unblock');
      setBlockCertificate(Boolean(row.certificateBlocked));
      setBlockBadge(Boolean(row.badgeBlocked));
      confirm.onTrue();
    },
    [confirm]
  );

  const handleConfirmAction = useCallback(async () => {
    if (!targetRow?.id) return;
    if (!blockCertificate && !blockBadge) {
      toast.error('Select Certificate, Badge, or both');
      return;
    }

    const targets = {
      certificate: blockCertificate,
      badge: blockBadge,
    };

    setSaving(true);
    try {
      if (dialogMode === 'unblock') {
        await courseService.unblockAdminCertificate(targetRow.id, targets);
        toast.success(
          [
            blockCertificate ? 'Certificate' : null,
            blockBadge ? 'Badge' : null,
          ]
            .filter(Boolean)
            .join(' & ') + ' unblocked — learner can view them again'
        );
      } else {
        await courseService.blockAdminCertificate(targetRow.id, targets);
        toast.success(
          [
            blockCertificate ? 'Certificate' : null,
            blockBadge ? 'Badge' : null,
          ]
            .filter(Boolean)
            .join(' & ') + ' blocked — learner can no longer view them'
        );
      }
      confirm.onFalse();
      setTargetRow(null);
      await loadData();
    } catch (error) {
      toast.error(error?.message || 'Failed to update credential status');
    } finally {
      setSaving(false);
    }
  }, [blockBadge, blockCertificate, confirm, dialogMode, loadData, targetRow]);

  const handleDownload = useCallback(async (row) => {
    if (!row?.id) return;
    setDownloadingId(row.id);
    try {
      const blob = await courseService.downloadAdminCertificatePdf(row.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = String(row.learnerName || 'Learner').replace(/[^a-z0-9]+/gi, '-');
      link.download = `Certificate-${row.certificateNo || safeName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.message || 'Failed to download certificate');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const learnerLabel = targetRow?.learnerName || 'this learner';
  const isUnblock = dialogMode === 'unblock';

  return (
    <>
      <DashboardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: { xs: 2, md: 3 } }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Certificates
            </Typography>
          </Box>
          <Box
            sx={{
              width: { xs: 40, md: 48 },
              height: { xs: 40, md: 48 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1.5,
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            }}
          >
            <Iconify icon="solar:medal-ribbons-star-bold" width={24} sx={{ color: 'common.white' }} />
          </Box>
        </Stack>

        <CustomBreadcrumbs
          heading=""
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Course', href: paths.admin.course.list },
            { name: 'Certificates' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card sx={{ p: 2.5, mb: 2.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Global learner visibility
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hide all certificates and/or digital badges from every learner at once.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />}
            >
              <FormControlLabel
                control={
                  <Switch
                    color="warning"
                    checked={hideAllCertificates}
                    disabled={visibilityLoading || visibilitySaving}
                    onChange={(e) => handleGlobalToggle('hideAllCertificates', e.target.checked)}
                  />
                }
                label={
                  <Stack spacing={0.25} sx={{ pr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Hide all certificates
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {hideAllCertificates ? 'Hidden from learners' : 'Visible to learners'}
                    </Typography>
                  </Stack>
                }
                sx={{ m: 0, mr: { sm: 1 } }}
              />
              <FormControlLabel
                control={
                  <Switch
                    color="warning"
                    checked={hideAllBadges}
                    disabled={visibilityLoading || visibilitySaving}
                    onChange={(e) => handleGlobalToggle('hideAllBadges', e.target.checked)}
                  />
                }
                label={
                  <Stack spacing={0.25} sx={{ pr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Hide all badges
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {hideAllBadges ? 'Hidden from learners' : 'Visible to learners'}
                    </Typography>
                  </Stack>
                }
                sx={{ m: 0 }}
              />
            </Stack>
          </Stack>
        </Card>

        <Card sx={{ p: 2.5, mb: 2.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Salesforce badge sync
              </Typography>
              <Typography variant="body2" color="text.secondary">
                One-time backfill for learners who already have a local badge. Creates the badge in
                Salesforce via createbadgeforainexus.
              </Typography>
              {sfBackfillSummary ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Last run{sfBackfillSummary.dryRun ? ' (dry run)' : ''}: eligible{' '}
                  {Number(sfBackfillSummary.eligible) || 0}, created{' '}
                  {Number(sfBackfillSummary.created) || 0}, already exists{' '}
                  {Number(sfBackfillSummary.alreadyExists) || 0}, failed{' '}
                  {Number(sfBackfillSummary.failed) || 0}, no accountId{' '}
                  {Number(sfBackfillSummary.skippedNoAccountId) || 0}
                </Typography>
              ) : null}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
              <Button
                variant="outlined"
                color="inherit"
                disabled={sfBackfillLoading}
                onClick={() => handleSalesforceBackfill({ dryRun: true })}
                startIcon={
                  sfBackfillLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="solar:eye-bold" />
                  )
                }
              >
                Dry run
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={sfBackfillLoading}
                onClick={sfBackfillConfirm.onTrue}
                startIcon={<Iconify icon="solar:cloud-upload-bold" />}
              >
                Sync to Salesforce
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Card>
          <CourseCertificatesTableToolbar
            filters={filters}
            onResetPage={table.onResetPage}
            userOptions={userOptions}
            courseOptions={courseOptions}
          />

          {canReset && (
            <CourseCertificatesTableFiltersResult
              filters={filters}
              totalResults={dataFiltered.length}
              onResetPage={table.onResetPage}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <Box sx={{ position: 'relative' }}>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1060 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  onSort={table.onSort}
                />
                <TableBody>
                  {dataInPage.map((row) => {
                    const anyBlocked = Boolean(row.certificateBlocked || row.badgeBlocked);

                    return (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Iconify
                              icon="solar:medal-ribbons-star-bold"
                              width={22}
                              sx={{ color: 'success.main' }}
                            />
                            <Typography variant="body2">{row.certificateNo || '—'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.learnerName || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" noWrap>
                            {row.learnerEmail || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 240 }}>
                          <Typography variant="body2" noWrap>
                            {row.courseTitle || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChips row={row} />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {row.completedAt ? fDateTime(row.completedAt) : '—'}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} sx={{ px: 0.5 }}>
                            <Tooltip title="Download">
                              <span>
                                <IconButton
                                  color="primary"
                                  disabled={downloadingId === row.id || row.certificateBlocked}
                                  onClick={() => handleDownload(row)}
                                >
                                  {downloadingId === row.id ? (
                                    <CircularProgress size={18} color="inherit" />
                                  ) : (
                                    <Iconify icon="solar:download-minimalistic-bold" />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                            {anyBlocked ? (
                              <Tooltip title="Unblock">
                                <IconButton color="success" onClick={() => openUnblockDialog(row)}>
                                  <Iconify icon="solar:shield-check-bold" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Block">
                                <IconButton color="warning" onClick={() => openBlockDialog(row)}>
                                  <Iconify icon="solar:shield-cross-bold" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  <TableEmptyRows
                    height={table.dense ? 56 : 76}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                  />
                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
            {loading && <TableLoadingOverlay minHeight={220} />}
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={pagination?.totalItems || dataFiltered.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 30]}
          />
        </Card>
      </DashboardContent>

      <ConfirmDialog
        open={confirm.value}
        onClose={() => {
          if (saving) return;
          confirm.onFalse();
          setTargetRow(null);
        }}
        title={isUnblock ? 'Unblock credentials' : 'Block credentials'}
        content={
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2">
              {isUnblock
                ? `Choose what to restore for ${learnerLabel}. The learner will be able to view the selected items again.`
                : `Choose what to block for ${learnerLabel}. The learner will no longer see the selected items.`}
            </Typography>

            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={blockCertificate}
                    onChange={(e) => setBlockCertificate(e.target.checked)}
                    disabled={saving || (isUnblock && !targetRow?.certificateBlocked)}
                  />
                }
                label="Certificate"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={blockBadge}
                    onChange={(e) => setBlockBadge(e.target.checked)}
                    disabled={saving || (isUnblock && !targetRow?.badgeBlocked)}
                  />
                }
                label="Digital badge"
              />
            </Stack>

            <Typography variant="caption" color="text.secondary">
              You can select Certificate only, Badge only, or both.
            </Typography>
          </Stack>
        }
        action={
          <Button
            variant="contained"
            color={isUnblock ? 'success' : 'warning'}
            disabled={saving || (!blockCertificate && !blockBadge)}
            onClick={handleConfirmAction}
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Iconify
                  icon={isUnblock ? 'solar:shield-check-bold' : 'solar:shield-cross-bold'}
                />
              )
            }
          >
            {isUnblock ? 'Confirm unblock' : 'Confirm block'}
          </Button>
        }
      />

      <ConfirmDialog
        open={sfBackfillConfirm.value}
        onClose={() => {
          if (sfBackfillLoading) return;
          sfBackfillConfirm.onFalse();
        }}
        title="Sync badges to Salesforce"
        content={
          <Typography variant="body2">
            This will create Salesforce badges for learners who already have an active local badge
            and a Salesforce account ID. Existing Salesforce badges are skipped. Continue?
          </Typography>
        }
        action={
          <Button
            variant="contained"
            color="primary"
            disabled={sfBackfillLoading}
            onClick={() => handleSalesforceBackfill({ dryRun: false })}
            startIcon={
              sfBackfillLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Iconify icon="solar:cloud-upload-bold" />
              )
            }
          >
            Sync now
          </Button>
        }
      />
    </>
  );
}
