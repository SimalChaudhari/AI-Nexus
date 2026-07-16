import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { PromptNewEditForm } from '../prompt-new-edit-form';

const htmlToPlain = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export function PromptEditView({ prompt: currentPrompt }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Prompt', href: paths.admin.prompt.root },
          { name: htmlToPlain(currentPrompt?.sectionTitle) || 'Prompt' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <PromptNewEditForm currentPrompt={currentPrompt} />
    </DashboardContent>
  );
}
