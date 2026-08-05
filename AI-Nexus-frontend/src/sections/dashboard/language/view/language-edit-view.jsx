import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LanguageNewEditForm } from '../language-new-edit-form';
import { resolveLanguageAdminPaths } from '../language-admin-paths';

// ----------------------------------------------------------------------

export function LanguageEditView({ language: currentLanguage }) {
  const languagePaths = resolveLanguageAdminPaths(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: languagePaths.sectionName, href: languagePaths.list },
          { name: currentLanguage?.title ?? 'Language' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <LanguageNewEditForm currentLanguage={currentLanguage} />
    </DashboardContent>
  );
}
