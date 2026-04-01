import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { SimpleSignInView } from 'src/sections/auth/simple';

// ----------------------------------------------------------------------

const metadata = { title: `Sign in | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <SimpleSignInView />
    </>
  );
}

