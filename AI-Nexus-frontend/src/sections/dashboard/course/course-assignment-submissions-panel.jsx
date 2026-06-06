import { useCallback, useEffect, useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { courseService } from 'src/services/course.service';
import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { Iconify } from 'src/components/iconify';
import { resolveAssetUrl } from 'src/utils/asset-url';

// ----------------------------------------------------------------------

function truncate(str, n = 64) {
  const s = String(str || '');
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export function CourseAssignmentSubmissionsPanel({ courseId, sx }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filterUserId, setFilterUserId] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const userOptions = [...new Map(rows.map((r) => [r.userId, { id: r.userId, label: r.userName }])).values()];

  const loadRows = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await courseService.getAssignmentSubmissions(courseId, {
        userId: filterUserId || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load assignment submissions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, filterUserId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleConfirmDelete = async () => {
    const row = deleteTarget;
    if (!courseId || !row?.questionId) return;
    setDeletingId(row.id);
    try {
      await courseService.deleteAssignmentSubmission(courseId, row.questionId, {
        userId: row.userId,
      });
      toast.success('Assignment file deleted');
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (!courseId) return null;

  return (
    <Card sx={{ p: 3, ...sx }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:document-add-bold" width={24} />
          <Typography variant="h6">Assignment submissions</Typography>
        </Stack>
        <Chip size="small" label={`${rows.length} file${rows.length !== 1 ? 's' : ''}`} variant="soft" />
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Uploaded assignment files from learners. Only admins and the submitting learner can access each file.
      </Typography>

      {userOptions.length > 1 ? (
        <FormControl size="small" sx={{ minWidth: 240, mb: 2 }}>
          <InputLabel>Filter by learner</InputLabel>
          <Select
            label="Filter by learner"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
          >
            <MenuItem value="">All learners</MenuItem>
            {userOptions.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading submissions…
          </Typography>
        </Stack>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No assignment files uploaded yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Learner</TableCell>
              <TableCell>Assignment</TableCell>
              <TableCell>Module</TableCell>
              <TableCell>File</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.userName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.userEmail}
                  </Typography>
                </TableCell>
                <TableCell>{truncate(row.questionPrompt)}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{row.moduleTitle || '—'}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Iconify icon="solar:download-bold" width={16} />}
                    href={resolveAssetUrl(row.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {truncate(row.originalFileName, 28)}
                  </Button>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {row.uploadedAt ? new Date(row.uploadedAt).toLocaleString() : '—'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Delete file">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={Boolean(deletingId)}
                        onClick={() => setDeleteTarget(row)}
                      >
                        {deletingId === row.id ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete assignment file"
        content={
          deleteTarget
            ? `Remove the uploaded file from ${deleteTarget.userName || 'this learner'}? This cannot be undone.`
            : ''
        }
        action={
          <Button
            variant="contained"
            color="error"
            disabled={Boolean(deletingId)}
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        }
      />
    </Card>
  );
}
