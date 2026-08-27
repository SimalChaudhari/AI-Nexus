import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { CorporateCompanyMetricsView } from 'src/sections/dashboard/corporate-member/view/corporate-company-metrics-view';

const metadata = { title: `Company Enrolment | Corporate Members - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateCompanyMetricsView />
    </>
  );
}
