import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { ProgramNewEditForm } from '../program-new-edit-form';

export function ProgramCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create program"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Program', href: paths.admin.program.list },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <ProgramNewEditForm />
    </DashboardContent>
  );
}
