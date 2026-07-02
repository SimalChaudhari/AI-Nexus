import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { Iconify } from 'src/components/iconify';
import { resolveAssetUrl } from 'src/utils/asset-url';

import {
  truncateSubmissionText,
  getSubmissionEvaluationDisplay,
  canShowVerificationLog,
  formatSubmissionAttemptLabel,
  getSubmissionAttemptCount,
  getSubmissionFileList,
} from './course-assignment-submissions-utils';

// ----------------------------------------------------------------------

export function CourseAssignmentSubmissionsTable({
  rows,
  deletingId,
  verifyingId,
  regradingId,
  onDeleteRow,
  onVerifyRow,
  onRegradeRow,
  onViewLogRow,
}) {
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No assessment files uploaded for this module yet.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Learner</TableCell>
          <TableCell>Assessment</TableCell>
          <TableCell>File</TableCell>
          <TableCell>Attempts</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Uploaded</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const evalDisplay = getSubmissionEvaluationDisplay(row);
          const busy = deletingId === row.id || verifyingId === row.id || regradingId === row.id;

          return (
            <TableRow key={row.id}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {row.userName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {row.userEmail}
                </Typography>
              </TableCell>
              <TableCell>{truncateSubmissionText(row.questionPrompt)}</TableCell>
              <TableCell>
                <Stack spacing={0.5}>
                  {getSubmissionFileList(row).map((file) => (
                    <Button
                      key={`${row.id}-${file.fileUrl}`}
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="solar:download-bold" width={16} />}
                      href={resolveAssetUrl(file.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {truncateSubmissionText(file.originalFileName, 28)}
                    </Button>
                  ))}
                </Stack>
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Stack spacing={0.25}>
                  <Chip
                    size="small"
                    variant="soft"
                    color={getSubmissionAttemptCount(row) > 1 ? 'warning' : 'default'}
                    label={formatSubmissionAttemptLabel(row)}
                  />
                  {Array.isArray(row.attemptHistory) && row.attemptHistory.length ? (
                    <Typography variant="caption" color="text.secondary">
                      {row.attemptHistory.filter((item) => item.passed === false).length} failed before
                    </Typography>
                  ) : null}
                </Stack>
              </TableCell>
              <TableCell sx={{ minWidth: 160 }}>
                <Stack spacing={0.5}>
                  <Chip size="small" variant="soft" color={evalDisplay.color} label={evalDisplay.label} />
                  {row.aiScore != null && row.manualPassed == null ? (
                    <Typography variant="caption" color="text.secondary">
                      AI score: {row.aiScore}%
                    </Typography>
                  ) : null}
                  {evalDisplay.detail ? (
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {truncateSubmissionText(evalDisplay.detail, 80)}
                    </Typography>
                  ) : null}
                </Stack>
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {row.uploadedAt ? new Date(row.uploadedAt).toLocaleString() : '—'}
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {canShowVerificationLog(row) ? (
                    <Tooltip title="AI verification log">
                      <span>
                        <IconButton size="small" color="secondary" disabled={busy} onClick={() => onViewLogRow(row)}>
                          <Iconify icon="solar:document-text-bold" width={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : null}
                  <Tooltip title="Manual verify">
                    <span>
                      <IconButton size="small" color="primary" disabled={busy} onClick={() => onVerifyRow(row)}>
                        <Iconify icon="solar:check-read-bold" width={18} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Re-run AI grading">
                    <span>
                      <IconButton size="small" color="info" disabled={busy} onClick={() => onRegradeRow(row)}>
                        {regradingId === row.id ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Iconify icon="solar:refresh-bold" width={18} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete file">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={busy}
                        onClick={() => onDeleteRow(row)}
                      >
                        {deletingId === row.id ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
