import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { WorkflowNewEditForm } from '../workflow-new-edit-form';

// ----------------------------------------------------------------------

export function WorkflowEditView({ workflow: currentWorkflow }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit AI resource"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: currentWorkflow?.title },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <WorkflowNewEditForm currentWorkflow={currentWorkflow} />
    </DashboardContent>
  );
}

