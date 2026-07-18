import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';
import { useGetUser } from 'src/actions/user';

import { CorporateMemberDetailsView } from 'src/sections/dashboard/corporate-member/view/corporate-member-details-view';

// ----------------------------------------------------------------------

const metadata = { title: `Corporate member details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();
  const { user, userLoading, userError } = useGetUser(id);

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <CorporateMemberDetailsView user={user} loading={userLoading} error={userError} />
    </>
  );
}
