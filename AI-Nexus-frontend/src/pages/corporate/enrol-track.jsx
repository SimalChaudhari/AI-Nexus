import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateEnrolTrackView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Staff enrolment track | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateEnrolTrackView />
    </>
  );
}
