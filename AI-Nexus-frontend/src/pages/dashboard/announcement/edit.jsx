import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSelector } from 'react-redux';

import { CONFIG } from 'src/config-global';

import { AnnouncementEditView } from 'src/sections/dashboard/announcement/view';
import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

const metadata = { title: `Announcement edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const { announcements, loading } = useSelector((state) => state.announcements);
  const currentAnnouncement = announcements.find((item) => item.id === params.id);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AnnouncementEditView announcement={currentAnnouncement} />
    </>
  );
}
