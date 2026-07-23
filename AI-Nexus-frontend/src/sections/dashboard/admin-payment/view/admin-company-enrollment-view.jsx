import { useCallback, useEffect, useState } from 'react';

import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { appSettingsService } from 'src/services/app-settings.service';

import { CompanyEnrollmentSettingsCard } from 'src/sections/dashboard/admin-settings/view/components/company-enrollment-settings-card';

export function AdminCompanyEnrollmentView() {
  const [websiteBaseUrl, setWebsiteBaseUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const paymentCfg = await appSettingsService.getMembershipPaymentSettings();
      setWebsiteBaseUrl(String(paymentCfg?.websiteBaseUrl || '').trim());
    } catch (error) {
      toast.error(error?.message || 'Failed to load site settings');
      setWebsiteBaseUrl('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Company QR enrollment"
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'Payment', href: paths.admin.payment.root },
          { name: 'Company QR enrollment' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : (
        <CompanyEnrollmentSettingsCard websiteBaseUrl={websiteBaseUrl} />
      )}
    </DashboardContent>
  );
}
