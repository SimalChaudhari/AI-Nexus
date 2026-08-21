import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { UserBulkEnrolmentView } from 'src/sections/dashboard/user/view';

// ----------------------------------------------------------------------

const metadata = { title: `Bulk enrolment | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <UserBulkEnrolmentView />
    </>
  );
}
