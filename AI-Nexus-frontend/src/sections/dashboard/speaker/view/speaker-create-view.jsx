import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { paths } from 'src/routes/paths';
import { SpeakerNewEditForm } from '../speaker-new-edit-form';

export function SpeakerCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create speaker"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Speaker', href: paths.admin.speaker.list },
          { name: 'Create' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <SpeakerNewEditForm />
    </DashboardContent>
  );
}
