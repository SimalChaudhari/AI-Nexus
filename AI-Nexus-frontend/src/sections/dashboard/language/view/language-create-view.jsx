import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LanguageNewEditForm } from '../language-new-edit-form';

// ----------------------------------------------------------------------

export function LanguageCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new language"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Language', href: paths.admin.language.root },
          { name: 'New language' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <LanguageNewEditForm />
    </DashboardContent>
  );
}
