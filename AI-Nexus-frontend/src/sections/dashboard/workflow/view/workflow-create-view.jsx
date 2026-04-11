import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { WorkflowNewEditForm } from '../workflow-new-edit-form';

// ----------------------------------------------------------------------

export function WorkflowCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create AI resource"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <WorkflowNewEditForm showFlowBuilder />
    </DashboardContent>
  );
}

