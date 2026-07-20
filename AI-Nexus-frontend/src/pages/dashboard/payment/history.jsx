import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AdminPaymentHistoryView } from 'src/sections/dashboard/admin-payment/view/admin-payment-history-view';

const metadata = { title: `Payment history | Admin - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <AdminPaymentHistoryView />
    </>
  );
}
