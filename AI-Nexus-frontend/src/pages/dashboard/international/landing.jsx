import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { IntlLandingContentView } from 'src/sections/dashboard/international/view';

const metadata = { title: `International landing | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <IntlLandingContentView />
    </>
  );
}
