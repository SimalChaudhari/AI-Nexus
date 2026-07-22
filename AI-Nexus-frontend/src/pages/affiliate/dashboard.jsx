import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AffiliateDashboardView } from 'src/sections/affiliate/affiliate-dashboard-view';

// ----------------------------------------------------------------------

const metadata = { title: `Affiliate dashboard | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AffiliateDashboardView />
    </>
  );
}
