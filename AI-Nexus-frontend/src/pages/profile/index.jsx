import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { CommonProfileView } from 'src/sections/dashboard/profile';

// ----------------------------------------------------------------------

const metadata = { title: `My Profile | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CommonProfileView />
    </>
  );
}

