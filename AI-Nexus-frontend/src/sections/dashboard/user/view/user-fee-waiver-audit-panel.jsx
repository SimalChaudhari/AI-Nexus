import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { resolveAssetUrl } from 'src/utils/asset-url';
import { userService } from 'src/services/user.service';

// ----------------------------------------------------------------------

export function getJobRoleAuditStatus(user) {
  const snapshot = user?.eligibilitySnapshot || {};
  const audit =
    snapshot?.feeWaiverAudit && typeof snapshot.feeWaiverAudit === 'object'
      ? snapshot.feeWaiverAudit
      : null;
  const status = String(audit?.status || '').trim();

  if (status === 'admin_rejected') {
    return { label: 'Rejected', color: 'error', hasAudit: Boolean(audit) };
  }
  if (
    user?.feeWaiverJobVerified
    || status === 'hr_verified'
    || status === 'certificate_verified'
    || status === 'admin_verified'
  ) {
    return { label: 'Verified', color: 'success', hasAudit: Boolean(audit) };
  }
  if (status === 'pending_hr_verification') {
    return { label: 'Pending HR verification', color: 'warning', hasAudit: true };
  }
  if (status === 'pending_certificate_review') {
    return { label: 'Certificate under review', color: 'warning', hasAudit: true };
  }
  if (audit) {
    return { label: status ? status.replace(/[_-]/g, ' ') : 'Submitted', color: 'default', hasAudit: true };
  }
  return { label: 'Not submitted', color: 'default', hasAudit: false };
}

function formatMethodLabel(method) {
  if (method === 'hr-email') return 'HR email verification';
  if (method === 'accounting-declaration-hr') return 'Employer / HR email verification';
  if (method === 'education-certificate') return 'Education certificate';
  if (method === 'student-academic') return 'Student academic email';
  return method || '—';
}

function AuditFileButton({ href, label, icon }) {
  if (!href) return null;

  return (
    <Button
      size="small"
      variant="outlined"
      color="inherit"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      startIcon={<Iconify icon={icon} width={18} />}
      sx={{ justifyContent: 'flex-start' }}
    >
      {label}
    </Button>
  );
}

