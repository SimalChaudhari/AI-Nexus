import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { IntlUsersListView } from 'src/sections/dashboard/international/view';

const metadata = { title: `International users | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <IntlUsersListView />
    </>
  );
}
