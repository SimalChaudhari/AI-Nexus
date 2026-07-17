import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { CorporateMemberListView } from 'src/sections/dashboard/corporate-member/view/corporate-member-list-view';

const metadata = { title: `Corporate members | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateMemberListView />
    </>
  );
}
