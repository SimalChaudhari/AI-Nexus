import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { NewsletterNewEditForm } from '../newsletter-new-edit-form';

// ----------------------------------------------------------------------

export function NewsletterCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a newsletter"
        activeLast
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Newsletters', href: paths.admin.newsletter.list },
          { name: 'New newsletter' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <NewsletterNewEditForm />
    </DashboardContent>
  );
}
