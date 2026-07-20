import { useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LoadingButton from '@mui/lab/LoadingButton';

import { Label } from 'src/components/label';
import { getSubmissionEvaluationDisplay } from './course-assignment-submissions-utils';

// ----------------------------------------------------------------------

export function CourseAssignmentSubmissionsManualVerifyDialog({
  open,
  row,
  saving,
  onClose,
  onSubmit,
}) {
  const [passed, setPassed] = useState('true');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!open) return;
    if (row?.manualPassed === true) setPassed('true');
    else if (row?.manualPassed === false) setPassed('false');
    else if (row?.passed === false) setPassed('false');
    else setPassed('true');
    setFeedback(row?.manualFeedback || '');
  }, [open, row]);

  const current = row ? getSubmissionEvaluationDisplay(row) : null;

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Verify assessment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{row?.userName || 'Learner'}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row?.userEmail || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {row?.questionPrompt || 'Assessment submission'}
            </Typography>
            {current ? (
              <Label variant="soft" color={current.color} sx={{ width: 'fit-content', mt: 0.5 }}>
                Current: {current.label}
              </Label>
            ) : null}
          </Stack>

          <FormControl fullWidth size="small">
            <InputLabel>Result</InputLabel>
            <Select label="Result" value={passed} onChange={(e) => setPassed(e.target.value)}>
              <MenuItem value="true">Pass</MenuItem>
              <MenuItem value="false">Fail</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Feedback (optional)"
            placeholder="Add a short note for the learner…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={saving}
          color={passed === 'true' ? 'success' : 'error'}
          onClick={() => onSubmit({ passed: passed === 'true', feedback: feedback.trim() })}
        >
          {passed === 'true' ? 'Confirm pass' : 'Confirm fail'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
