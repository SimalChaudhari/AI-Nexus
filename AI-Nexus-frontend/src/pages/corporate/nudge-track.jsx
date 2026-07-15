import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateNudgeTrackView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Nudge email track | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateNudgeTrackView />
    </>
  );
}
