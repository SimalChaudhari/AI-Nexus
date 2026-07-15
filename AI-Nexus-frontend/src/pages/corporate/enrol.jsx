import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateEnrolView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Enrol Staff | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateEnrolView />
    </>
  );
}
