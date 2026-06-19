import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { FeeWaiverHrVerifyView } from 'src/sections/auth/simple/fee-waiver-hr-verify-view';

const metadata = { title: `Job function verification | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <FeeWaiverHrVerifyView />
    </>
  );
}
