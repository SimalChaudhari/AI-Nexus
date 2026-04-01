import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { SimpleResetPasswordView } from 'src/sections/auth/simple';

// ----------------------------------------------------------------------

const metadata = { title: `Reset password | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <SimpleResetPasswordView />
    </>
  );
}

