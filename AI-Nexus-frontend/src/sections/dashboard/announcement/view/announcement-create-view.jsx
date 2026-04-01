import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { AnnouncementNewEditForm } from '../announcement-new-edit-form';

// ----------------------------------------------------------------------

export function AnnouncementCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new announcement"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Announcement', href: paths.admin.announcement.root },
          { name: 'New announcement' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <AnnouncementNewEditForm />
    </DashboardContent>
  );
}
