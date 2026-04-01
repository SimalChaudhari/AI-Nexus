import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { AnnouncementsView } from 'src/sections/announcements/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Announcements | ${CONFIG.site.name}`,
  description: 'Stay updated with the latest news, features, and community updates',
};

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </Helmet>

      <AnnouncementsView />
    </>
  );
}

