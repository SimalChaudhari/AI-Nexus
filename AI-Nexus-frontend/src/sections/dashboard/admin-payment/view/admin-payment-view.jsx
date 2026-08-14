import { useCallback } from 'react';

import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { appSettingsService } from 'src/services/app-settings.service';
import { CountryPricingManagementPanel } from 'src/sections/dashboard/international/view';

const AINEXUS_REFERRAL_PATH = '/auth/sign-up?membershipOutcome=paid-signup&ref=';

export function AdminPaymentView() {
  const fetchSettings = useCallback(
    () => appSettingsService.getMembershipPaymentSettings(),
    [],
  );

  const saveSettings = useCallback(async (countryPricing, settings) => {
    const payload = {
      currency: settings?.currency || 'SGD',
      baseAmount: settings?.baseAmount,
      verifiedBaseAmount: settings?.verifiedBaseAmount,
      gstRatePercent: settings?.gstRatePercent,
      voucherDiscountAmount: settings?.voucherDiscountAmount || 100,
      countryPricing,
      referralLinkPath: AINEXUS_REFERRAL_PATH,
    };
    return appSettingsService.updateMembershipPaymentSettings(payload);
  }, []);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Pricing Management"
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'Payment', href: paths.admin.payment.root },
          { name: 'Pricing Management' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <CountryPricingManagementPanel
          voucherSite="payment"
          fetchSettings={fetchSettings}
          saveSettings={saveSettings}
        />
      </Stack>
    </DashboardContent>
  );
}
