import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AnnouncementCreateView } from 'src/sections/dashboard/announcement/view';

// ----------------------------------------------------------------------

const metadata = { title: `Announcement create | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AnnouncementCreateView />
    </>
  );
}
