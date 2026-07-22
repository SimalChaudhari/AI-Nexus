import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useDebounce } from 'src/hooks/use-debounce';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import {
  useTable,
  emptyRows,
  TablePaginationCustom,
  TableLoadingOverlay,
} from 'src/components/table';

import { CourseAssignmentSubmissionsTable } from './assignment-submissions/course-assignment-submissions-table';
import { CourseAssignmentSubmissionsManualVerifyDialog } from './assignment-submissions/course-assignment-submissions-manual-verify-dialog';
import { CourseAssignmentVerificationLogDialog } from './assignment-submissions/course-assignment-verification-log-dialog';
import { useCourseAssignmentSubmissions } from './assignment-submissions/use-course-assignment-submissions';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'learner', label: 'Learner', width: 200 },
  { id: 'module', label: 'Module', width: 160 },
  { id: 'assessment', label: 'Assessment', width: 180 },
  { id: 'files', label: 'Files', width: 180 },
  { id: 'attempts', label: 'Attempts', width: 100 },
  { id: 'status', label: 'Status', width: 140 },
  { id: 'submitted', label: 'Submitted', width: 150 },
  { id: 'actions', label: 'Actions', width: 120, align: 'right' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'verified_pass', label: 'Verified pass' },
  { value: 'verified_fail', label: 'Verified fail' },
  { value: 'draft', label: 'Draft' },
];

function StatChip({ label, value, color = 'default' }) {
  return (
    <Stack
      spacing={0.25}
      sx={{
        px: 1.5,
        py: 1,
        minWidth: 96,
        borderRadius: 1.5,
        bgcolor: 'background.neutral',
        border: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Label variant="soft" color={color} sx={{ width: 'fit-content' }}>
        {value}
      </Label>
    </Stack>
  );
}

export function CourseAssignmentSubmissionsPanel({ courseId, sx }) {
  const table = useTable({ defaultCurrentPage: 0, defaultRowsPerPage: 10 });
  const [logTarget, setLogTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterUserId, setFilterUserId] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const submissions = useCourseAssignmentSubmissions(courseId, {
    filterUserId,
    search: debouncedSearch,
    status: statusFilter,
    page: table.page,
    rowsPerPage: table.rowsPerPage,
  });

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, filterUserId, courseId]);

  if (!courseId) return null;

  const notFound = !submissions.loading && submissions.rows.length === 0;
  const denseHeight = table.dense ? 56 : 76;
  const stats = submissions.stats || { total: 0, pending: 0, passed: 0, failed: 0 };

  return (
    <Card sx={{ width: 1, overflow: 'hidden', ...sx }}>
      <Stack
        spacing={2}
        sx={{
          p: { xs: 2, md: 2.5 },
          pb: 2,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <Iconify icon="solar:clipboard-check-bold" width={22} />
            <Typography variant="h6" noWrap>
              Submissions
            </Typography>
          </Stack>

          <Button
            size="small"
            variant="outlined"
            startIcon={
              submissions.loading ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Iconify icon="solar:refresh-bold" width={16} />
              )
            }
            disabled={submissions.loading}
            onClick={() => submissions.loadRows({ silent: false })}
            sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
          >
            Refresh
          </Button>
        </Stack>

        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
          <StatChip label="Total" value={stats.total} color="default" />
          <StatChip label="Pending review" value={stats.pending} color="warning" />
          <StatChip label="Verified pass" value={stats.passed} color="success" />
          <StatChip label="Verified fail" value={stats.failed} color="error" />
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learner, email, assessment…"
            sx={{ flex: 1, minWidth: 0 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: { xs: 0, sm: 180 }, width: { xs: 1, sm: 'auto' } }}
          >
            {STATUS_FILTERS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {submissions.userOptions.length > 1 ? (
            <TextField
              select
              size="small"
              label="Learner"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              sx={{ minWidth: { xs: 0, sm: 200 }, width: { xs: 1, sm: 'auto' } }}
            >
              <MenuItem value="">All learners</MenuItem>
              {submissions.userOptions.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.label}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
        </Stack>
      </Stack>

      <Box sx={{ position: 'relative', width: 1 }}>
        {submissions.loading ? <TableLoadingOverlay /> : null}

        <Scrollbar>
          <CourseAssignmentSubmissionsTable
            rows={submissions.rows}
            headLabel={TABLE_HEAD}
            deletingId={submissions.deletingId}
            verifyingId={submissions.verifyingId}
            onDeleteRow={submissions.setDeleteTarget}
            onVerifyRow={submissions.setVerifyTarget}
            onViewLogRow={setLogTarget}
            notFound={notFound}
            emptyRowsCount={emptyRows(table.page, table.rowsPerPage, submissions.totalItems)}
            emptyRowsHeight={denseHeight}
          />
        </Scrollbar>
      </Box>

      <TablePaginationCustom
        page={table.page}
        dense={table.dense}
        count={submissions.totalItems}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        onChangeDense={table.onChangeDense}
        onRowsPerPageChange={table.onChangeRowsPerPage}
      />

      <CourseAssignmentVerificationLogDialog
        open={Boolean(logTarget)}
        submission={logTarget}
        onClose={() => setLogTarget(null)}
      />

      <CourseAssignmentSubmissionsManualVerifyDialog
        open={Boolean(submissions.verifyTarget)}
        row={submissions.verifyTarget}
        saving={Boolean(submissions.verifyingId)}
        onClose={() => submissions.setVerifyTarget(null)}
        onSubmit={submissions.handleManualVerify}
      />

      <ConfirmDialog
        open={Boolean(submissions.deleteTarget)}
        onClose={() => submissions.setDeleteTarget(null)}
        title="Delete submission"
        content={
          submissions.deleteTarget
            ? `Remove the uploaded file(s) from ${submissions.deleteTarget.userName || 'this learner'}? This cannot be undone.`
            : ''
        }
        action={
          <Button
            variant="contained"
            color="error"
            disabled={Boolean(submissions.deletingId)}
            onClick={submissions.handleConfirmDelete}
          >
            Delete
          </Button>
        }
      />
    </Card>
  );
}
