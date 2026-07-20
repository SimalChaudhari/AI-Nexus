import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AdminPaymentView } from 'src/sections/dashboard/admin-payment';

const metadata = { title: `Promo & Pricing | Admin - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <AdminPaymentView />
    </>
  );
}
