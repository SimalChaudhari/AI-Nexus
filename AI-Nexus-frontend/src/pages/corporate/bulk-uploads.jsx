import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateBulkUploadsView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Bulk enrolment files | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateBulkUploadsView />
    </>
  );
}
