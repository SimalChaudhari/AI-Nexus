import { useEffect, useState } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

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
    setFeedback(row?.manualFeedback || row?.aiFeedback || '');
  }, [open, row]);

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Manual verification</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {row?.userName ? `Verify submission from ${row.userName}.` : 'Verify this submission.'}
        </Typography>
        {row?.aiFeedback ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            AI note: {row.aiFeedback}
          </Typography>
        ) : null}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
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
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
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
          Save result
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
