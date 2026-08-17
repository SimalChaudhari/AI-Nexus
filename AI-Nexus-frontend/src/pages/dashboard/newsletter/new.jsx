import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { NewsletterCreateView } from 'src/sections/dashboard/newsletter/view';

// ----------------------------------------------------------------------

const metadata = { title: `Create a newsletter | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <NewsletterCreateView />
    </>
  );
}
