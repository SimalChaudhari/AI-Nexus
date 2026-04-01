import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { AiForumNewEditForm } from '../ai-forum-new-edit-form';

// ----------------------------------------------------------------------

export function AiForumEditView({ post: currentAiForumPost }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Forum', href: paths.admin.aiForum.list },
          { name: currentAiForumPost?.title },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <AiForumNewEditForm currentAiForumPost={currentAiForumPost} />
    </DashboardContent>
  );
}


