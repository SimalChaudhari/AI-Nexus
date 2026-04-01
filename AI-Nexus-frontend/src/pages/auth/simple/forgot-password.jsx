import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { SimpleForgotPasswordView } from 'src/sections/auth/simple';

// ----------------------------------------------------------------------

const metadata = { title: `Forgot password | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <SimpleForgotPasswordView />
    </>
  );
}

