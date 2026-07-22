import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AffiliateSignUpView } from 'src/sections/auth/affiliate/affiliate-sign-up-view';

// ----------------------------------------------------------------------

const metadata = { title: `Sign up | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AffiliateSignUpView />
    </>
  );
}
