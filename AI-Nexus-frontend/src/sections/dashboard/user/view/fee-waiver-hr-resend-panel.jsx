import { useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { getHrEmailValidationMessage } from 'src/validations/user.validation';
import { resendFeeWaiverHrVerification } from 'src/auth/context/jwt';
import { userService } from 'src/services/user.service';
import { getJobRoleAuditStatus } from './user-fee-waiver-audit-panel';

export function canShowFeeWaiverHrTrigger(user) {
  if (user?.feeWaiverJobVerified) return false;

  const snapshot = user?.eligibilitySnapshot || {};
  const audit =
    snapshot?.feeWaiverAudit && typeof snapshot.feeWaiverAudit === 'object'
      ? snapshot.feeWaiverAudit
      : null;
  const status = String(audit?.status || '').trim();

  if (status === 'pending_certificate_review') return false;

  const statusMeta = getJobRoleAuditStatus(user);
  return statusMeta.label !== 'Verified';
}

export function FeeWaiverHrResendPanel({
  user,
  variant = 'user',
  onRefresh,
  compact = false,
}) {
  const audit =
    user?.eligibilitySnapshot?.feeWaiverAudit
    && typeof user.eligibilitySnapshot.feeWaiverAudit === 'object'
      ? user.eligibilitySnapshot.feeWaiverAudit
      : null;

  const canShow = useMemo(() => canShowFeeWaiverHrTrigger(user), [user]);
  const statusMeta = useMemo(() => getJobRoleAuditStatus(user), [user]);

  const [hrEmail, setHrEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHrEmail('');
  }, [user?.id]);

  const hrEmailError = useMemo(
    () => getHrEmailValidationMessage(hrEmail, { learnerEmail: user?.email }),
    [hrEmail, user?.email]
  );

  if (!canShow) return null;

  const isRejected = statusMeta.label === 'Rejected';

  const handleTrigger = async () => {
    const trimmedHrEmail = String(hrEmail || '').trim();
    if (!trimmedHrEmail || hrEmailError) {
      toast.error(hrEmailError || 'Please enter a valid HR email address.');
      return;
    }

    try {
      setLoading(true);

      const result =
        variant === 'admin'
          ? await userService.resendFeeWaiverHrEmail(user.id, trimmedHrEmail)
          : await resendFeeWaiverHrVerification({ hrEmail: trimmedHrEmail });

      setHrEmail('');
      toast.success(result?.message || 'HR verification email sent successfully.');
      onRefresh?.();
    } catch (error) {
      toast.error(error?.message || 'Could not send HR verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      {!compact ? (
        <Typography variant="subtitle2">
          {variant === 'admin' ? 'Send HR verification email' : 'HR email verification'}
        </Typography>
      ) : null}

      <Alert severity={isRejected ? 'warning' : 'info'} variant="outlined">
        {isRejected
          ? 'Job role verification was rejected. Enter the HR email below and send a new verification request.'
          : 'Enter your HR contact email below. A verification link will be sent so your employer can confirm your job role.'}
      </Alert>

      {audit?.rejectionReason && !compact ? (
        <Alert severity="error" variant="outlined">
          {audit.rejectionReason}
        </Alert>
      ) : null}

      {audit?.hrEmail ? (
        <Typography variant="caption" color="text.secondary">
          Last HR email on record: {audit.hrEmail}
        </Typography>
      ) : null}

      <TextField
        fullWidth
        required
        label="HR email address"
        placeholder="hr@company.com"
        value={hrEmail}
        onChange={(event) => setHrEmail(event.target.value)}
        error={Boolean(String(hrEmail || '').trim()) && Boolean(hrEmailError)}
        helperText={
          hrEmailError && String(hrEmail || '').trim()
            ? hrEmailError
            : 'Enter the HR or employer email address. It cannot be the same as your registration email.'
        }
        InputLabelProps={{ shrink: true }}
      />

      <LoadingButton
        variant="contained"
        color="primary"
        loading={loading}
        disabled={!String(hrEmail || '').trim() || Boolean(hrEmailError)}
        onClick={handleTrigger}
        startIcon={<Iconify icon="solar:letter-bold" />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Send HR verification email
      </LoadingButton>
    </Stack>
  );
}
