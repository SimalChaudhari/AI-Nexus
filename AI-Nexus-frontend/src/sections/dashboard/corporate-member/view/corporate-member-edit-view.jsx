import { useCallback } from 'react';

import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { UserNewEditForm } from 'src/sections/dashboard/user/user-new-edit-form';

// ----------------------------------------------------------------------

export function CorporateMemberEditView({ user: currentUser }) {
  const router = useRouter();
  const fullName =
    currentUser?.name ||
    `${currentUser?.firstname || ''} ${currentUser?.lastname || ''}`.trim() ||
    'Corporate member';
  const detailsHref = currentUser?.id
    ? paths.admin.corporateMember.details(currentUser.id)
    : paths.admin.corporateMember.list;

  const handleBack = useCallback(() => {
    router.push(detailsHref);
  }, [detailsHref, router]);

  if (!currentUser) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Corporate member not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.corporateMember.list}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Corporate Members', href: paths.admin.corporateMember.list },
          { name: fullName, href: detailsHref },
          { name: 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <UserNewEditForm currentUser={currentUser} onCancel={handleBack} onSuccess={handleBack} />
    </DashboardContent>
  );
}
