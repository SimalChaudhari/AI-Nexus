import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { TagNewEditForm } from '../tag-new-edit-form';

// ----------------------------------------------------------------------

export function TagCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new tag"
        activeLast
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Tag', href: paths.admin.tag.list },
          { name: 'New tag' },
        ]}
        slotProps={{
          heading: {
            color: 'text.primary',
          },
        }}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <TagNewEditForm />
    </DashboardContent>
  );
}

