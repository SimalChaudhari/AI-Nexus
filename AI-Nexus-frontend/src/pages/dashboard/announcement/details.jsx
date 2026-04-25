import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { CONFIG } from 'src/config-global';

import { AnnouncementDetailsView } from 'src/sections/dashboard/announcement/view';
import { LoadingScreen } from 'src/components/loading-screen';
import { announcementService } from 'src/services/announcement.service';

// ----------------------------------------------------------------------

const metadata = { title: `Announcement details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const { announcements } = useSelector((state) => state.announcements);
  const [loading, setLoading] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fromStore = announcements.find((item) => item.id === params.id);
    if (fromStore) {
      setCurrentAnnouncement(fromStore);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    announcementService
      .getAnnouncementById(params.id)
      .then((announcement) => {
        if (!cancelled) setCurrentAnnouncement(announcement || null);
      })
      .catch(() => {
        if (!cancelled) setCurrentAnnouncement(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [announcements, params.id]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AnnouncementDetailsView announcement={currentAnnouncement} />
    </>
  );
}
