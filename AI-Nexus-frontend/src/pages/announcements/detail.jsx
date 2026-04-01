import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { AnnouncementDetailView } from 'src/sections/announcements/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Announcement Details | ${CONFIG.site.name}`,
  description: 'View announcement details',
};

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </Helmet>

      <AnnouncementDetailView />
    </>
  );
}

