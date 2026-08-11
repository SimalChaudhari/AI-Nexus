import { useCallback, useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { appSettingsService } from 'src/services/app-settings.service';

import { MembershipPaymentSettingsCard } from 'src/sections/dashboard/admin-settings/view/components/membership-payment-settings-card';
import { VoucherCodesSettingsCard } from 'src/sections/dashboard/admin-settings/view/components/voucher-codes-settings-card';

function normalizePaymentSettings(paymentCfg) {
  if (!paymentCfg || typeof paymentCfg !== 'object') {
    return {
      currency: 'SGD',
      baseAmount: 365.14,
      verifiedBaseAmount: 300,
      gstRatePercent: 9,
      voucherDiscountAmount: 100,
      referralCode: '',
      referralLinkPath: '/auth/sign-up?membershipOutcome=paid-signup&ref=',
      websiteBaseUrl: '',
      exampleReferralLink: '',
      fullReferralLink: '',
    };
  }

  return {
    currency: paymentCfg.currency || 'SGD',
    baseAmount: paymentCfg.baseAmount ?? 365.14,
    verifiedBaseAmount: paymentCfg.verifiedBaseAmount ?? 300,
    gstRatePercent: paymentCfg.gstRatePercent ?? 9,
    voucherDiscountAmount: paymentCfg.voucherDiscountAmount ?? 100,
    referralCode: paymentCfg.referralCode || '',
    referralLinkPath:
      paymentCfg.referralLinkPath || '/auth/sign-up?membershipOutcome=paid-signup&ref=',
    websiteBaseUrl: paymentCfg.websiteBaseUrl || '',
    exampleReferralLink: paymentCfg.exampleReferralLink || '',
    fullReferralLink: paymentCfg.fullReferralLink || '',
  };
}

export function AdminPaymentView() {
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const paymentCfg = await appSettingsService.getMembershipPaymentSettings();
      setPaymentSettings(normalizePaymentSettings(paymentCfg));
    } catch (error) {
      toast.error(error?.message || 'Failed to load payment settings');
      setPaymentSettings(normalizePaymentSettings(null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (override = {}) => {
    const source = { ...(paymentSettings || {}), ...(override || {}) };
    try {
      setSubmitting(true);
      const payload = {
        currency: source.currency || 'SGD',
        baseAmount: source.baseAmount,
        verifiedBaseAmount: source.verifiedBaseAmount,
        gstRatePercent: source.gstRatePercent,
        voucherDiscountAmount: source.voucherDiscountAmount,
        referralLinkPath: '/auth/sign-up?membershipOutcome=paid-signup&ref=',
      };
      if (!Number(payload.voucherDiscountAmount) || Number(payload.voucherDiscountAmount) <= 0) {
        toast.error('Promo payable amount is required and must be greater than 0');
        return;
      }
      const updated = await appSettingsService.updateMembershipPaymentSettings(payload);
      setPaymentSettings(normalizePaymentSettings(updated));
      toast.success('Payment settings updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update payment settings');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Promo & Pricing"
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'Payment', href: paths.admin.payment.root },
          { name: 'Promo & Pricing' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading || !paymentSettings ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : (
        <Stack spacing={3}>
          <MembershipPaymentSettingsCard
            paymentSettings={paymentSettings}
            setPaymentSettings={setPaymentSettings}
            submitting={submitting}
            onSave={handleSave}
          />
          <VoucherCodesSettingsCard websiteBaseUrl={paymentSettings.websiteBaseUrl || ''} site="payment" />
        </Stack>
      )}
    </DashboardContent>
  );
}
