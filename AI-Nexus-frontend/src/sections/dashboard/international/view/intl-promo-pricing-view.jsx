import { useCallback, useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { intlPaymentAdminService } from 'src/services/intl-payment-admin.service';

import { VoucherCodesSettingsCard } from 'src/sections/dashboard/admin-settings/view/components/voucher-codes-settings-card';
import { IntlMembershipPaymentSettingsCard } from '../intl-membership-payment-settings-card';

const INTL_REFERRAL_PATH = '/auth/sign-up?ref=';

function normalizeSettings(cfg) {
  if (!cfg || typeof cfg !== 'object') {
    return {
      baseAmountSgd: 365,
      studentAmountSgd: 150,
      voucherDiscountAmountSgd: 100,
      referralCode: '',
      referralLinkPath: INTL_REFERRAL_PATH,
      websiteBaseUrl: '',
      exampleReferralLink: '',
      fullReferralLink: '',
    };
  }

  return {
    baseAmountSgd: cfg.baseAmountSgd ?? 365,
    studentAmountSgd: cfg.studentAmountSgd ?? 150,
    voucherDiscountAmountSgd: cfg.voucherDiscountAmountSgd ?? 100,
    referralCode: cfg.referralCode || '',
    referralLinkPath: cfg.referralLinkPath || INTL_REFERRAL_PATH,
    websiteBaseUrl: cfg.websiteBaseUrl || '',
    exampleReferralLink: cfg.exampleReferralLink || '',
    fullReferralLink: cfg.fullReferralLink || '',
  };
}

export function IntlPromoPricingView() {
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await intlPaymentAdminService.getMembershipSettings();
      setPaymentSettings(normalizeSettings(cfg));
    } catch (error) {
      toast.error(error?.message || 'Failed to load international payment settings');
      setPaymentSettings(normalizeSettings(null));
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
        baseAmountSgd: Number(source.baseAmountSgd),
        studentAmountSgd: Number(source.studentAmountSgd),
        voucherDiscountAmountSgd: Number(source.voucherDiscountAmountSgd),
        referralLinkPath: INTL_REFERRAL_PATH,
      };
      if (!Number(payload.studentAmountSgd) || Number(payload.studentAmountSgd) <= 0) {
        toast.error('Student amount is required and must be greater than 0');
        return;
      }
      if (!Number(payload.voucherDiscountAmountSgd) || Number(payload.voucherDiscountAmountSgd) <= 0) {
        toast.error('Promo payable amount is required and must be greater than 0');
        return;
      }
      const updated = await intlPaymentAdminService.updateMembershipSettings(payload);
      setPaymentSettings(normalizeSettings(updated));
      toast.success('International payment settings updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update international payment settings');
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
          { name: 'International', href: paths.admin.international.root },
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
          <IntlMembershipPaymentSettingsCard
            paymentSettings={paymentSettings}
            setPaymentSettings={setPaymentSettings}
            submitting={submitting}
            onSave={handleSave}
          />
          <VoucherCodesSettingsCard
            websiteBaseUrl={paymentSettings.websiteBaseUrl || ''}
            referralLinkPath={INTL_REFERRAL_PATH}
            site="international"
          />
        </Stack>
      )}
    </DashboardContent>
  );
}
