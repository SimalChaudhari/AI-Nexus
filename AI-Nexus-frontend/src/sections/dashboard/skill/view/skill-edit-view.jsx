import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { SkillNewEditForm } from '../skill-new-edit-form';

// ----------------------------------------------------------------------

export function SkillEditView({ skill: currentSkill }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit skill"
        activeLast
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Skills', href: paths.admin.skill.list },
          { name: currentSkill?.title || currentSkill?.name },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <SkillNewEditForm currentSkill={currentSkill} />
    </DashboardContent>
  );
}
