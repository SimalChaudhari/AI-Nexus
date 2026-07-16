import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LanguageNewEditForm } from '../language-new-edit-form';

// ----------------------------------------------------------------------

export function LanguageEditView({ language: currentLanguage }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Language', href: paths.admin.language.list },
          { name: currentLanguage?.title ?? 'Language' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <LanguageNewEditForm currentLanguage={currentLanguage} />
    </DashboardContent>
  );
}
