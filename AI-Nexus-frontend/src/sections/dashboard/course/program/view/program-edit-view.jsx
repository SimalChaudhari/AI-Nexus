import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { ProgramNewEditForm } from '../program-new-edit-form';

export function ProgramEditView({ program }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit program"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Program', href: paths.admin.program.list },
          { name: program?.title },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <ProgramNewEditForm currentProgram={program} />
    </DashboardContent>
  );
}
