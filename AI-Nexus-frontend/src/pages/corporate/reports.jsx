import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateReportsView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Reports & Certificates | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateReportsView />
    </>
  );
}
