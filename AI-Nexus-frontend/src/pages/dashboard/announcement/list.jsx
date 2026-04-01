import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AnnouncementListView } from 'src/sections/dashboard/announcement/view';

// ----------------------------------------------------------------------

const metadata = { title: `Announcement list | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AnnouncementListView />
    </>
  );
}
