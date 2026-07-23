import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AdminCompanyEnrollmentView } from 'src/sections/dashboard/admin-payment/view/admin-company-enrollment-view';

const metadata = { title: `Company QR enrollment | Admin - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <AdminCompanyEnrollmentView />
    </>
  );
}
