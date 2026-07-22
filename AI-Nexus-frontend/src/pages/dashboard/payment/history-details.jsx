import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { useParams } from 'src/routes/hooks';

import { AdminPaymentHistoryDetailsView } from 'src/sections/dashboard/admin-payment/view/admin-payment-history-details-view';

const metadata = { title: `Payment details | Admin - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <AdminPaymentHistoryDetailsView id={id} />
    </>
  );
}
