import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateOverviewView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Corporate Overview | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateOverviewView />
    </>
  );
}
