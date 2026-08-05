import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LanguageNewEditForm } from '../language-new-edit-form';
import { resolveLanguageAdminPaths } from '../language-admin-paths';

// ----------------------------------------------------------------------

export function LanguageCreateView() {
  const languagePaths = resolveLanguageAdminPaths(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new language"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: languagePaths.sectionName, href: languagePaths.root },
          { name: 'New language' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <LanguageNewEditForm />
    </DashboardContent>
  );
}
