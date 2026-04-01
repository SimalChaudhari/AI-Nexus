import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LabelNewEditForm } from '../label-new-edit-form';

// ----------------------------------------------------------------------

export function LabelEditView({ label: currentLabel }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit label"
        activeLast
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Label', href: paths.admin.label.list },
          { name: currentLabel?.name || currentLabel?.title },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <LabelNewEditForm currentLabel={currentLabel} />
    </DashboardContent>
  );
}

