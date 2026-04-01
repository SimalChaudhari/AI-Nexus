import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { TagNewEditForm } from '../tag-new-edit-form';

// ----------------------------------------------------------------------

export function TagEditView({ tag: currentTag }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit tag"
        activeLast
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Tag', href: paths.admin.tag.list },
          { name: currentTag?.title },
        ]}
        slotProps={{
          heading: { color: 'primary.main' },
        }}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <TagNewEditForm currentTag={currentTag} />
    </DashboardContent>
  );
}