function InfoItem({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.35, wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export function UserFeeWaiverAuditPanel({ user, onRefresh }) {
  const theme = useTheme();
  const [actionLoading, setActionLoading] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const snapshot = user?.eligibilitySnapshot || {};
  const audit = snapshot?.feeWaiverAudit && typeof snapshot.feeWaiverAudit === 'object'
    ? snapshot.feeWaiverAudit
    : null;
  const nricAudit = snapshot?.nricAudit && typeof snapshot.nricAudit === 'object'
    ? snapshot.nricAudit
    : null;

  const statusMeta = useMemo(() => getJobRoleAuditStatus(user), [user]);

  const certificateUrl = resolveAssetUrl(audit?.certificateUrl || '');
  const nricFrontUrl = resolveAssetUrl(nricAudit?.frontUrl || '');
  const nricBackUrl = resolveAssetUrl(nricAudit?.backUrl || '');

  const isVerified = statusMeta.label === 'Verified';
  const canReview = !isVerified && statusMeta.label !== 'Rejected';

  const handleVerify = async () => {
    try {
      setActionLoading('verify');
      setFeedback(null);
      const result = await userService.verifyFeeWaiverJobRole(user.id);
      setFeedback({ severity: 'success', message: result?.message || 'Job role verified.' });
      setShowRejectForm(false);
      onRefresh?.();
    } catch (error) {
      setFeedback({ severity: 'error', message: error?.message || 'Could not verify.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading('reject');
      setFeedback(null);
      const result = await userService.rejectFeeWaiverJobRole(user.id, rejectReason);
      setFeedback({ severity: 'success', message: result?.message || 'Job role rejected.' });
      setShowRejectForm(false);
      setRejectReason('');
      onRefresh?.();
    } catch (error) {
      setFeedback({ severity: 'error', message: error?.message || 'Could not reject.' });
    } finally {
      setActionLoading('');
    }
  };

  return (
    <Card
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
        bgcolor: alpha(theme.palette.background.neutral, 0.4),
      }}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Iconify icon="solar:document-text-bold" width={22} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Job role / HR verification
            </Typography>
            <Chip label={statusMeta.label} color={statusMeta.color} size="small" sx={{ fontWeight: 600 }} />
          </Stack>
          <Chip
            label={user?.feeWaiverJobVerified ? 'Job role verified' : 'Job role not verified'}
            color={user?.feeWaiverJobVerified ? 'success' : 'warning'}
            variant="outlined"
            size="small"
          />
        </Stack>

        {!audit && !nricAudit ? (
          <Alert severity="info" variant="outlined">
            No HR email or certificate has been submitted for this user yet. You can still mark the job role as verified or rejected below.
          </Alert>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <InfoItem label="Audit method" value={formatMethodLabel(audit?.method)} />
          <InfoItem label="HR email" value={audit?.hrEmail} />
          <InfoItem label="Learner email" value={audit?.learnerEmail} />
          <InfoItem label="Submitted at" value={audit?.submittedAt ? new Date(audit.submittedAt).toLocaleString() : '—'} />
          <InfoItem label="Verified at" value={audit?.verifiedAt ? new Date(audit.verifiedAt).toLocaleString() : '—'} />
          {nricAudit?.maskedIdentifier ? <InfoItem label="NRIC/FIN (masked)" value={nricAudit.maskedIdentifier} /> : null}
        </Box>

        {audit?.rejectionReason ? (
          <Alert severity="error" variant="outlined">
            {audit.rejectionReason}
          </Alert>
        ) : null}

        {(certificateUrl || nricFrontUrl || nricBackUrl || audit?.fileName) ? (
          <>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle2">Audit documents</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
                <AuditFileButton
                  href={certificateUrl}
                  label={audit?.fileName ? `View certificate (${audit.fileName})` : 'View certificate'}
                  icon="solar:document-bold"
                />
                <AuditFileButton href={nricFrontUrl} label="View NRIC (front)" icon="solar:gallery-bold" />
                <AuditFileButton href={nricBackUrl} label="View NRIC (back)" icon="solar:gallery-bold" />
              </Stack>
              {!certificateUrl && !nricFrontUrl && !nricBackUrl ? (
                <Typography variant="caption" color="text.secondary">
                  No uploaded files are available for this user yet.
                </Typography>
              ) : null}
            </Stack>
          </>
        ) : null}

        {canReview ? (
          <>
            <Divider />
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Admin review</Typography>
              {feedback ? <Alert severity={feedback.severity}>{feedback.message}</Alert> : null}

              {showRejectForm ? (
                <Stack spacing={1.5}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Rejection reason (optional)"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="e.g. Certificate is not accounting/finance related."
                  />
                  <Stack direction="row" spacing={1}>
                    <LoadingButton
                      variant="contained"
                      color="error"
                      loading={actionLoading === 'reject'}
                      disabled={Boolean(actionLoading)}
                      onClick={handleReject}
                      startIcon={<Iconify icon="solar:close-circle-bold" />}
                    >
                      Confirm reject
                    </LoadingButton>
                    <Button
                      variant="outlined"
                      color="inherit"
                      disabled={Boolean(actionLoading)}
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <LoadingButton
                    variant="contained"
                    color="success"
                    loading={actionLoading === 'verify'}
                    disabled={Boolean(actionLoading)}
                    onClick={handleVerify}
                    startIcon={<Iconify icon="solar:check-circle-bold" />}
                  >
                    Verify job role
                  </LoadingButton>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={Boolean(actionLoading)}
                    onClick={() => setShowRejectForm(true)}
                    startIcon={<Iconify icon="solar:close-circle-bold" />}
                  >
                    Reject
                  </Button>
                </Stack>
              )}
            </Stack>
          </>
        ) : null}

        {isVerified && audit?.verifiedBy ? (
          <Typography variant="caption" color="text.secondary">
            Verified via {audit.verifiedBy}
            {audit.verifiedAt ? ` on ${new Date(audit.verifiedAt).toLocaleString()}` : ''}.
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
}
