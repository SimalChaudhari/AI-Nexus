import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { NewsletterNewEditForm } from '../newsletter-new-edit-form';

// ----------------------------------------------------------------------

export function NewsletterEditView({ newsletter: currentNewsletter }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit newsletter"
        activeLast
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Newsletters', href: paths.admin.newsletter.list },
          { name: currentNewsletter?.title },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <NewsletterNewEditForm currentNewsletter={currentNewsletter} />
    </DashboardContent>
  );
}
