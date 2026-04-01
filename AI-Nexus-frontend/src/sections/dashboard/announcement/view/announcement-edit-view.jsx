import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { AnnouncementNewEditForm } from '../announcement-new-edit-form';

// ----------------------------------------------------------------------

export function AnnouncementEditView({ announcement: currentAnnouncement }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Announcement', href: paths.admin.announcement.list },
          { name: currentAnnouncement?.title },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <AnnouncementNewEditForm currentAnnouncement={currentAnnouncement} />
    </DashboardContent>
  );
}
