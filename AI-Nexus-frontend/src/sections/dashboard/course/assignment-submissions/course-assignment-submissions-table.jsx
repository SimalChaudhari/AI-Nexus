import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { TableHeadCustom, TableNoData, TableEmptyRows } from 'src/components/table';
import { resolveAssetUrl } from 'src/utils/asset-url';
import { fDateTime } from 'src/utils/format-time';

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
  headLabel,
  deletingId,
  verifyingId,
  onDeleteRow,
  onVerifyRow,
  onViewLogRow,
  notFound = false,
  emptyRowsCount = 0,
  emptyRowsHeight = 76,
}) {
  return (
    <Table size="medium" sx={{ minWidth: 1100 }}>
      <TableHeadCustom headLabel={headLabel} rowCount={rows?.length || 0} />

      <TableBody>
        {(rows || []).map((row) => {
          const evalDisplay = getSubmissionEvaluationDisplay(row);
          const busy = deletingId === row.id || verifyingId === row.id;
          const files = getSubmissionFileList(row);
          const submittedAt = row.submittedAt || row.uploadedAt;
          const needsReview = row.manualPassed == null && row.evaluationStatus !== 'draft';

          return (
            <TableRow key={row.id} hover>
              <TableCell sx={{ maxWidth: 200 }}>
                <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap title={row.userName || ''}>
                    {row.userName || 'Unknown learner'}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    title={row.userEmail || ''}
                  >
                    {row.userEmail || '—'}
                  </Typography>
                </Stack>
              </TableCell>

              <TableCell sx={{ maxWidth: 160 }}>
                <Typography variant="body2" noWrap title={row.moduleTitle || ''}>
                  {row.moduleTitle || 'Course-level'}
                </Typography>
              </TableCell>

              <TableCell sx={{ maxWidth: 180 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                  noWrap
                  title={row.questionPrompt || ''}
                >
                  {truncateSubmissionText(row.questionPrompt, 48) || 'Assessment'}
                </Typography>
              </TableCell>

              <TableCell>
                {files.length ? (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {files.map((file, fileIndex) => (
                      <Button
                        key={`${row.id}-${file.fileUrl}-${fileIndex}`}
                        size="small"
                        variant="outlined"
                        color="inherit"
                        href={resolveAssetUrl(file.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={<Iconify icon="solar:download-minimalistic-bold" width={16} />}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Download{files.length > 1 ? ` ${fileIndex + 1}` : ''}
                      </Button>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    —
                  </Typography>
                )}
              </TableCell>

              <TableCell>
                <Label
                  variant="soft"
                  color={getSubmissionAttemptCount(row) > 1 ? 'warning' : 'default'}
                >
                  {formatSubmissionAttemptLabel(row)}
                </Label>
              </TableCell>

              <TableCell>
                <Label variant="soft" color={evalDisplay.color}>
                  {evalDisplay.label}
                </Label>
              </TableCell>

              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Typography variant="body2" color="text.secondary">
                  {submittedAt ? fDateTime(submittedAt) : '—'}
                </Typography>
              </TableCell>

              <TableCell align="right">
                <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                  {canShowVerificationLog(row) ? (
                    <Tooltip title="View log">
                      <span>
                        <IconButton
                          size="small"
                          color="default"
                          disabled={busy}
                          onClick={() => onViewLogRow(row)}
                        >
                          <Iconify icon="solar:document-text-bold" width={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : null}

                  <Tooltip title={needsReview ? 'Verify submission' : 'Update verification'}>
                    <span>
                      <IconButton
                        size="small"
                        color={needsReview ? 'warning' : 'primary'}
                        disabled={busy}
                        onClick={() => onVerifyRow(row)}
                      >
                        {verifyingId === row.id ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Iconify icon="solar:check-read-bold" width={18} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title="Delete submission">
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

        <TableEmptyRows height={emptyRowsHeight} emptyRows={emptyRowsCount} />
        <TableNoData notFound={notFound} />
      </TableBody>
    </Table>
  );
}
