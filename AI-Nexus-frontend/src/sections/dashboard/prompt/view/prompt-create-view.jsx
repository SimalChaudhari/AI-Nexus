import { useSearchParams } from 'react-router-dom';

import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { PromptNewEditForm } from '../prompt-new-edit-form';

export function PromptCreateView() {
  const [searchParams] = useSearchParams();
  const categoryLabel = searchParams.get('label')?.trim() || '';
  const categoryKey = searchParams.get('categoryKey')?.trim() || '';

  const defaultSectionTitle =
    categoryLabel ||
    (categoryKey === '__uncategorized__' ? 'Uncategorized' : categoryKey) ||
    '';

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Add prompt"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Prompts', href: paths.admin.prompt.list },
          ...(defaultSectionTitle
            ? [
                { name: 'Categories', href: paths.admin.prompt.list },
                {
                  name: defaultSectionTitle,
                  href: categoryKey
                    ? `${paths.admin.prompt.items}?categoryKey=${encodeURIComponent(categoryKey)}&label=${encodeURIComponent(defaultSectionTitle)}`
                    : paths.admin.prompt.list,
                },
              ]
            : []),
          { name: 'Add prompt' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <PromptNewEditForm isCreate defaultSectionTitle={defaultSectionTitle} />
    </DashboardContent>
  );
}
