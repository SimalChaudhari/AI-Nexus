import { useEffect, useState } from 'react';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';

import { paths } from 'src/routes/paths';

import { speakerService } from 'src/services/speaker.service';
import { SpeakerNewEditForm } from '../speaker-new-edit-form';

// ----------------------------------------------------------------------

export function SpeakerEditView({ id }) {
  const [speaker, setSpeaker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const data = await speakerService.getById(id);
        if (mounted) setSpeaker(data);
      } catch (err) {
        if (mounted) setSpeaker(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit speaker"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Speaker', href: paths.admin.speaker.list },
          { name: speaker?.name || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <SpeakerNewEditForm currentSpeaker={speaker} />
    </DashboardContent>
  );
}
