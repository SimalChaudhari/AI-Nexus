import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { fetchMembershipCheckoutDetails } from 'src/api/membership-application';
import { createMembershipApplicationCheckout } from 'src/services/payment.service';
import {
  MEMBERSHIP_BILLING_PAYMENT_METHOD,
  persistPendingMembershipApplicationPayment,
} from 'src/utils/membership-application-billing';
import {
  buildMembershipApplicationPaymentUrls,
  formatMembershipCurrency,
  normalizeCheckoutDetailsResponse,
} from 'src/utils/membership-application-checkout';
import {
  isExperiencedMembershipApplicationPathway,
  readMembershipApplicationPathway,
} from 'src/utils/membership-application-pathway';

// ----------------------------------------------------------------------

function InfoField({ label, value, fullWidth = false }) {
  if (!value) return null;
  return (
    <Grid item xs={12} sm={fullWidth ? 12 : 6}>
      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          height: '100%',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem', wordBreak: 'break-word' }}>
          {value}
        </Typography>
      </Box>
    </Grid>
  );
}

function SummaryCard({ title, children, sx }) {
  const theme = useTheme();
  const { primary } = theme.palette;

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: `1px solid ${alpha(primary.main, 0.18)}`,
        bgcolor: alpha(primary.main, 0.02),
        ...sx,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={1}>{children}</Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function MembershipApplicationBillingSection({
  applicationId,
  accountId,
  socialAccessToken,
  documentsSubmitted,
  residentialDeclarationSubmitted,
  customerEmail,
  paymentReturnNotice,
  paymentProcessing = false,
  onClearPaymentReturnNotice,
  onBeforePayRedirect,
}) {
  const theme = useTheme();
  const { primary } = theme.palette;

  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const prerequisitesMet = documentsSubmitted && residentialDeclarationSubmitted;

  const loadCheckoutDetails = useCallback(async () => {
    if (!applicationId?.trim() || !socialAccessToken?.trim() || !prerequisitesMet) {
      setCheckout(null);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const response = await fetchMembershipCheckoutDetails({
        socialAccessToken,
        applicationId: applicationId.trim(),
      });
      const data = normalizeCheckoutDetailsResponse(response);
      if (!data) {
        throw new Error('Checkout details were not returned from Salesforce.');
      }
      setCheckout(data);
    } catch (err) {
      if (err?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
        return;
      }
      setCheckout(null);
      setLoadError(err instanceof Error ? err.message : 'Could not load checkout details.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, socialAccessToken, prerequisitesMet]);

  useEffect(() => {
    loadCheckoutDetails();
  }, [loadCheckoutDetails]);

  useEffect(() => {
    if (!paymentReturnNotice) return undefined;
    const timer = window.setTimeout(() => onClearPaymentReturnNotice?.(), 8000);
    return () => window.clearTimeout(timer);
  }, [paymentReturnNotice, onClearPaymentReturnNotice]);

  const paymentSummary = checkout?.paymentSummary || {};
  const billingInformation = checkout?.billingInformation || {};
  const billingAddress = billingInformation?.address || {};
  const feeBreakdowns = Array.isArray(paymentSummary?.feeBreakdowns)
    ? paymentSummary.feeBreakdowns
    : [];

  const totalAmount = Number(paymentSummary?.total);
  const noPaymentRequired = Boolean(checkout?.noPaymentRequired);
  const isDisabled = Boolean(checkout?.isDisabled);
  const canPay =
    prerequisitesMet
    && applicationId
    && accountId
    && !noPaymentRequired
    && !isDisabled
    && Number.isFinite(totalAmount)
    && totalAmount > 0;
  const showPayButton = canPay;

  const paymentDescription = useMemo(
    () =>
      paymentSummary?.description
      || checkout?.applicationName
      || 'ISCA membership application fee',
    [paymentSummary?.description, checkout?.applicationName]
  );

  const handlePay = async () => {
    if (!canPay) return;

    setPayLoading(true);
    setPayError('');

    const checkoutUrls = buildMembershipApplicationPaymentUrls();
    const successUrl = new URL(checkoutUrls.successUrl);
    successUrl.searchParams.set('applicationId', applicationId.trim());
    const pathway = readMembershipApplicationPathway();
    if (isExperiencedMembershipApplicationPathway(pathway)) {
      successUrl.searchParams.set('pathway', pathway);
    }

    try {
      const checkoutEmail = String(billingInformation.email || customerEmail || '').trim();
      const checkoutName = String(billingInformation.accountName || '').trim();
      const checkoutPhone = String(billingInformation.mobilePhone || '').trim();

      const data = await createMembershipApplicationCheckout({
        applicationId: applicationId.trim(),
        accountId: accountId.trim(),
        successUrl: successUrl.toString(),
        cancelUrl: checkoutUrls.cancelUrl,
        customerEmail: checkoutEmail,
        customerName: checkoutName,
        customerPhone: checkoutPhone,
        totalAmount,
        description: paymentDescription,
      });

      if (data?.url) {
        persistPendingMembershipApplicationPayment({
          sessionId: data.sessionId || data.wooshPayReferenceNo,
        });
        onBeforePayRedirect?.();
        window.location.href = data.url;
        return;
      }

      setPayError('Payment could not be started. Please try again.');
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Could not start payment.');
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <Stack spacing={1.75}>
      {paymentProcessing && (
        <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            Confirming payment and updating billing status...
          </Typography>
        </Stack>
      )}

      {!documentsSubmitted && (
        <Alert severity="warning">
          Complete and submit the Document Upload section before payment.
        </Alert>
      )}

      {documentsSubmitted && !residentialDeclarationSubmitted && (
        <Alert severity="warning">
          Complete and submit the Residential Declaration section before payment.
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

      {loadError && (
        <Alert
          severity="error"
          action={
            <LoadingButton size="small" color="inherit" onClick={loadCheckoutDetails}>
              Retry
            </LoadingButton>
          }
        >
          {loadError}
        </Alert>
      )}

      {loading && (
        <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            Loading checkout details…
          </Typography>
        </Stack>
      )}

      {!paymentProcessing && !loading && checkout && (
        <>
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={6}>
              <SummaryCard title="Application" sx={{ height: '100%' }}>
                <Grid container spacing={0.9}>
                  <InfoField label="Application ID" value={checkout.applicationId || applicationId} />
                  <InfoField label="Renewal year" value={checkout.renewalYear} />
                  <InfoField label="Record type" value={checkout.recordType} />
                  <InfoField label="Application status" value={checkout.applicationStatus} />
                  <InfoField label="Applicable period" value={checkout.applicablePeriod} />
                  <InfoField label="Residence" value={checkout.residentialDeclaration} />
                  <InfoField label="Description" value={paymentSummary.description} fullWidth />
                </Grid>
              </SummaryCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <SummaryCard title="Billing information" sx={{ height: '100%' }}>
                <Grid container spacing={0.9}>
                  <InfoField label="Name" value={billingInformation.accountName} />
                  <InfoField label="Membership no." value={billingInformation.membershipNumber} />
                  <InfoField label="Member class" value={billingInformation.memberClass} />
                  <InfoField label="Email" value={billingInformation.email} />
                  <InfoField label="Mobile" value={billingInformation.mobilePhone} />
                  {(billingAddress.addressLine1 || billingAddress.city) && (
                    <InfoField
                      label="Address"
                      fullWidth
                      value={[
                        billingAddress.addressLine1,
                        billingAddress.addressLine2,
                        billingAddress.unitNumber,
                        billingAddress.city,
                        billingAddress.state,
                        billingAddress.postalCode,
                        billingAddress.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    />
                  )}
                </Grid>
              </SummaryCard>
            </Grid>
          </Grid>

          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              border: `1px solid ${alpha(primary.main, 0.22)}`,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Payment summary
            </Typography>
            {checkout.gstRate != null && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                GST rate: {checkout.gstRate}%
              </Typography>
            )}

            <Stack spacing={0.75}>
              {feeBreakdowns.map((row) => (
                <Stack
                  key={`${row.type}-${row.description}`}
                  direction="row"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography variant="body2" color="text.secondary">
                    {row.description || row.type}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatMembershipCurrency(row.amount)}
                  </Typography>
                </Stack>
              ))}

              {!feeBreakdowns.length && (
                <>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Subtotal
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatMembershipCurrency(paymentSummary.subtotal)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      GST
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatMembershipCurrency(paymentSummary.gst)}
                    </Typography>
                  </Stack>
                </>
              )}

              {paymentSummary.waiverAmount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Waiver
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                    -{formatMembershipCurrency(paymentSummary.waiverAmount)}
                  </Typography>
                </Stack>
              )}

              <Divider sx={{ my: 0.5 }} />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Total
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: primary.main }}>
                  {formatMembershipCurrency(paymentSummary.total)}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {noPaymentRequired && (
            <Alert severity="info">No payment is required for this application.</Alert>
          )}

          {isDisabled && (
            <Alert severity="warning">Payment is not available for this application at this time.</Alert>
          )}

          {payError && (
            <Alert severity="error" onClose={() => setPayError('')}>
              {payError}
            </Alert>
          )}

          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              border: `1px solid ${alpha(primary.main, 0.22)}`,
              bgcolor: alpha(primary.main, 0.03),
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Payment
                </Typography>
                <Chip size="small" label={MEMBERSHIP_BILLING_PAYMENT_METHOD} color="primary" />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                After successful payment you will return to the home page, then sign in with eServices.
              </Typography>

              {showPayButton ? (
                <LoadingButton
                  variant="contained"
                  size="large"
                  loading={payLoading}
                  onClick={handlePay}
                  startIcon={<Iconify icon="solar:card-bold" width={22} />}
                  sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, textTransform: 'none', fontWeight: 700 }}
                >
                  Pay {formatMembershipCurrency(paymentSummary.total)}
                </LoadingButton>
              ) : (
                <Alert severity={noPaymentRequired ? 'success' : 'info'} sx={{ py: 0.25 }}>
                  {noPaymentRequired
                    ? 'Payment already completed. No further payment is required.'
                    : 'Payment is currently not available for this application.'}
                </Alert>
              )}
            </Stack>
          </Box>
        </>
      )}
    </Stack>
  );
}
