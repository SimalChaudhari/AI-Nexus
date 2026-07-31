import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { IntlPathwayModuleFormView } from 'src/sections/dashboard/international/view';

const metadata = { title: `Add pathway module | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <IntlPathwayModuleFormView />
    </>
  );
}
