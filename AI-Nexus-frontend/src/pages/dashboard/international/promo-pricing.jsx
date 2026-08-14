import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { IntlPromoPricingView } from 'src/sections/dashboard/international/view';

const metadata = { title: `International Pricing Management | Admin - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <IntlPromoPricingView />
    </>
  );
}
