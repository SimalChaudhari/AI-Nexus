import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { MembershipFormTextField } from 'src/components/membership-form-textfield';
import { createMembershipApplicationCheckout } from 'src/services/payment.service';
import {
  MEMBERSHIP_BILLING_PAYMENT_METHOD,
  persistPendingMembershipApplicationPayment,
} from 'src/utils/membership-application-billing';

// ----------------------------------------------------------------------

export function MembershipApplicationBillingSection({
  applicationId,
  accountId,
  billing,
  documentsSubmitted,
  checkoutUrls,
  customerEmail,
  paymentReturnNotice,
  onReferenceChange,
  onClearPaymentReturnNotice,
}) {
  const theme = useTheme();
  const { primary } = theme.palette;
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const wooshPayReferenceNo = billing?.wooshPayReferenceNo || '';
  const hasReference = Boolean(wooshPayReferenceNo.trim());

  useEffect(() => {
    if (!paymentReturnNotice) return undefined;
    const timer = window.setTimeout(() => onClearPaymentReturnNotice?.(), 8000);
    return () => window.clearTimeout(timer);
  }, [paymentReturnNotice, onClearPaymentReturnNotice]);

  const handlePayWithWooshPay = async () => {
    if (!applicationId || !accountId) return;
    setPayLoading(true);
    setPayError('');
    try {
      const data = await createMembershipApplicationCheckout({
        applicationId,
        accountId,
        successUrl: checkoutUrls.successUrl,
        cancelUrl: checkoutUrls.cancelUrl,
        customerEmail,
      });
      if (data?.url) {
        persistPendingMembershipApplicationPayment({
          sessionId: data.sessionId || data.wooshPayReferenceNo,
          refId: data.refId,
        });
        window.location.href = data.url;
        return;
      }
      if (data?.sessionId || data?.wooshPayReferenceNo) {
        onReferenceChange(data.sessionId || data.wooshPayReferenceNo);
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Could not start payment.');
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      {!documentsSubmitted && (
        <Alert severity="warning">
          Complete and submit the Document Upload section before paying the membership application
          fee.
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary">
        Pay the membership application fee with WooshPay. After payment, submit billing to register
        the payment in ISCA eServices (Salesforce).
      </Typography>

      {payError && (
        <Alert severity="error" onClose={() => setPayError('')}>
          {payError}
        </Alert>
      )}

      {paymentReturnNotice && (
        <Alert
          severity={paymentReturnNotice.severity || 'info'}
          onClose={() => onClearPaymentReturnNotice?.()}
        >
          {paymentReturnNotice.message}
        </Alert>
      )}

      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: `1px solid ${alpha(primary.main, 0.22)}`,
          bgcolor: alpha(primary.main, 0.03),
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Payment method
            </Typography>
            <Chip size="small" label={MEMBERSHIP_BILLING_PAYMENT_METHOD} color="primary" />
          </Stack>

          <LoadingButton
            variant="contained"
            size="large"
            loading={payLoading}
            disabled={!documentsSubmitted || !applicationId || !accountId}
            onClick={handlePayWithWooshPay}
            startIcon={<Iconify icon="solar:card-bold" width={22} />}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
          >
            Pay with WooshPay
          </LoadingButton>

          <Typography variant="caption" color="text.secondary">
            You will return here after payment. The WooshPay session reference is filled in
            automatically when possible.
          </Typography>
        </Stack>
      </Box>

      <MembershipFormTextField
        label="WooshPay reference number"
        size="medium"
        fullWidth
        required
        value={wooshPayReferenceNo}
        onChange={(e) => onReferenceChange(e.target.value)}
        helperText={
          hasReference
            ? 'Reference captured — submit billing below to send to Salesforce.'
            : 'Paste the WooshPay session / reference id if not auto-filled after payment.'
        }
        InputProps={{
          endAdornment: hasReference ? (
            <Iconify icon="solar:verified-check-bold" width={20} sx={{ color: 'success.main' }} />
          ) : undefined,
        }}
      />

      {hasReference && (
        <Alert severity="success" icon={<Iconify icon="solar:wallet-money-bold" width={22} />}>
          Ready to submit billing for application{' '}
          <Box component="span" sx={{ fontWeight: 700 }}>
            {applicationId}
          </Box>
          .
        </Alert>
      )}
    </Stack>
  );
}
