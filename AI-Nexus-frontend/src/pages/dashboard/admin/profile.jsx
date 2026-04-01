import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AdminProfileView } from 'src/sections/dashboard/admin/view';

// ----------------------------------------------------------------------

const metadata = { title: `Admin Profile | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <AdminProfileView />
    </>
  );
}

