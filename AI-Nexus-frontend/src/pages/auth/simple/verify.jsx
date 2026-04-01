import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { SimpleVerifyView } from 'src/sections/auth/simple';

// ----------------------------------------------------------------------

const metadata = { title: `Verify email | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <SimpleVerifyView />
    </>
  );
}

