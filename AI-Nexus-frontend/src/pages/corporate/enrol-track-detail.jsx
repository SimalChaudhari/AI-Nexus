import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateEnrolTrackDetailView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Enrolment batch detail | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateEnrolTrackDetailView />
    </>
  );
}
