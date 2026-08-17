import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { NewsletterListView } from 'src/sections/dashboard/newsletter/view';

// ----------------------------------------------------------------------

const metadata = { title: `Newsletter list | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <NewsletterListView />
    </>
  );
}
