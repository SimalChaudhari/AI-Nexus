import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateProgressView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Learner Progress | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateProgressView />
    </>
  );
}
