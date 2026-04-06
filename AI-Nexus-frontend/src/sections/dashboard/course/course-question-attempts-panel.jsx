import { useCallback, useEffect, useState } from 'react';

import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { courseService } from 'src/services/course.service';
import { toast } from 'src/components/snackbar';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { Iconify } from 'src/components/iconify';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

const TABLE_HEAD = [
  { id: 'course', label: 'Course' },
  { id: 'user', label: 'User' },
  { id: 'module', label: 'Module' },
  { id: 'attempt', label: 'Attempt', width: 90 },
  { id: 'status', label: 'Status', width: 110 },
  { id: 'score', label: 'Score', width: 90 },
  { id: 'answered', label: 'Answered', width: 110 },
  { id: 'started', label: 'Started', width: 170 },
  { id: 'completed', label: 'Completed', width: 170 },
  { id: 'actions', label: 'Actions', width: 70 },
];

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export function CourseQuestionAttemptsPanel({ courseId, sx }) {
  const table = useTable({ defaultRowsPerPage: 10 });
  const [attempts, setAttempts] = useState([]);
  const [attemptUsers, setAttemptUsers] = useState([]);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [attemptUserId, setAttemptUserId] = useState('');
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadAttempts = useCallback(async () => {
    setAttemptsLoading(true);
    try {
      const data = await courseService.getCourseQuestionAttempts(courseId, {
        // Backend expects 1-based page.
        page: table.page + 1,
        limit: table.rowsPerPage,
        userId: attemptUserId || undefined,
      });
      setAttempts(Array.isArray(data?.items) ? data.items : []);
      setAttemptUsers(Array.isArray(data?.users) ? data.users : []);
      setAttemptsTotal(Number(data?.total || 0));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load attempts');
      setAttempts([]);
      setAttemptUsers([]);
      setAttemptsTotal(0);
    } finally {
      setAttemptsLoading(false);
    }
  }, [attemptUserId, courseId, table.page, table.rowsPerPage]);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  return (
    <Card sx={{ p: 3, ...sx }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="h6">Quiz attempts (Learners)</Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            size="small"
            color="secondary"
            variant="soft"
            label={attemptUserId ? `${attemptsTotal} attempts` : `${attemptsTotal} recent completers`}
          />
          <Button
            color="error"
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={18} />}
            onClick={() => setClearConfirmOpen(true)}
            disabled={attemptsTotal <= 0}
          >
            Clear attempts
          </Button>
        </Stack>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
        Default shows top recent completers. Choose a learner to view their full quiz history.
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>User filter</InputLabel>
          <Select
            label="User filter"
            value={attemptUserId}
            onChange={(e) => {
              setAttemptUserId(e.target.value);
                table.onResetPage();
            }}
          >
            <MenuItem value="">Top completed users</MenuItem>
            {attemptUsers.map((u) => (
              <MenuItem key={u.userId} value={u.userId}>
                {u.userName} ({u.attempts})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {attemptsLoading ? (
        <Box
          sx={{
            minHeight: 260,
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.neutral',
          }}
        >
          <Stack spacing={1.25} alignItems="center">
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Loading quiz attempts...
            </Typography>
          </Stack>
        </Box>
      ) : attempts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No quiz attempts yet.
        </Typography>
      ) : (
        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 980 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} />
              <TableBody>
                {attempts.map((row) => (
                  <TableRow key={row.attemptId}>
                    <TableCell>{row.courseTitle || row.courseId || '—'}</TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2">{row.userName || row.userId}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {row.userEmail || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{row.moduleTitle || 'Whole course'}</TableCell>
                    <TableCell>#{row.attemptNumber || 0}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={row.status === 'completed' ? 'success' : 'warning'}
                        variant="soft"
                        label={row.status === 'completed' ? 'Completed' : 'Started'}
                      />
                    </TableCell>
                    <TableCell>{Number(row.scorePercent || 0).toFixed(2)}%</TableCell>
                    <TableCell>
                      {row.correctAnswers || 0} / {row.totalQuestions || 0}
                    </TableCell>
                    <TableCell>{formatDateTime(row.startedAt)}</TableCell>
                    <TableCell>{formatDateTime(row.completedAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete attempt">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, attemptsTotal)}
                />
                <TableNoData notFound={!attemptsLoading && attempts.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>
      )}
      <TablePaginationCustom
        page={table.page}
        dense={table.dense}
        count={attemptsTotal}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        onRowsPerPageChange={table.onChangeRowsPerPage}
        onChangeDense={table.onChangeDense}
        rowsPerPageOptions={[10, 25, 50]}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete attempt"
        content="Delete this quiz attempt record?"
        action={
          <Button
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={async () => {
              if (!deleteTarget?.attemptId) return;
              setDeleting(true);
              try {
                await courseService.deleteCourseQuestionAttempt(deleteTarget.attemptId);
                toast.success('Attempt deleted');
                setDeleteTarget(null);
                await loadAttempts();
              } catch (e) {
                toast.error(e?.response?.data?.message || 'Delete failed');
              } finally {
                setDeleting(false);
              }
            }}
          >
            Delete
          </Button>
        }
      />

      <ConfirmDialog
        open={clearConfirmOpen}
        onClose={() => !deleting && setClearConfirmOpen(false)}
        title="Clear attempts"
        content="Delete all attempts for current filters?"
        action={
          <Button
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await courseService.deleteCourseQuestionAttempts({
                  courseId: courseId || undefined,
                  userId: attemptUserId || undefined,
                });
                toast.success('Attempts cleared');
                setClearConfirmOpen(false);
                table.onResetPage();
                await loadAttempts();
              } catch (e) {
                toast.error(e?.response?.data?.message || 'Clear failed');
              } finally {
                setDeleting(false);
              }
            }}
          >
            Clear
          </Button>
        }
      />
    </Card>
  );
}

