import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { AiForumNewEditForm } from '../ai-forum-new-edit-form';

// ----------------------------------------------------------------------

export function AiForumCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create post"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Forum', href: paths.admin.aiForum.list },
          { name: 'New post' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <AiForumNewEditForm />
    </DashboardContent>
  );
}

