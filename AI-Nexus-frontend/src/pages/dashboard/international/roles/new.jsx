import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { IntlPathwayRoleFormView } from 'src/sections/dashboard/international/view';

const metadata = { title: `Add pathway role | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <IntlPathwayRoleFormView />
    </>
  );
}
