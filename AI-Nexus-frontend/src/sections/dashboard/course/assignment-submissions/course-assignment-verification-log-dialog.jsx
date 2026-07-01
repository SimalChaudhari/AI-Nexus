import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import {
  getVerificationLogEntries,
  getSubmissionEvaluationDisplay,
  verificationLogStatusColor,
  getSubmissionAttemptDisplayRows,
  getAttemptResultDisplay,
  formatSubmissionAttemptLabel,
  truncateSubmissionText,
} from './course-assignment-submissions-utils';

// ----------------------------------------------------------------------

function LogRow({ entry }) {
  const color = verificationLogStatusColor(entry.status);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: (theme) => `1px solid ${alpha(theme.palette[color].main, 0.24)}`,
        bgcolor: (theme) => alpha(theme.palette[color].main, 0.06),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
        <Chip size="small" variant="soft" color={color} label={entry.status.toUpperCase()} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {entry.step}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {entry.detail}
      </Typography>
    </Box>
  );
}

export function CourseAssignmentVerificationLogDialog({ open, submission, onClose }) {
  const entries = getVerificationLogEntries(submission);
  const evaluation = getSubmissionEvaluationDisplay(submission);
  const attemptRows = getSubmissionAttemptDisplayRows(submission);
  const showAttemptHistory = attemptRows.length > 1;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:document-text-bold" width={22} />
          <span>AI verification log</span>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" variant="soft" color={evaluation.color} label={evaluation.label} />
            {submission ? (
              <Chip size="small" variant="soft" label={formatSubmissionAttemptLabel(submission)} />
            ) : null}
            {submission?.aiScore != null ? (
              <Chip size="small" variant="soft" label={`Score ${submission.aiScore}%`} />
            ) : null}
            {submission?.aiEvaluatedAt ? (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                {new Date(submission.aiEvaluatedAt).toLocaleString()}
              </Typography>
            ) : null}
          </Stack>

          {showAttemptHistory ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Attempt history
              </Typography>
              {attemptRows.map((attempt) => {
                const result = getAttemptResultDisplay(attempt);
                return (
                  <Box
                    key={`attempt-${attempt.attemptNumber}`}
                    sx={{
                      p: 1.25,
                      borderRadius: 1,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      bgcolor: attempt.isCurrent ? 'action.hover' : 'background.paper',
                    }}
                  >
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Attempt {attempt.attemptNumber}
                        {attempt.isCurrent ? ' (current)' : ''}
                      </Typography>
                      <Chip size="small" variant="soft" color={result.color} label={result.label} />
                      {attempt.aiScore != null ? (
                        <Chip size="small" variant="soft" label={`Score ${attempt.aiScore}%`} />
                      ) : null}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {truncateSubmissionText(attempt.originalFileName, 48)}
                      {attempt.uploadedAt
                        ? ` · ${new Date(attempt.uploadedAt).toLocaleString()}`
                        : ''}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          ) : null}

          {entries.length ? (
            entries.map((entry, index) => <LogRow key={`${entry.step}-${index}`} entry={entry} />)
          ) : (
            <Typography variant="body2" color="text.secondary">
              No verification log available yet. Grading may still be in progress.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
