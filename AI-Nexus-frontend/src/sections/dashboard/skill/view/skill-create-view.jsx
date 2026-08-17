import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { SkillNewEditForm } from '../skill-new-edit-form';

// ----------------------------------------------------------------------

export function SkillCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new skill"
        activeLast
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Skills', href: paths.admin.skill.list },
          { name: 'New skill' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <SkillNewEditForm />
    </DashboardContent>
  );
}
