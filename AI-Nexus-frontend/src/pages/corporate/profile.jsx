import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CorporateProfileView } from 'src/sections/corporate';

// ----------------------------------------------------------------------

const metadata = { title: `Corporate Profile | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateProfileView />
    </>
  );
}
