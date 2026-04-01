import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { CONFIG } from 'src/config-global';

import { AnnouncementDetailsView } from 'src/sections/dashboard/announcement/view';
import { LoadingScreen } from 'src/components/loading-screen';
import { fetchAnnouncements } from 'src/store/slices/announcementSlice';

// ----------------------------------------------------------------------

const metadata = { title: `Announcement details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const dispatch = useDispatch();
  const { announcements, loading } = useSelector((state) => state.announcements);
  const currentAnnouncement = announcements.find((item) => item.id === params.id);

  useEffect(() => {
    if (!announcements.length) {
      dispatch(fetchAnnouncements());
    }
  }, [dispatch, announcements.length]);

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
