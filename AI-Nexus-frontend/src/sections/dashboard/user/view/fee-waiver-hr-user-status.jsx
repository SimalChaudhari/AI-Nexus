import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { fDateTime } from 'src/utils/format-time';
import { getJobRoleAuditStatus } from './user-fee-waiver-audit-panel';
import {
  FeeWaiverHrResendPanel,
  canShowFeeWaiverHrTrigger,
} from './fee-waiver-hr-resend-panel';

// ----------------------------------------------------------------------

export function canShowFeeWaiverHrStatus(user) {
  if (!user) return false;
  if (user.feeWaiverJobVerified) return true;
  if (canShowFeeWaiverHrTrigger(user)) return true;

  const snapshot = user?.eligibilitySnapshot || {};
  const audit =
    snapshot?.feeWaiverAudit && typeof snapshot.feeWaiverAudit === 'object'
      ? snapshot.feeWaiverAudit
      : null;

  return Boolean(audit);
}

function MetaTag({ icon, label, value, color = 'default' }) {
  if (!value) return null;

  return (
    <Label
      color={color}
      variant="soft"
      startIcon={<Iconify icon={icon} width={14} />}
      sx={{
        height: 'auto',
        py: 0.75,
        px: 1,
        maxWidth: 1,
        borderRadius: 1.5,
        typography: 'caption',
        fontWeight: 600,
        whiteSpace: 'normal',
        alignItems: 'flex-start',
        '& .MuiBox-root': { mt: 0.15 },
      }}
    >
      <Box component="span" sx={{ display: 'block', lineHeight: 1.35 }}>
        <Box component="span" sx={{ opacity: 0.78, fontWeight: 700, mr: 0.5 }}>
          {label}
        </Box>
        <Box component="span" sx={{ wordBreak: 'break-word' }}>
          {value}
        </Box>
      </Box>
    </Label>
  );
}

/**
 * User-facing job-role / HR verification status (profile).
 * Always shows current status when relevant; includes resend form when still needed.
 */
export function FeeWaiverHrUserStatusPanel({ user, onRefresh }) {
  const theme = useTheme();

  if (!canShowFeeWaiverHrStatus(user)) return null;

  const audit =
    user?.eligibilitySnapshot?.feeWaiverAudit
    && typeof user.eligibilitySnapshot.feeWaiverAudit === 'object'
      ? user.eligibilitySnapshot.feeWaiverAudit
      : null;
  const statusMeta = getJobRoleAuditStatus(user);
  const showResend = canShowFeeWaiverHrTrigger(user);
  const isVerified = statusMeta.label === 'Verified';

  const hrEmail = String(audit?.hrEmail || '').trim();
  const submittedAt = audit?.submittedAt ? fDateTime(audit.submittedAt) : '';
  const verifiedAt = audit?.verifiedAt ? fDateTime(audit.verifiedAt) : '';

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Iconify
            icon={
              isVerified
                ? 'solar:shield-check-bold'
                : statusMeta.label === 'Rejected'
                  ? 'solar:danger-triangle-bold'
                  : 'solar:info-circle-bold'
            }
            width={18}
            sx={{
              color: isVerified
                ? 'success.main'
                : statusMeta.label === 'Rejected'
                  ? 'warning.main'
                  : 'info.main',
            }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Current status
          </Typography>
        </Stack>
        <Label
          color={statusMeta.color}
          variant="soft"
          startIcon={
            <Iconify
              icon={isVerified ? 'solar:verified-check-bold' : 'solar:clock-circle-bold'}
              width={14}
            />
          }
        >
          {statusMeta.label}
        </Label>
      </Stack>

      {(hrEmail || submittedAt || verifiedAt || audit?.rejectionReason) ? (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${alpha(
              isVerified ? theme.palette.success.main : theme.palette.info.main,
              0.22
            )}`,
            bgcolor: alpha(
              isVerified ? theme.palette.success.main : theme.palette.info.main,
              theme.palette.mode === 'dark' ? 0.12 : 0.06
            ),
          }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <MetaTag
              icon="solar:letter-bold"
              label="HR email"
              value={hrEmail}
              color={isVerified ? 'success' : 'info'}
            />
            <MetaTag
              icon="solar:calendar-bold"
              label="Request sent"
              value={submittedAt}
              color={isVerified ? 'success' : 'warning'}
            />
            <MetaTag
              icon="solar:verified-check-bold"
              label="Verified at"
              value={verifiedAt}
              color="success"
            />
          </Stack>

          {audit?.rejectionReason ? (
            <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1.25, fontWeight: 600 }}>
              Reason: {audit.rejectionReason}
            </Typography>
          ) : null}
        </Box>
      ) : null}

      {showResend ? (
        <FeeWaiverHrResendPanel user={user} variant="user" onRefresh={onRefresh} compact />
      ) : null}
    </Stack>
  );
}
