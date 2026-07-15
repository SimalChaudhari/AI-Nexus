import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

import { Iconify } from 'src/components/iconify';
import { getHrEmailValidationMessage } from 'src/validations/user.validation';
import {
  submitFeeWaiverAuditCertificate,
  submitFeeWaiverAuditHrEmail,
} from 'src/auth/context/jwt';

export function FreeSignupAuditDialog({
  open,
  learnerEmail = '',
  learnerName = '',
  userId = '',
  onSubmitted,
}) {
  const [auditMethod, setAuditMethod] = useState('hr-email');
  const [hrEmail, setHrEmail] = useState('');
  const [certificateFile, setCertificateFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hrEmailError = useMemo(
    () => getHrEmailValidationMessage(hrEmail, { learnerEmail }),
    [hrEmail, learnerEmail]
  );

  const canSubmit =
    auditMethod === 'hr-email'
      ? Boolean(String(hrEmail || '').trim()) && !hrEmailError
      : Boolean(certificateFile);

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!canSubmit) {
      setErrorMsg(
        auditMethod === 'hr-email'
          ? 'Please enter a valid HR email address.'
          : 'Please upload your education certificate.'
      );
      return;
    }

    try {
      setSubmitting(true);

      if (auditMethod === 'hr-email') {
        const response = await submitFeeWaiverAuditHrEmail({
          userId,
          learnerEmail,
          learnerName,
          hrEmail: hrEmail.trim(),
        });
        setSuccessMsg(
          response?.message
            || 'A verification email has been sent to your HR contact. Please verify your registration email, then sign in to start the programme.'
        );
      } else {
        const response = await submitFeeWaiverAuditCertificate({
          userId,
          learnerEmail,
          certificate: certificateFile,
        });
        setSuccessMsg(
          response?.message
            || 'Submitted successfully. Please verify your registration email, then sign in to start the programme.'
        );
      }

      setTimeout(() => {
        onSubmitted?.();
      }, 800);
    } catch (error) {
      setErrorMsg(error?.message || 'Could not submit audit information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      onClose={(_event, reason) => {
        if (reason === 'backdropClick') return;
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        Additional verification required
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            For audit purposes, please provide us with either of the information below:
          </Typography>

          <RadioGroup
            value={auditMethod}
            onChange={(event) => {
              setAuditMethod(event.target.value);
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            <FormControlLabel
              value="hr-email"
              control={<Radio />}
              label="Your HR email address (a verification email will be sent to your HR to verify your job role)"
            />
            <FormControlLabel
              value="certificate"
              control={<Radio />}
              label="Upload your Accounting and/or Finance related education certificate"
            />
          </RadioGroup>

          <Divider />

          {auditMethod === 'hr-email' ? (
            <TextField
              fullWidth
              label="HR email address"
              placeholder="hr@company.com"
              value={hrEmail}
              onChange={(event) => {
                setHrEmail(event.target.value);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              error={Boolean(hrEmailError)}
              helperText={
                hrEmailError
                || 'A verification email will be sent to this HR address. It cannot be the same as your registration email.'
              }
              InputLabelProps={{ shrink: true }}
            />
          ) : (
            <Stack spacing={1}>
              <Button
                component="label"
                variant="outlined"
                color="inherit"
                startIcon={<Iconify icon="solar:upload-bold" />}
                sx={{ justifyContent: 'flex-start', minHeight: 48 }}
              >
                {certificateFile ? certificateFile.name : 'Upload education certificate'}
                <input
                  hidden
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setCertificateFile(file);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                />
              </Button>
              <Typography variant="caption" color="text.secondary">
                Upload a PDF, Word document, or image. An administrator will review your certificate manually.
              </Typography>
            </Stack>
          )}

          {errorMsg ? <Alert severity="error">{errorMsg}</Alert> : null}
          {successMsg ? <Alert severity="success">{successMsg}</Alert> : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Box sx={{ width: 1 }}>
          <LoadingButton
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            loading={submitting}
            disabled={!canSubmit || Boolean(successMsg)}
            onClick={handleSubmit}
            sx={{ fontWeight: 700 }}
          >
            Submit
          </LoadingButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
